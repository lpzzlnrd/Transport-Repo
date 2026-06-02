"""
===========================================================================
servidor.py — Backend mínimo de NexusCore Systems
---------------------------------------------------------------------------
Servidor HTTP en Python puro (solo biblioteca estándar, SIN librerías
externas) que cumple dos funciones:

  1) Sirve los archivos estáticos de la carpeta /web (la interfaz).
  2) Expone el endpoint POST /api/analizar, que lee la GROQ_API_KEY desde
     el archivo .env (en esta misma carpeta raíz, FUERA de /web) y llama a
     la API de Groq. Así la clave NUNCA viaja al navegador ni queda en el
     código del cliente.

Encaja en la arquitectura hexagonal: este backend es un ADAPTADOR de
salida hacia Groq; el frontend lo consume a través de su propio adaptador
(AdaptadorGroq.js), sin conocer la clave.

Uso:
    python servidor.py
    -> abre http://localhost:8000 en el navegador.
===========================================================================
"""

import json
import os
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Rutas base: este archivo está en la raíz; los estáticos viven en /web.
RAIZ = os.path.dirname(os.path.abspath(__file__))
DIR_WEB = os.path.join(RAIZ, "web")
RUTA_ENV = os.path.join(RAIZ, ".env")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODELO_POR_DEFECTO = "llama-3.1-8b-instant"


def cargar_env(ruta):

    variables = {}
    if not os.path.exists(ruta):
        return variables
    with open(ruta, "r", encoding="utf-8") as archivo:
        for linea in archivo:
            linea = linea.strip()
            if not linea or linea.startswith("#") or "=" not in linea:
                continue
            clave, valor = linea.split("=", 1)
            variables[clave.strip()] = valor.strip().strip('"').strip("'")
    return variables


def construir_prompt(contexto):
    return (
        "Analiza el IMPACTO OPERACIONAL de la siguiente configuración de datos "
        "y resultados de NexusCore Systems. Identifica cuellos de botella, "
        "riesgos logísticos y el balance de cargas de trabajo. Sé concreto, "
        "estratégico y entrega conclusiones accionables en español.\n\n"
        "=== DATOS Y RESULTADOS ACTIVOS ===\n"
        + json.dumps(contexto, ensure_ascii=False, indent=2)
    )


def consultar_groq(api_key, modelo, contexto):
    cuerpo = json.dumps({
        "model": modelo or MODELO_POR_DEFECTO,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": "Eres un Director de Operaciones (COO) estratégico de NexusCore Systems."},
            {"role": "user", "content": construir_prompt(contexto)},
        ],
    }).encode("utf-8")

    peticion = urllib.request.Request(
        GROQ_URL,
        data=cuerpo,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            # Cloudflare (que protege a Groq) banea el User-Agent por defecto de
            # urllib ("Python-urllib/3.x") con error 1010. Enviamos un UA de
            # navegador normal para que la petición sea aceptada.
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexusCore/1.0",
            "Accept": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(peticion, timeout=60) as respuesta:
        datos = json.loads(respuesta.read().decode("utf-8"))
    return datos["choices"][0]["message"]["content"]


class Manejador(SimpleHTTPRequestHandler):
    """Sirve /web como estáticos y atiende POST /api/analizar."""

    def __init__(self, *args, **kwargs):
        # Sirve los archivos desde la carpeta /web.
        super().__init__(*args, directory=DIR_WEB, **kwargs)

    def do_POST(self):
        if self.path != "/api/analizar":
            self.send_error(404, "Endpoint no encontrado")
            return

        # Lee el contexto enviado por el frontend.
        try:
            largo = int(self.headers.get("Content-Length", 0))
            contexto = json.loads(self.rfile.read(largo).decode("utf-8")) if largo else {}
        except (ValueError, json.JSONDecodeError):
            self._responder_json(400, {"error": "Cuerpo de la petición inválido."})
            return

        # Lee la clave del .env en cada petición (permite cambiarla sin reiniciar).
        env = cargar_env(RUTA_ENV)
        api_key = env.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
        modelo = env.get("GROQ_MODELO") or MODELO_POR_DEFECTO

        if not api_key:
            self._responder_json(500, {
                "error": "No se encontró GROQ_API_KEY. Agrega 'GROQ_API_KEY=gsk_...' al archivo .env en la raíz."
            })
            return

        # Llama a Groq y traduce los posibles errores a mensajes claros.
        try:
            informe = consultar_groq(api_key, modelo, contexto)
            self._responder_json(200, {"informe": informe})
        except urllib.error.HTTPError as e:
            detalle = e.read().decode("utf-8", errors="ignore")
            self._responder_json(502, {"error": f"Groq respondió {e.code}: {detalle}"})
        except Exception as e:  # noqa: BLE001 (queremos reportar cualquier fallo)
            self._responder_json(502, {"error": f"No se pudo contactar a Groq: {e}"})

    def _responder_json(self, codigo, objeto):
        cuerpo = json.dumps(objeto, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def log_message(self, formato, *args):
        # Log compacto en consola.
        print(f"[servidor] {self.address_string()} - {formato % args}")


def main():
    puerto = int(os.environ.get("PORT", "8000"))
    servidor = ThreadingHTTPServer(("127.0.0.1", puerto), Manejador)
    print(f"NexusCore Systems en http://localhost:{puerto}")
    print(f"Sirviendo: {DIR_WEB}")
    print(f"Leyendo clave de: {RUTA_ENV}")
    print("Ctrl+C para detener.")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        servidor.shutdown()


if __name__ == "__main__":
    main()
