/* ===========================================================================
   DOMINIO · ProblemaTransporte
   ---------------------------------------------------------------------------
   CAPA DE DOMINIO (el "hexágono" interno). Contiene SOLO reglas de negocio
   puras: no sabe nada de HTML, DOM, fetch ni de Groq. Esto es lo que hace
   que la arquitectura sea HEXAGONAL — el núcleo es independiente de la
   tecnología que lo rodea y podría reutilizarse en consola, en otro servidor,
   etc., sin cambiar una sola línea.

   Modela el Problema de Transporte y lo resuelve por tres métodos:
   Esquina Noroeste, Costo Mínimo y Aproximación de Vogel.

   Diseño OO (lo exige el PDF): una entidad inmutable de datos +
   "objetos de valor" como resultado de cada método.
   =========================================================================== */

/* Objeto de valor: el resultado de resolver por un método concreto. */
class ResultadoTransporte {
    constructor(metodo, asignaciones, costoTotal, pasos) {
        this.metodo = metodo;             // nombre del método
        this.asignaciones = asignaciones; // [ [origen, destino, cantidad, costoUnit], ... ]
        this.costoTotal = costoTotal;     // costo total numérico
        this.pasos = pasos;               // narración paso a paso (strings)
    }
}

/* Entidad de dominio: encapsula los datos del problema y su resolución. */
class ProblemaTransporte {
    constructor(origenes, destinos, ofertas, demandas, costos) {
        this._origenes = origenes;
        this._destinos = destinos;
        this._ofertas = ofertas;
        this._demandas = demandas;
        this._costos = costos;
        this._validar();
    }

    /* Invariantes del dominio: si los datos no son coherentes, el objeto no
       debe existir. Validar aquí garantiza que ningún adaptador externo pueda
       construir un problema inválido. */
    _validar() {
        const m = this._origenes.length;
        const n = this._destinos.length;
        if (m === 0 || n === 0) throw new Error("Debe haber al menos un origen y un destino.");
        if (this._ofertas.length !== m) throw new Error("Cada origen necesita su oferta.");
        if (this._demandas.length !== n) throw new Error("Cada destino necesita su demanda.");
        if (this._costos.length !== m || this._costos.some(f => f.length !== n)) {
            throw new Error("La matriz de costos debe ser de tamaño orígenes × destinos.");
        }
        const negativo = v => isNaN(v) || v < 0;
        if (this._ofertas.some(negativo) || this._demandas.some(negativo) ||
            this._costos.some(f => f.some(negativo))) {
            throw new Error("Ofertas, demandas y costos deben ser números ≥ 0.");
        }
    }

    estaBalanceado() {
        return ProblemaTransporte._suma(this._ofertas) === ProblemaTransporte._suma(this._demandas);
    }

    /* Devuelve una copia equilibrada del problema. Si hay desbalance, añade un
       origen o destino ficticio con costo 0 que absorbe la diferencia. No muta
       el estado original (los datos del usuario siguen intactos). */
    _equilibrar() {
        const origenes = [...this._origenes];
        const destinos = [...this._destinos];
        const ofertas = [...this._ofertas];
        const demandas = [...this._demandas];
        const costos = this._costos.map(f => [...f]);

        const totalOferta = ProblemaTransporte._suma(ofertas);
        const totalDemanda = ProblemaTransporte._suma(demandas);

        if (totalOferta > totalDemanda) {
            destinos.push("Destino ficticio");
            demandas.push(totalOferta - totalDemanda);
            costos.forEach(f => f.push(0));
        } else if (totalDemanda > totalOferta) {
            origenes.push("Origen ficticio");
            ofertas.push(totalDemanda - totalOferta);
            costos.push(destinos.map(() => 0));
        }
        return { origenes, destinos, ofertas, demandas, costos };
    }

    /* Resuelve por los tres métodos y devuelve un informe completo de dominio. */
    resolver() {
        const eq = this._equilibrar();
        return {
            balanceado: this.estaBalanceado(),
            origenes: eq.origenes,
            destinos: eq.destinos,
            resultados: [
                this._esquinaNoroeste(eq),
                this._costoMinimo(eq),
                this._vogel(eq),
            ],
        };
    }

    /* ----- Método 1: Esquina Noroeste ----- */
    _esquinaNoroeste({ origenes, destinos, ofertas, demandas, costos }) {
        const ofR = [...ofertas], deR = [...demandas];
        const asignaciones = [], pasos = [];
        let costoTotal = 0, i = 0, j = 0;

        while (i < origenes.length && j < destinos.length) {
            const cantidad = Math.min(ofR[i], deR[j]);
            if (cantidad > 0) {
                asignaciones.push([origenes[i], destinos[j], cantidad, costos[i][j]]);
                costoTotal += cantidad * costos[i][j];
                pasos.push(`(${origenes[i]} → ${destinos[j]}) asigna ${cantidad} uds ` +
                    `[min(oferta ${ofR[i]}, demanda ${deR[j]})] a costo ${costos[i][j]}.`);
            }
            ofR[i] -= cantidad; deR[j] -= cantidad;
            if (ofR[i] === 0 && deR[j] === 0) { i++; j++; }
            else if (ofR[i] === 0) i++; else j++;
        }
        return new ResultadoTransporte("Esquina Noroeste", asignaciones, costoTotal, pasos);
    }

    /* ----- Método 2: Costo Mínimo ----- */
    _costoMinimo({ origenes, destinos, ofertas, demandas, costos }) {
        const ofR = [...ofertas], deR = [...demandas];
        const filasAct = origenes.map(() => true), colAct = destinos.map(() => true);
        const asignaciones = [], pasos = [];
        let costoTotal = 0;

        while (true) {
            let mf = -1, mc = -1, menor = null;
            for (let i = 0; i < origenes.length; i++) {
                if (!filasAct[i]) continue;
                for (let j = 0; j < destinos.length; j++) {
                    if (!colAct[j]) continue;
                    if (menor === null || costos[i][j] < menor) { menor = costos[i][j]; mf = i; mc = j; }
                }
            }
            if (menor === null) break;

            const cantidad = Math.min(ofR[mf], deR[mc]);
            asignaciones.push([origenes[mf], destinos[mc], cantidad, costos[mf][mc]]);
            costoTotal += cantidad * costos[mf][mc];
            pasos.push(`Menor costo activo = ${menor} en (${origenes[mf]} → ${destinos[mc]}); asigna ${cantidad} uds.`);

            ofR[mf] -= cantidad; deR[mc] -= cantidad;
            if (ofR[mf] === 0) filasAct[mf] = false;
            if (deR[mc] === 0) colAct[mc] = false;
        }
        return new ResultadoTransporte("Costo Mínimo", asignaciones, costoTotal, pasos);
    }

    /* ----- Método 3: Aproximación de Vogel ----- */
    _vogel({ origenes, destinos, ofertas, demandas, costos }) {
        const ofR = [...ofertas], deR = [...demandas];
        const filasAct = origenes.map(() => true), colAct = destinos.map(() => true);
        const asignaciones = [], pasos = [];
        let costoTotal = 0;

        const penalizacion = activos => {
            activos.sort((a, b) => a - b);
            if (activos.length >= 2) return activos[1] - activos[0];
            if (activos.length === 1) return activos[0];
            return -1;
        };

        while (filasAct.some(Boolean) && colAct.some(Boolean)) {
            // Penalizaciones por fila y por columna (diferencia de los 2 menores).
            const penF = origenes.map((_, i) => filasAct[i]
                ? penalizacion(costos[i].filter((_, j) => colAct[j])) : -1);
            const penC = destinos.map((_, j) => colAct[j]
                ? penalizacion(costos.filter((_, i) => filasAct[i]).map(f => f[j])) : -1);

            // Mayor penalización entre filas y columnas.
            let mayor = -1, tipo = null, idx = -1;
            penF.forEach((p, i) => { if (p > mayor) { mayor = p; tipo = "fila"; idx = i; } });
            penC.forEach((p, j) => { if (p > mayor) { mayor = p; tipo = "columna"; idx = j; } });

            // Celda de menor costo en la fila/columna elegida.
            let fila, col;
            if (tipo === "fila") {
                fila = idx;
                col = this._argMin(destinos.map((_, j) => colAct[j] ? costos[fila][j] : Infinity));
            } else {
                col = idx;
                fila = this._argMin(origenes.map((_, i) => filasAct[i] ? costos[i][col] : Infinity));
            }

            const cantidad = Math.min(ofR[fila], deR[col]);
            asignaciones.push([origenes[fila], destinos[col], cantidad, costos[fila][col]]);
            costoTotal += cantidad * costos[fila][col];
            pasos.push(`Mayor penalización ${mayor} (${tipo} ${idx + 1}); ` +
                `asigna en (${origenes[fila]} → ${destinos[col]}) ${cantidad} uds a costo ${costos[fila][col]}.`);

            ofR[fila] -= cantidad; deR[col] -= cantidad;
            if (ofR[fila] === 0) filasAct[fila] = false;
            if (deR[col] === 0) colAct[col] = false;
        }
        return new ResultadoTransporte("Aproximación de Vogel", asignaciones, costoTotal, pasos);
    }

    /* Índice del valor mínimo de un arreglo. */
    _argMin(valores) {
        let mejor = -1, menor = Infinity;
        valores.forEach((v, i) => { if (v < menor) { menor = v; mejor = i; } });
        return mejor;
    }

    static _suma(a) { return a.reduce((x, y) => x + y, 0); }
}
