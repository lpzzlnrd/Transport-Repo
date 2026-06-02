/* ===========================================================================
   DOMINIO · ProblemaAsignacion + MetodoHungaro
   ---------------------------------------------------------------------------
   CAPA DE DOMINIO (núcleo del hexágono). Lógica pura del Método Húngaro,
   sin ninguna dependencia de la web. Resuelve la asignación óptima de N
   ingenieros a N actividades minimizando el tiempo/costo total, registrando
   todos los pasos (reducciones y ajustes de matriz).

   Separamos responsabilidades en dos clases (OO):
     - ProblemaAsignacion: entidad inmutable con los datos.
     - MetodoHungaro: servicio de dominio que aplica el algoritmo.
   =========================================================================== */

/* Entidad: datos de un problema de asignación cuadrado. */
class ProblemaAsignacion {
    constructor(trabajadores, tareas, costos, unidad) {
        this._trabajadores = trabajadores;
        this._tareas = tareas;
        this._costos = costos;
        this._unidad = unidad || "unidades";
        this._validar();
    }

    _validar() {
        const n = this._costos.length;
        if (n === 0) throw new Error("La matriz no puede estar vacía.");
        if (this._costos.some(f => f.length !== n)) {
            throw new Error("El método húngaro requiere una matriz CUADRADA (N×N).");
        }
        if (this._trabajadores.length !== n || this._tareas.length !== n) {
            throw new Error("Debe haber tantos ingenieros y actividades como el tamaño de la matriz.");
        }
        if (this._costos.some(f => f.some(v => isNaN(v) || v < 0))) {
            throw new Error("Todos los tiempos/costos deben ser números ≥ 0.");
        }
    }

    trabajadores() { return [...this._trabajadores]; }
    tareas() { return [...this._tareas]; }
    costos() { return this._costos.map(f => [...f]); }
    unidad() { return this._unidad; }
    tamano() { return this._costos.length; }
}

/* Servicio de dominio: aplica el método húngaro. */
class MetodoHungaro {
    resolver(problema) {
        const original = problema.costos();
        const matriz = original.map(f => [...f]);
        const pasos = [];

        this._reducirFilas(matriz);
        pasos.push({ titulo: "Paso 1 · Reducción por filas", matriz: MetodoHungaro._clonar(matriz) });

        this._reducirColumnas(matriz);
        pasos.push({ titulo: "Paso 2 · Reducción por columnas", matriz: MetodoHungaro._clonar(matriz) });

        // Repite el ajuste hasta que exista una asignación completa de ceros.
        let asignacion = this._asignacionCompleta(matriz);
        while (asignacion === null) {
            const cobertura = this._coberturaMinima(matriz);
            this._ajustar(matriz, cobertura);
            const detalle =
                `Líneas usadas: ${cobertura.filas.size + cobertura.columnas.size}. ` +
                `Filas cubiertas: ${MetodoHungaro._formato(cobertura.filas)}. ` +
                `Columnas cubiertas: ${MetodoHungaro._formato(cobertura.columnas)}.`;
            pasos.push({ titulo: "Paso 3 · Ajuste de la matriz", matriz: MetodoHungaro._clonar(matriz), detalle });
            asignacion = this._asignacionCompleta(matriz);
        }

        // Reconstruye usando los costos ORIGINALES.
        const trabajadores = problema.trabajadores();
        const tareas = problema.tareas();
        const asignaciones = [];
        let costoTotal = 0;
        Object.keys(asignacion).map(Number).sort((a, b) => a - b).forEach(fila => {
            const col = asignacion[fila];
            const costo = original[fila][col];
            asignaciones.push([trabajadores[fila], tareas[col], costo]);
            costoTotal += costo;
        });

        return { asignaciones, costoTotal, pasos, unidad: problema.unidad() };
    }

    _reducirFilas(m) {
        for (const fila of m) {
            const menor = Math.min(...fila);
            for (let c = 0; c < fila.length; c++) fila[c] -= menor;
        }
    }

    _reducirColumnas(m) {
        const n = m.length;
        for (let c = 0; c < n; c++) {
            let menor = Infinity;
            for (let f = 0; f < n; f++) menor = Math.min(menor, m[f][c]);
            for (let f = 0; f < n; f++) m[f][c] -= menor;
        }
    }

    /* Si se pueden emparejar las N filas con N columnas vía ceros, retorna
       {fila->columna}; si no, null. */
    _asignacionCompleta(m) {
        const emp = this._emparejar(m); // columna -> fila
        if (Object.keys(emp).length !== m.length) return null;
        const r = {};
        for (const col in emp) r[emp[col]] = Number(col);
        return r;
    }

    /* Matching bipartito por caminos de aumento. */
    _emparejar(m) {
        const emp = {};
        for (let fila = 0; fila < m.length; fila++) this._aumentar(fila, m, new Set(), emp);
        return emp;
    }

    _aumentar(fila, m, visitadas, emp) {
        for (let col = 0; col < m[fila].length; col++) {
            if (m[fila][col] !== 0 || visitadas.has(col)) continue;
            visitadas.add(col);
            if (!(col in emp) || this._aumentar(emp[col], m, visitadas, emp)) {
                emp[col] = fila;
                return true;
            }
        }
        return false;
    }

    /* Cobertura mínima de ceros (teorema de König) para el ajuste. */
    _coberturaMinima(m) {
        const n = m.length;
        const emp = this._emparejar(m);
        const filasEmp = new Set(Object.values(emp));
        const filasMarcadas = new Set();
        for (let f = 0; f < n; f++) if (!filasEmp.has(f)) filasMarcadas.add(f);
        const colMarcadas = new Set();

        let cambio = true;
        while (cambio) {
            cambio = false;
            for (const f of [...filasMarcadas]) {
                for (let c = 0; c < n; c++) {
                    if (m[f][c] === 0 && !colMarcadas.has(c)) { colMarcadas.add(c); cambio = true; }
                }
            }
            for (const c of [...colMarcadas]) {
                if (c in emp && !filasMarcadas.has(emp[c])) { filasMarcadas.add(emp[c]); cambio = true; }
            }
        }

        const filasCubiertas = new Set();
        for (let f = 0; f < n; f++) if (!filasMarcadas.has(f)) filasCubiertas.add(f);
        return { filas: filasCubiertas, columnas: colMarcadas };
    }

    /* Resta el menor no cubierto y lo suma en las intersecciones. */
    _ajustar(m, cobertura) {
        const n = m.length;
        let menor = Infinity;
        for (let f = 0; f < n; f++)
            for (let c = 0; c < n; c++)
                if (!cobertura.filas.has(f) && !cobertura.columnas.has(c))
                    menor = Math.min(menor, m[f][c]);

        for (let f = 0; f < n; f++) {
            for (let c = 0; c < n; c++) {
                const fc = cobertura.filas.has(f), cc = cobertura.columnas.has(c);
                if (!fc && !cc) m[f][c] -= menor;
                else if (fc && cc) m[f][c] += menor;
            }
        }
    }

    static _formato(conjunto) {
        if (!conjunto.size) return "ninguna";
        return [...conjunto].sort((a, b) => a - b).map(i => i + 1).join(", ");
    }
    static _clonar(m) { return m.map(f => [...f]); }
}
