/* ===========================================================================
   INFRAESTRUCTURA · AdaptadorGroq  (adaptador de SALIDA)
   ---------------------------------------------------------------------------
   Implementa el puerto PuertoAnalisisIA. NO contiene ninguna clave: delega en
   el BACKEND (servidor.py) llamando a POST /api/analizar. Es el backend quien
   lee la GROQ_API_KEY del archivo .env (fuera de /web) y consulta a Groq.

   Así la clave nunca llega al navegador. Si se cambia de proveedor o de forma
   de leer la clave, solo cambia el backend; el dominio y la aplicación no se
   tocan (beneficio de la arquitectura hexagonal).
   =========================================================================== */

class AdaptadorGroq extends PuertoAnalisisIA {
    async analizar(contexto) {
        let respuesta;
        try {
            respuesta = await fetch("/api/analizar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contexto),
            });
        } catch (_) {
            // Falla de red: típicamente la página se abrió con file:// sin servidor.
            throw new Error(
                "No se pudo contactar al backend. Inicia el servidor con " +
                "'python servidor.py' y abre http://localhost:8000."
            );
        }

        let datos = {};
        try { datos = await respuesta.json(); } catch (_) { /* sin JSON */ }

        if (!respuesta.ok) {
            throw new Error(datos.error || `El backend respondió HTTP ${respuesta.status}.`);
        }
        if (!datos.informe) {
            throw new Error("El backend no devolvió ningún informe.");
        }
        return datos.informe;
    }
}
