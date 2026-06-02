/* ===========================================================================
   INFRAESTRUCTURA · Vista  (parte del adaptador de ENTRADA / driving)
   ---------------------------------------------------------------------------
   Responsable EXCLUSIVO de manipular el DOM: construir cuadrículas editables,
   leer lo que el usuario digitó y renderizar resultados. No contiene lógica
   de negocio; solo traduce entre el DOM y estructuras de datos planas que el
   controlador entrega a los casos de uso.

   Mantener esto separado del dominio es lo que permite, por ejemplo, cambiar
   toda la presentación sin tocar los algoritmos.
   =========================================================================== */

class Vista {
    /* ---- helpers de creación de elementos ---- */
    static el(tag, clase, texto) {
        const e = document.createElement(tag);
        if (clase) e.className = clase;
        if (texto !== undefined) e.textContent = texto;
        return e;
    }
    static inputTexto(placeholder, valor, clase) {
        const i = document.createElement("input");
        i.type = "text"; i.className = clase; i.placeholder = placeholder; i.value = valor || "";
        return i;
    }
    static inputNumero(valor, clase) {
        const i = document.createElement("input");
        i.type = "number"; i.className = clase; i.value = valor;
        return i;
    }

    /* =====================================================================
       CUADRÍCULA DE TRANSPORTE (m×n) — editable, con ofertas y demandas
       ===================================================================== */
    static pintarMatrizTransporte(contenedor, datos, alCambiar) {
        contenedor.innerHTML = "";
        const m = datos.origenes.length, n = datos.destinos.length;
        const tabla = Vista.el("table", "tabla-editable");

        // Encabezado: destinos + columna "Oferta"
        const cab = Vista.el("tr");
        cab.appendChild(Vista.el("th", null, "Origen / Destino"));
        for (let j = 0; j < n; j++) {
            const th = Vista.el("th");
            th.appendChild(Vista.inputTexto(`Destino ${j + 1}`, datos.destinos[j], "nombre-destino"));
            cab.appendChild(th);
        }
        cab.appendChild(Vista.el("th", "col-oferta", "Oferta"));
        tabla.appendChild(cab);

        // Filas de orígenes con costos + oferta
        for (let i = 0; i < m; i++) {
            const tr = Vista.el("tr");
            const tdN = Vista.el("td");
            tdN.appendChild(Vista.inputTexto(`Origen ${i + 1}`, datos.origenes[i], "nombre-origen"));
            tr.appendChild(tdN);
            for (let j = 0; j < n; j++) {
                const td = Vista.el("td");
                td.appendChild(Vista.inputNumero(datos.costos[i][j], "costo"));
                tr.appendChild(td);
            }
            const tdO = Vista.el("td", "col-oferta");
            tdO.appendChild(Vista.inputNumero(datos.ofertas[i], "oferta"));
            tr.appendChild(tdO);
            tabla.appendChild(tr);
        }

        // Fila de demandas
        const trD = Vista.el("tr", "fila-demanda");
        trD.appendChild(Vista.el("td", null, "Demanda"));
        for (let j = 0; j < n; j++) {
            const td = Vista.el("td");
            td.appendChild(Vista.inputNumero(datos.demandas[j], "demanda"));
            trD.appendChild(td);
        }
        trD.appendChild(Vista.el("td", null, ""));
        tabla.appendChild(trD);

        contenedor.appendChild(tabla);
        // Notifica cada cambio para revalidar balanceo en vivo.
        contenedor.querySelectorAll("input").forEach(inp => inp.addEventListener("input", alCambiar));
    }

    static leerTransporte(contenedor) {
        const sel = c => [...contenedor.querySelectorAll(c)];
        const origenes = sel(".nombre-origen").map(i => i.value.trim() || "Origen");
        const destinos = sel(".nombre-destino").map(i => i.value.trim() || "Destino");
        const ofertas = sel(".oferta").map(i => Number(i.value));
        const demandas = sel(".demanda").map(i => Number(i.value));
        const costosInp = sel(".costo");
        const n = destinos.length, costos = [];
        for (let i = 0; i < origenes.length; i++) {
            const fila = [];
            for (let j = 0; j < n; j++) fila.push(Number(costosInp[i * n + j].value));
            costos.push(fila);
        }
        return { origenes, destinos, ofertas, demandas, costos };
    }

    /* =====================================================================
       CUADRÍCULA DE ASIGNACIÓN (N×N)
       ===================================================================== */
    static pintarMatrizAsignacion(contenedor, datos) {
        contenedor.innerHTML = "";
        const n = datos.trabajadores.length;
        const tabla = Vista.el("table", "tabla-editable");

        const cab = Vista.el("tr");
        cab.appendChild(Vista.el("th", null, "Ingeniero / Actividad"));
        for (let j = 0; j < n; j++) {
            const th = Vista.el("th");
            th.appendChild(Vista.inputTexto(`Actividad ${j + 1}`, datos.tareas[j], "nombre-tarea"));
            cab.appendChild(th);
        }
        tabla.appendChild(cab);

        for (let i = 0; i < n; i++) {
            const tr = Vista.el("tr");
            const tdN = Vista.el("td");
            tdN.appendChild(Vista.inputTexto(`Ingeniero ${i + 1}`, datos.trabajadores[i], "nombre-trabajador"));
            tr.appendChild(tdN);
            for (let j = 0; j < n; j++) {
                const td = Vista.el("td");
                td.appendChild(Vista.inputNumero(datos.costos[i][j], "tiempo"));
                tr.appendChild(td);
            }
            tabla.appendChild(tr);
        }
        contenedor.appendChild(tabla);
    }

    static leerAsignacion(contenedor) {
        const sel = c => [...contenedor.querySelectorAll(c)];
        const trabajadores = sel(".nombre-trabajador").map(i => i.value.trim() || "Ingeniero");
        const tareas = sel(".nombre-tarea").map(i => i.value.trim() || "Actividad");
        const tInp = sel(".tiempo");
        const n = trabajadores.length, costos = [];
        for (let i = 0; i < n; i++) {
            const fila = [];
            for (let j = 0; j < n; j++) fila.push(Number(tInp[i * n + j].value));
            costos.push(fila);
        }
        return { trabajadores, tareas, costos, unidad: "días" };
    }

    /* =====================================================================
       VALIDACIÓN DE BALANCEO EN TIEMPO REAL
       ===================================================================== */
    static pintarBalanceo(caja, ofertas, demandas) {
        const to = ofertas.reduce((a, b) => a + b, 0);
        const td = demandas.reduce((a, b) => a + b, 0);
        caja.innerHTML = "";
        if (to === td) {
            caja.className = "balanceo ok";
            caja.appendChild(Vista._icono("ic-check"));
            caja.appendChild(document.createTextNode(
                ` Balanceado — Oferta total = Demanda total = ${to}.`));
        } else {
            const ficticio = to > td ? "destino ficticio" : "origen ficticio";
            caja.className = "balanceo aviso";
            caja.appendChild(Vista._icono("ic-alert"));
            caja.appendChild(document.createTextNode(
                ` Desbalanceado — Oferta = ${to}, Demanda = ${td}. ` +
                `Se creará un ${ficticio} con costo 0 y capacidad ${Math.abs(to - td)} al resolver.`));
        }
    }

    /* Crea un icono Lucide referenciando el sprite SVG embebido en index.html. */
    static _icono(nombre) {
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("class", "ic");
        const use = document.createElementNS(NS, "use");
        use.setAttribute("href", "#" + nombre);
        svg.appendChild(use);
        return svg;
    }

    /* =====================================================================
       RENDER DE RESULTADOS — TRANSPORTE
       ===================================================================== */
    static pintarResultadosTransporte(cont, resolucion) {
        cont.innerHTML = "";
        cont.appendChild(Vista.el("p", "estado-balanceo",
            resolucion.balanceado ? "Problema balanceado: Sí"
                : "Problema balanceado: No (se añadió fila/columna ficticia)"));

        for (const res of resolucion.resultados) {
            const tarjeta = Vista.el("div", "metodo");
            tarjeta.appendChild(Vista.el("h3", null, "Método de " + res.metodo));

            const ol = Vista.el("ol", "pasos");
            res.pasos.forEach(p => ol.appendChild(Vista.el("li", null, p)));
            tarjeta.appendChild(ol);

            const tabla = Vista.el("table", "tabla-resultado");
            const cab = Vista.el("tr");
            ["Origen", "Destino", "Cantidad", "Costo unit.", "Subtotal"].forEach(t => cab.appendChild(Vista.el("th", null, t)));
            tabla.appendChild(cab);
            res.asignaciones.forEach(([o, d, c, cu]) => {
                const tr = Vista.el("tr");
                [o, d, c, cu, c * cu].forEach(v => tr.appendChild(Vista.el("td", null, String(v))));
                tabla.appendChild(tr);
            });
            tarjeta.appendChild(tabla);
            tarjeta.appendChild(Vista.el("p", "costo-total", `Costo total: ${res.costoTotal}`));
            cont.appendChild(tarjeta);
        }

        // Mejor método (menor costo).
        const mejor = resolucion.resultados.reduce((a, b) => (b.costoTotal < a.costoTotal ? b : a));
        const resumen = Vista.el("div", "mejor-metodo");
        resumen.appendChild(Vista.el("strong", null,
            `Método con menor costo: ${mejor.metodo} (costo ${mejor.costoTotal}).`));
        cont.appendChild(resumen);
    }

    /* =====================================================================
       RENDER DE RESULTADOS — ASIGNACIÓN (HÚNGARO, PASO A PASO)
       ===================================================================== */
    static pintarResultadosAsignacion(cont, datos, resultado) {
        cont.innerHTML = "";

        cont.appendChild(Vista.el("h3", null, "Matriz original (tiempos)"));
        cont.appendChild(Vista._matriz(datos.costos, datos.trabajadores, datos.tareas));

        resultado.pasos.forEach(paso => {
            cont.appendChild(Vista.el("h3", null, paso.titulo));
            cont.appendChild(Vista._matriz(paso.matriz, datos.trabajadores, datos.tareas));
            if (paso.detalle) cont.appendChild(Vista.el("p", "detalle", paso.detalle));
        });

        cont.appendChild(Vista.el("h3", null, "Asignación óptima"));
        const tabla = Vista.el("table", "tabla-resultado");
        const cab = Vista.el("tr");
        ["Ingeniero", "Actividad", `Tiempo (${resultado.unidad})`].forEach(t => cab.appendChild(Vista.el("th", null, t)));
        tabla.appendChild(cab);
        resultado.asignaciones.forEach(([t, a, c]) => {
            const tr = Vista.el("tr");
            [t, a, c].forEach(v => tr.appendChild(Vista.el("td", null, String(v))));
            tabla.appendChild(tr);
        });
        cont.appendChild(tabla);
        cont.appendChild(Vista.el("p", "costo-total",
            `Costo mínimo total: ${resultado.costoTotal} ${resultado.unidad}`));
        cont.appendChild(Vista.el("p", "detalle",
            "Conclusión: la asignación minimiza el costo total; cada ingeniero queda unido a " +
            "una sola actividad mediante ceros independientes tras las reducciones del método húngaro."));
    }

    static _matriz(matriz, filas, cols) {
        const tabla = Vista.el("table", "tabla-resultado");
        const cab = Vista.el("tr");
        cab.appendChild(Vista.el("th", null, ""));
        cols.forEach(c => cab.appendChild(Vista.el("th", null, c)));
        tabla.appendChild(cab);
        matriz.forEach((fila, i) => {
            const tr = Vista.el("tr");
            tr.appendChild(Vista.el("th", null, filas[i]));
            fila.forEach(v => tr.appendChild(Vista.el("td", null, String(v))));
            tabla.appendChild(tr);
        });
        return tabla;
    }
}
