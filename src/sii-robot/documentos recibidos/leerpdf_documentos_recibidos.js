import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';

/**
 * Extrae información estructurada de facturas PDF del SII (Chile).
 * Versión final para VSV-Contadores con filtros de limpieza.
 */
export async function extraerDatosFactura(rutaDelArchivo) {
    try {
        const dataBuffer = fs.readFileSync(rutaDelArchivo);
        const data = await pdf(dataBuffer);

        let textoLimpio = data.text
            .replace(/ACI\?N/g, "ACIÓN")
            .replace(/ELECTR\?NICA/g, "ELECTRÓNICA")
            .replace(/\?/g, "Ó");

        const lineas = textoLimpio.split('\n').map(l => l.trim());

        const factura = {
            cabecera: {
                numeroFactura: null,
                emisorNombre: lineas[2] || null, 
                emisorRut: null,
                giro: null,
                direccion: null,
                comuna: null,
                ciudad: null,
                receptorNombre: null,
                receptorRut: null,
                fechaEmision: null,
                montoNeto: null,
                montoIva: null,
                montoTotal: null
            },
            detalles: []
        };

        // --- LISTA NEGRA DE FRASES A EVITAR ---
        const frasesAEliminar = [
            "Timbre Electrónico SII",
            "Verifique documento: www.sii.cl",
            "Documento Electrónico Recibido"
        ];

        let leyendoTabla = false;
        let itemActual = null;

        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i];
            if (!linea) continue;

            // FILTRO DE SEGURIDAD: Si la línea contiene basura del SII, la ignoramos de inmediato
            if (frasesAEliminar.some(frase => linea.includes(frase))) {
                continue; 
            }

            // --- 1. CABECERA ---
            if (linea.startsWith("Nº")) factura.cabecera.numeroFactura = linea.replace("Nº", "").trim();
            if (linea.startsWith("SEÑOR(ES):")) factura.cabecera.receptorNombre = linea.replace("SEÑOR(ES):", "").trim();
            if (linea.startsWith("Giro:")) factura.cabecera.giro = linea.replace("Giro:", "").trim();
            if (linea.startsWith("DIRECCION:")) factura.cabecera.direccion = linea.replace("DIRECCION:", "").trim();
            if (linea.startsWith("Fecha Emision:")) factura.cabecera.fechaEmision = linea.replace("Fecha Emision:", "").trim();

            if (linea.startsWith("COMUNA")) {
                const matchLugar = linea.match(/COMUNA(.*?)CIUDAD:(.*)/);
                if (matchLugar) {
                    factura.cabecera.comuna = matchLugar[1].trim();
                    factura.cabecera.ciudad = matchLugar[2].trim();
                }
            }

            if (linea.startsWith("R.U.T.:")) {
                let rut = linea.replace("R.U.T.:", "").trim();
                if (rut === "" && lineas[i+1]) rut = lineas[i+1].trim();
                
                if (/^[0-9.]+-[0-9kK]+$/.test(rut)) {
                    if (!factura.cabecera.receptorRut) factura.cabecera.receptorRut = rut;
                    else if (rut !== factura.cabecera.receptorRut) factura.cabecera.emisorRut = rut;
                }
            }

            if (linea.includes("MONTO NETO")) {
                const m = linea.match(/MONTO NETO\s*\$\s*([\d.]+)/);
                if (m) factura.cabecera.montoNeto = parseInt(m[1].replace(/\./g, ""));
            }
            if (linea.includes("I.V.A.")) {
                const m = linea.match(/I\.V\.A\..*?\$\s*([\d.]+)/);
                if (m) factura.cabecera.montoIva = parseInt(m[1].replace(/\./g, ""));
            }
            if (linea.includes("TOTAL$") || linea.startsWith("TOTAL$")) {
                const m = linea.match(/TOTAL\s*\$\s*([\d.]+)/);
                if (m) factura.cabecera.montoTotal = parseInt(m[1].replace(/\./g, ""));
            }

            // --- 2. DETALLES ---
            if (linea.includes("CodigoDescripcionCantidadPrecio")) {
                leyendoTabla = true;
                continue;
            }

            // DETECTOR DE FIN DE TABLA: Agregamos "Timbre" como señal de parada
            if (leyendoTabla && (linea.startsWith("Referencias:") || linea.includes("MONTO NETO") || linea.includes("Timbre"))) {
                leyendoTabla = false;
                if (itemActual) {
                    factura.detalles.push(itemActual);
                    itemActual = null;
                }
                continue; 
            }

            if (leyendoTabla) {
                const matchCodigo = linea.match(/^([A-Za-z0-9]+-[A-Za-z]+[0-9]+)(.*)/);
                
                if (matchCodigo) {
                    if (itemActual) factura.detalles.push(itemActual);
                    itemActual = {
                        codigo: matchCodigo[1],
                        descripcion: matchCodigo[2].trim(),
                        cantidad: null,
                        unidad: null,
                        precioUnitario: null,
                        precioTotal: null
                    };
                } 
                else if (itemActual) {
                    const matchNum = linea.match(/^(\d+)\s+([A-Za-z]+)([\d.]+)$/);
                    if (matchNum) {
                        itemActual.cantidad = parseInt(matchNum[1]);
                        itemActual.unidad = matchNum[2];
                        const pegados = matchNum[3].replace(/\./g, "");
                        
                        for (let len = 1; len < pegados.length; len++) {
                            const pU = parseInt(pegados.substring(0, len));
                            const pT = parseInt(pegados.substring(len));
                            // Ecuación de validación: $P_u \times Q = P_t$
                            if (pU * itemActual.cantidad === pT) {
                                itemActual.precioUnitario = pU;
                                itemActual.precioTotal = pT;
                                break;
                            }
                        }
                    } else {
                        if (!itemActual.descripcion.includes(linea)) {
                            itemActual.descripcion += " " + linea;
                        }
                    }
                }
            }
        }

        console.log("\n=== DATOS EXTRAÍDOS CORRECTAMENTE ===");
        console.log(JSON.stringify(factura, null, 2));

        if (fs.existsSync(rutaDelArchivo)) {
            fs.unlinkSync(rutaDelArchivo);
            console.log(`🗑️ Archivo PDF temporal eliminado.`);
        }

        return factura;

    } catch (error) {
        console.error("❌ Error al procesar el PDF:", error);
        return null;
    }
}