/* ===========================================================================
   INFRAESTRUCTURA · Controlador  (adaptador de ENTRADA / driving + arranque)
   ---------------------------------------------------------------------------
   Es el "adaptador conductor": traduce los eventos del usuario (clics en
   botones, cambios en inputs) en llamadas a los CASOS DE USO, y luego usa la
   Vista para mostrar lo que devuelven.

   También actúa como COMPOSITION ROOT: el único lugar donde se instancian los
   adaptadores concretos (Groq, PDF) y se inyectan en la aplicación. Así, el
   "cableado" de dependencias queda centralizado y el resto del código depende
   solo de abstracciones (puertos).
   =========================================================================== */

class Controlador {
    constructor() {
        // --- COMPOSITION ROOT: se arman e inyectan los adaptadores ---
        // El adaptador de IA habla con el backend; la clave la maneja el
        // servidor (lee el .env), no el navegador.
        const adaptadorIA = new AdaptadorGroq();
        const adaptadorReporte = new AdaptadorReportePDF();
        this._app = new CasosDeUso(adaptadorIA, adaptadorReporte);
    }

    _id(x) { return document.getElementById(x); }
    _clamp(v, min, max) { return Math.max(min, Math.min(max, v || min)); }

    /* Enlaza todos los eventos y carga los casos base. */
    iniciar() {
        this._id("fecha-hoy").textContent = new Date().toLocaleDateString("es-VE");
        this._configurarPestanas();

        // ---- Transporte ----
        this._id("t-generar").addEventListener("click", () => this._regenerarTransporte());
        this._id("t-ejemplo").addEventListener("click", () => {
            this._id("t-origenes").value = CASO_TRANSPORTE.origenes.length;
            this._id("t-destinos").value = CASO_TRANSPORTE.destinos.length;
            this._pintarTransporte(CASO_TRANSPORTE);
        });
        this._id("t-resolver").addEventListener("click", () => this._resolverTransporte());

        // ---- Asignación ----
        this._id("a-generar").addEventListener("click", () => this._regenerarAsignacion());
        this._id("a-ejemplo").addEventListener("click", () => {
            this._id("a-tamano").value = CASO_ASIGNACION.trabajadores.length;
            Vista.pintarMatrizAsignacion(this._id("a-matriz"), CASO_ASIGNACION);
        });
        this._id("a-resolver").addEventListener("click", () => this._resolverAsignacion());

        // ---- Parte III ----
        this._id("btn-analizar").addEventListener("click", () => this._analizar());
        this._id("btn-pdf").addEventListener("click", () => this._app.exportarReporte());

        // Carga inicial de los casos del enunciado.
        this._pintarTransporte(CASO_TRANSPORTE);
        Vista.pintarMatrizAsignacion(this._id("a-matriz"), CASO_ASIGNACION);
    }

    _configurarPestanas() {
        document.querySelectorAll(".tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".tab").forEach(t => t.classList.remove("activo"));
                document.querySelectorAll(".panel").forEach(p => p.classList.remove("activo"));
                tab.classList.add("activo");
                this._id("panel-" + tab.dataset.tab).classList.add("activo");
            });
        });
    }

    /* Pinta la cuadrícula de transporte y conecta la validación en vivo. */
    _pintarTransporte(datos) {
        Vista.pintarMatrizTransporte(this._id("t-matriz"), datos, () => this._validarBalanceo());
        this._validarBalanceo();
    }

    _validarBalanceo() {
        const { ofertas, demandas } = Vista.leerTransporte(this._id("t-matriz"));
        Vista.pintarBalanceo(this._id("t-balanceo"), ofertas, demandas);
    }

    _regenerarTransporte() {
        const m = this._clamp(Number(this._id("t-origenes").value), 1, 10);
        const n = this._clamp(Number(this._id("t-destinos").value), 1, 10);
        this._pintarTransporte({
            origenes: Array.from({ length: m }, (_, i) => `Origen ${i + 1}`),
            destinos: Array.from({ length: n }, (_, j) => `Destino ${j + 1}`),
            ofertas: Array.from({ length: m }, () => 0),
            demandas: Array.from({ length: n }, () => 0),
            costos: Array.from({ length: m }, () => Array.from({ length: n }, () => 0)),
        });
    }

    _regenerarAsignacion() {
        const n = this._clamp(Number(this._id("a-tamano").value), 1, 10);
        Vista.pintarMatrizAsignacion(this._id("a-matriz"), {
            trabajadores: Array.from({ length: n }, (_, i) => `Ingeniero ${i + 1}`),
            tareas: Array.from({ length: n }, (_, j) => `Actividad ${j + 1}`),
            costos: Array.from({ length: n }, () => Array.from({ length: n }, () => 0)),
        });
    }

    /* Lee la cuadrícula, llama al caso de uso y muestra resultados.
       Captura los errores de validación del dominio y los muestra al usuario. */
    _resolverTransporte() {
        try {
            const datos = Vista.leerTransporte(this._id("t-matriz"));
            const resolucion = this._app.resolverTransporte(datos);
            Vista.pintarResultadosTransporte(this._id("t-resultados"), resolucion);
        } catch (e) {
            alert(e.message);
        }
    }

    _resolverAsignacion() {
        try {
            const datos = Vista.leerAsignacion(this._id("a-matriz"));
            const resultado = this._app.resolverAsignacion(datos);
            Vista.pintarResultadosAsignacion(this._id("a-resultados"), datos, resultado);
        } catch (e) {
            alert(e.message);
        }
    }

    async _analizar() {
        const informe = this._id("informe-ia");
        const contenido = this._id("informe-contenido");
        informe.classList.remove("oculto");
        contenido.textContent = "Consultando a la IA (Director de Operaciones)...";
        try {
            contenido.textContent = await this._app.analizarConIA();
        } catch (e) {
            contenido.textContent = "Error: " + e.message;
        }
    }
}

/* Arranque de la aplicación cuando el DOM está listo. */
document.addEventListener("DOMContentLoaded", () => new Controlador().iniciar());
