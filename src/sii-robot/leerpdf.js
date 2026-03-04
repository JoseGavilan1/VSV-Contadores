import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';

// ==========================
// FUNCION PRINCIPAL EXPORTADA
// ==========================
export async function extraerDatosFactura(rutaDelArchivo) {
    try {
        const dataBuffer = fs.readFileSync(rutaDelArchivo);
        const data = await pdf(dataBuffer);

        // Limpieza básica de errores de encoding comunes del SII
        let textoLimpio = data.text
            .replace(/ACI\?N/g, "ACIÓN")
            .replace(/ELECTR\?NICA/g, "ELECTRÓNICA")
            .replace(/\?/g, "Ó"); // opcional

        const lineas = textoLimpio
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        const factura = {
            numeroFactura: null,
            emisorNombre: null,
            emisorRut: null,
            giro: null,
            direccion: null,
            comuna: null,
            ciudad: null,
            receptorNombre: null,
            receptorRut: null,
            fechaEmision: null,
            descripcion: null,
            montoNeto: null,
            montoIva: null,
            montoTotal: null
        };

        // ==========================
        // EMISOR (primera línea)
        // ==========================
        factura.emisorNombre = lineas[0];

        for (let i = 0; i < lineas.length; i++) {

            const linea = lineas[i];

            // Número factura
            if (linea.startsWith("Nº")) {
                factura.numeroFactura = linea.replace("Nº", "").trim();
            }

            // RUT (el primero es receptor, el segundo emisor)
            if (linea.startsWith("R.U.T.:")) {
                const rut = linea.replace("R.U.T.:", "").trim();

                if (!factura.receptorRut) {
                    factura.receptorRut = rut;
                } else {
                    factura.emisorRut = rut;
                }
            }

            // Giro
            if (linea.startsWith("Giro:")) {
                factura.giro = linea.replace("Giro:", "").trim();
            }

            // Dirección
            if (linea.startsWith("DIRECCION:")) {
                factura.direccion = linea.replace("DIRECCION:", "").trim();
            }

            // Comuna y ciudad (vienen pegadas)
            if (linea.startsWith("COMUNA")) {
                const match = linea.match(/COMUNA(.*?)CIUDAD:(.*)/);
                if (match) {
                    factura.comuna = match[1].replace("-", "").trim();
                    factura.ciudad = match[2].replace("-", "").trim();
                }
            }

            // Receptor
            if (linea.startsWith("SEÑOR(ES):")) {
                factura.receptorNombre = linea.replace("SEÑOR(ES):", "").trim();
            }

            // Fecha
            if (linea.startsWith("Fecha Emision:")) {
                factura.fechaEmision = linea.replace("Fecha Emision:", "").trim();
            }

            // Descripción (línea que empieza con código tipo ABC1-XXX)
            if (/^[A-Z0-9]+-[A-Z0-9]+/.test(linea)) {
                factura.descripcion = linea.trim();
            }

            // Montos
            if (linea.startsWith("MONTO NETO$")) {
                factura.montoNeto = parseInt(linea.replace("MONTO NETO$", "").trim());
            }

            if (linea.startsWith("I.V.A. 19%$")) {
                factura.montoIva = parseInt(linea.replace("I.V.A. 19%$", "").trim());
            }

            if (linea.startsWith("TOTAL$")) {
                factura.montoTotal = parseInt(linea.replace("TOTAL$", "").trim());
            }
        }

        console.log("\n=== DATOS EXTRAÍDOS CORRECTAMENTE ===");
        console.table([factura]);

        // ==========================
        // AUTO-ELIMINAR EL PDF
        // ==========================
        fs.unlinkSync(rutaDelArchivo);
        console.log(`🗑️ Archivo PDF temporal eliminado exitosamente.`);

        return factura;

    } catch (error) {
        console.error("❌ Error al procesar el PDF:", error);
        return null; // Retornamos null si hay error para que el buscador no intente guardar datos vacíos
    }
}