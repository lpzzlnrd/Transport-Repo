/* ===========================================================================
   INFRAESTRUCTURA · datosPorDefecto
   ---------------------------------------------------------------------------
   Casos de prueba base tomados del enunciado (PDF). Sirven como "datos por
   defecto" para validar el software; el usuario puede editarlos o ingresar
   cualquier otra matriz.
   =========================================================================== */

const CASO_TRANSPORTE = {
    origenes: ["Planta 1 (P1)", "Planta 2 (P2)", "Planta 3 (P3)"],
    destinos: ["Data Center 1", "Data Center 2", "Data Center 3", "Data Center 4"],
    ofertas: [250, 400, 350],
    demandas: [200, 300, 250, 250],
    costos: [
        [10, 20, 5, 11],   // P1
        [13, 9, 12, 8],    // P2
        [4, 15, 7, 9],     // P3
    ],
};

const CASO_ASIGNACION = {
    trabajadores: ["Ingeniero 1 (I1)", "Ingeniero 2 (I2)", "Ingeniero 3 (I3)", "Ingeniero 4 (I4)"],
    tareas: ["Módulo A (Finanzas)", "Módulo B (Seguridad)", "Módulo C (Procesamiento)", "Módulo D (API Gateway)"],
    costos: [
        [12, 9, 11, 8],    // I1
        [10, 14, 12, 11],  // I2
        [8, 11, 15, 9],    // I3
        [9, 10, 12, 13],   // I4
    ],
    unidad: "días",
};
