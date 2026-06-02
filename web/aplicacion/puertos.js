/* ===========================================================================
   APLICACIÓN · Puertos (Ports)
   ---------------------------------------------------------------------------
   En arquitectura hexagonal, un PUERTO es un contrato (interfaz) que define
   QUÉ necesita la aplicación del mundo exterior, sin decir CÓMO se hace. Los
   ADAPTADORES (en infraestructura) implementan estos contratos.

   JavaScript no tiene interfaces nativas, así que las expresamos como clases
   "abstractas": si alguien usa el puerto sin implementarlo, lanza un error
   claro. Esto documenta el contrato y desacopla el núcleo de la tecnología
   concreta (Groq, impresión del navegador, etc.).
   =========================================================================== */

/* PUERTO DE SALIDA: análisis con IA.
   La aplicación pide "analiza este contexto"; no le importa si por detrás hay
   Groq, OpenAI o un mock de pruebas. */
class PuertoAnalisisIA {
    /* @param {object} contexto  datos y resultados activos
       @returns {Promise<string>}  informe textual */
    async analizar(contexto) {
        throw new Error("PuertoAnalisisIA.analizar() debe implementarlo un adaptador.");
    }
}

/* PUERTO DE SALIDA: exportación de reporte.
   La aplicación pide "exporta el reporte"; el adaptador decide si usa la
   impresión del navegador, un PDF descargable, etc. */
class PuertoReporte {
    exportar() {
        throw new Error("PuertoReporte.exportar() debe implementarlo un adaptador.");
    }
}
