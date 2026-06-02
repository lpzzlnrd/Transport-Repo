/* ===========================================================================
   APLICACIÓN · Casos de Uso (Use Cases)
   ---------------------------------------------------------------------------
   La CAPA DE APLICACIÓN orquesta el dominio para cumplir una intención del
   usuario. No contiene reglas de negocio (esas viven en el dominio) ni
   detalles de tecnología (esos viven en infraestructura). Solo coordina:
   recibe datos ya validados, llama al dominio y a los puertos, y entrega un
   resultado listo para mostrar.

   Recibe los puertos por INYECCIÓN DE DEPENDENCIAS (vía el constructor), de
   modo que en producción se le pasa el adaptador real de Groq y en pruebas
   se le podría pasar un mock — sin tocar esta clase.
   =========================================================================== */

class CasosDeUso {
    /* @param {PuertoAnalisisIA} analisisIA  adaptador de IA
       @param {PuertoReporte}    reporte     adaptador de exportación */
    constructor(analisisIA, reporte) {
        this._analisisIA = analisisIA;
        this._reporte = reporte;
        // Memoria de la sesión: lo último resuelto en cada módulo.
        this._ultimoTransporte = null;
        this._ultimaAsignacion = null;
    }

    /* Caso de uso: resolver un problema de transporte. */
    resolverTransporte(datos) {
        const problema = new ProblemaTransporte(
            datos.origenes, datos.destinos, datos.ofertas, datos.demandas, datos.costos);
        const resolucion = problema.resolver();
        this._ultimoTransporte = { entrada: datos, resolucion };
        return resolucion;
    }

    /* Caso de uso: resolver un problema de asignación con el método húngaro. */
    resolverAsignacion(datos) {
        const problema = new ProblemaAsignacion(
            datos.trabajadores, datos.tareas, datos.costos, datos.unidad);
        const resultado = new MetodoHungaro().resolver(problema);
        this._ultimaAsignacion = { entrada: datos, resultado };
        return resultado;
    }

    /* Caso de uso: pedir el análisis del COO (IA) sobre lo resuelto.
       Arma el contexto y delega en el puerto, sin saber que detrás está Groq. */
    async analizarConIA() {
        const contexto = this.contextoActivo();
        if (!contexto.transporte && !contexto.asignacion) {
            throw new Error("Primero resuelve al menos un módulo (Transporte o Asignación).");
        }
        return this._analisisIA.analizar(contexto);
    }

    /* Caso de uso: exportar el reporte (delegado al puerto). */
    exportarReporte() {
        this._reporte.exportar();
    }

    /* Construye un contexto compacto con lo resuelto en la sesión, para la IA. */
    contextoActivo() {
        const contexto = {};
        if (this._ultimoTransporte) {
            const r = this._ultimoTransporte.resolucion;
            contexto.transporte = {
                entrada: this._ultimoTransporte.entrada,
                balanceado: r.balanceado,
                costos_por_metodo: r.resultados.reduce((acc, res) => {
                    acc[res.metodo] = res.costoTotal;
                    return acc;
                }, {}),
            };
        }
        if (this._ultimaAsignacion) {
            const res = this._ultimaAsignacion.resultado;
            contexto.asignacion = {
                entrada: this._ultimaAsignacion.entrada,
                asignaciones: res.asignaciones,
                costo_total: res.costoTotal,
                unidad: res.unidad,
            };
        }
        return contexto;
    }
}
