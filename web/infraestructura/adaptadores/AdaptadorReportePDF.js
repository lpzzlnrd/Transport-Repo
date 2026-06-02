/* ===========================================================================
   INFRAESTRUCTURA · AdaptadorReportePDF  (adaptador de SALIDA)
   ---------------------------------------------------------------------------
   Implementa el puerto PuertoReporte. Genera el PDF aprovechando el diálogo
   de impresión nativo del navegador (window.print) — sin librerías externas.
   El CSS con @media print oculta los controles y deja el membrete, las tablas
   de entrada, los resultados y el informe de la IA, tal como exige el PDF.
   =========================================================================== */

class AdaptadorReportePDF extends PuertoReporte {
    exportar() {
        // El navegador ofrecerá "Guardar como PDF" en el destino de impresión.
        window.print();
    }
}
