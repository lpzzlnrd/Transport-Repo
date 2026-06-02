# NexusCore Systems — Cómo funciona todo

Documento explicativo del proyecto: qué hace, cómo está construido (arquitectura
hexagonal), cómo corre cada algoritmo y cómo se conecta con la IA.

---

## 1. Qué es

Aplicación web para el **Proyecto IV de Programación Matemática**. Resuelve dos
problemas clásicos de investigación de operaciones y los analiza con IA:

| Parte | Módulo | Métodos |
|---|---|---|
| **I** | Transporte (cadena de suministro) | Esquina Noroeste · Costo Mínimo · Vogel |
| **II** | Asignación (gestión de talento) | Método Húngaro (paso a paso) |
| **III** | Análisis + Reporte | API de Groq (rol COO) + exportación a PDF |

Está hecho con **HTML + CSS + JavaScript vanilla** (sin frameworks ni build) y un
**backend en Python puro** (solo biblioteca estándar) que protege la clave de IA.

---

## 2. Cómo se ejecuta

```bash
# 1. Pon tu clave en el archivo .env de la raíz (ver sección 6)
# 2. Levanta el backend:
python servidor.py
# 3. Abre en el navegador:
http://localhost:8000
```

> Importante: se abre por **http://localhost:8000**, NO con doble clic en el HTML.
> El backend es necesario para que la parte de IA lea la clave del `.env`.

---

## 3. Estructura de carpetas

```
Transport-Repo/
├── servidor.py              ← BACKEND: sirve /web + endpoint de IA (lee .env)
├── .env                     ← tu GROQ_API_KEY (NO se sube a git)
├── .env.example             ← plantilla del .env
├── problema_transporte.py   ← versión Python original (consola), intacta
│
└── web/                     ← FRONTEND (arquitectura hexagonal)
    ├── index.html           ← interfaz + iconos Lucide embebidos
    ├── estilos/estilos.css  ← tema oscuro minimalista + estilos de impresión
    │
    ├── dominio/                         ── CAPA 1: NÚCLEO PURO ──
    │   ├── ProblemaTransporte.js        algoritmos de transporte
    │   └── ProblemaAsignacion.js        método húngaro
    │
    ├── aplicacion/                      ── CAPA 2: ORQUESTACIÓN ──
    │   ├── puertos.js                   contratos (interfaces)
    │   └── casosDeUso.js                coordina dominio + puertos
    │
    └── infraestructura/                 ── CAPA 3: TECNOLOGÍA ──
        ├── adaptadores/
        │   ├── AdaptadorGroq.js         llama al backend /api/analizar
        │   └── AdaptadorReportePDF.js   PDF vía window.print()
        └── ui/
            ├── Vista.js                 manipula el DOM
            ├── Controlador.js           eventos + composition root
            └── datosPorDefecto.js       casos base del enunciado
```

---

## 4. Arquitectura Hexagonal (Ports & Adapters)

La idea central: **el núcleo (los algoritmos) no sabe nada del mundo exterior**
(ni navegador, ni HTTP, ni Groq). Las capas externas dependen de las internas,
nunca al revés.

```
          INFRAESTRUCTURA  (DOM, fetch, backend, PDF)
        ┌───────────────────────────────────────────┐
        │            APLICACIÓN  (casos de uso)       │
        │        ┌───────────────────────────────┐    │
        │        │     DOMINIO  (algoritmos)     │    │
        │        └───────────────────────────────┘    │
        └───────────────────────────────────────────┘
```

### Capa 1 — Dominio (`dominio/`)
Reglas de negocio puras. `ProblemaTransporte` y `ProblemaAsignacion` validan sus
datos, y resuelven. No tocan el DOM ni la red. Se podrían reutilizar tal cual en
otro entorno.

### Capa 2 — Aplicación (`aplicacion/`)
- `puertos.js`: define **contratos** — `PuertoAnalisisIA` (algo que "analiza" un
  contexto) y `PuertoReporte` (algo que "exporta"). No dicen *cómo*, solo *qué*.
- `casosDeUso.js`: orquesta. Recibe los adaptadores por **inyección de
  dependencias** y expone acciones: resolver transporte, resolver asignación,
  analizar con IA, exportar.

### Capa 3 — Infraestructura (`infraestructura/`)
Implementaciones concretas:
- `AdaptadorGroq` implementa `PuertoAnalisisIA` → habla con el backend.
- `AdaptadorReportePDF` implementa `PuertoReporte` → usa `window.print()`.
- `Vista` dibuja y lee el DOM; `Controlador` conecta clics con casos de uso y
  arma todo (composition root).

**Beneficio concreto:** cambiar Groq por otra IA = crear otro adaptador que
cumpla `PuertoAnalisisIA`. El dominio y los casos de uso **no se tocan**.

---

## 5. Cómo funciona cada algoritmo

### 5.1 Transporte

**Equilibrado (en vivo).** Al editar la matriz, se suma oferta y demanda:
- Si son iguales → balanceado.
- Si difieren → se crea un **origen/destino ficticio** con costo 0 que absorbe la
  diferencia (avisado en pantalla antes de resolver).

**Los tres métodos** (todos asignan el máximo posible en una celda y van agotando
oferta/demanda, registrando cada paso):

1. **Esquina Noroeste:** parte de la celda superior izquierda y avanza.
2. **Costo Mínimo:** elige siempre la celda activa de menor costo.
3. **Vogel (VAM):** calcula la *penalización* de cada fila/columna (diferencia
   entre sus dos costos más bajos), elige la mayor penalización y asigna en su
   celda más barata. Suele dar el costo más bajo de los tres.

Al final se compara y se marca el **método con menor costo**.

### 5.2 Método Húngaro (asignación, matriz cuadrada N×N)

1. **Reducción por filas:** a cada fila se le resta su valor mínimo.
2. **Reducción por columnas:** a cada columna se le resta su mínimo.
3. **Asignar ceros:** se busca un emparejamiento de N ceros independientes
   (uno por fila y columna) mediante *matching bipartito* (caminos de aumento).
4. **Si no alcanza:** se cubren los ceros con el mínimo número de líneas
   (teorema de König), se resta el menor valor no cubierto y se suma en las
   intersecciones, creando nuevos ceros. Se repite hasta lograr la asignación.

El resultado usa los **costos originales** y muestra cada matriz intermedia.

> **Verificado:** con el caso base del PDF el costo óptimo es **38**, confirmado
> por fuerza bruta (todas las permutaciones). También se probó un caso que exige
> los ajustes del paso 4 y el de transporte desbalanceado.

---

## 6. Parte III — IA con Groq y la clave

### Flujo de la IA

```
[Navegador]                    [Backend Python]              [Groq]
Botón "Optimizar y Analizar"
  └─ AdaptadorGroq.js
       POST /api/analizar  ───►  servidor.py
       (datos + resultados)        ├─ lee GROQ_API_KEY del .env
                                    ├─ arma el prompt (rol COO)
                                    └─ llama a Groq ──────────►  modelo LLM
                                         ◄──── informe textual ──┘
       ◄──── { informe } ──────────┘
  └─ se muestra en pantalla
```

**La clave nunca llega al navegador.** El frontend solo manda los datos; el
backend es quien conoce la `GROQ_API_KEY` (la lee del `.env` en cada petición).

### Dónde va la clave

Archivo **`.env`** en la raíz del repo (está en `.gitignore`, no se sube):

```
GROQ_API_KEY=gsk_tu_clave_real
GROQ_MODELO=llama-3.1-8b-instant
```

La clave se obtiene en <https://console.groq.com> → *API Keys* → *Create API Key*.

---

## 7. Exportar PDF

El botón **Exportar PDF** llama a `window.print()`. El CSS tiene una sección
`@media print` que:
- Oculta los controles (`.no-print`).
- Cambia a fondo claro y legible.
- Muestra **ambos módulos** y el informe de la IA.

En el diálogo de impresión eliges **"Guardar como PDF"**. Incluye el membrete
corporativo, las tablas que digitaste, los resultados calculados y el informe.

---

## 8. Errores comunes y soluciones

| Síntoma | Causa | Solución |
|---|---|---|
| **Error 1010** al analizar | Cloudflare (protege a Groq) banea el `User-Agent` por defecto de Python. | Ya resuelto: el backend envía un `User-Agent` de navegador. Si persiste, suele ser VPN/IP bloqueada o red restringida; prueba otra red o desactiva la VPN. |
| "No se pudo contactar al backend" | Abriste el HTML con `file://` sin levantar el servidor. | Corre `python servidor.py` y entra por `http://localhost:8000`. |
| "No se encontró GROQ_API_KEY" | Falta el `.env` o la variable. | Crea `.env` en la raíz con `GROQ_API_KEY=...`. |
| Groq responde 401 | Clave inválida o revocada. | Genera una nueva en la consola de Groq. |

---

## 9. Nota sobre el código Python original

`problema_transporte.py` (raíz) es la versión de **consola** del Método Húngaro,
anterior a la web. Se mantiene **intacta** y funciona de forma independiente
(`python problema_transporte.py`). La web reimplementa esa lógica en JavaScript
con arquitectura hexagonal; no comparten código.
