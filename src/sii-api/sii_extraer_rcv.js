import 'dotenv/config';
import axios from "axios";
import { obtenerTokenSII } from "./index.js";

// Inyectamos el RUT de la empresa en la sesión para forzar el reconocimiento del delegado
const headersSII = (token, rutEmpresa) => ({
    "Content-Type": "application/json",
    // El truco: pasamos el TOKEN y forzamos la cookie RUT_EMPRESA
    "Cookie": `TOKEN=${token}; RUT_EMPRESA=${rutEmpresa}`, 
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://www4.sii.cl",
    "Referer": "https://www4.sii.cl/consdcvinternetui/"
});

async function main() {
    try {
        console.log("🔐 Generando Token de acceso...");
        const token = await obtenerTokenSII();
        
        const rut = "78306207"; 
        const dv = "0";
        const periodo = "202602"; 

        console.log(`📡 Forzando consulta del Registro de Ventas para ${rut}-${dv} (${periodo})...`);

        // Llamada a la API con la cabecera modificada
        const resDetalle = await axios.post("https://www4.sii.cl/consdcvinternetui/services/data/facadeService/getDetalleVenta", {
            "metaData": { "namespace": "cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/getDetalleVenta", "conversationId": token, "transactionId": token },
            "data": { "rutEmisor": rut, "dvEmisor": dv, "ptributario": periodo, "estadoContab": "REGISTRO" }
        }, { headers: headersSII(token, rut) });

        const respuesta = resDetalle.data;

        if (respuesta.respEstado && respuesta.respEstado.codRespuesta !== 0) {
            console.log(`\n⛔ EL SII SIGUE BLOQUEANDO LA CONSULTA (Caché activo)`);
            console.log(`   Código: ${respuesta.respEstado.codError}`);
            console.log(`   Detalle: ${respuesta.respEstado.msjError || 'Sin permisos'}`);
            console.log(`   👉 Ya no hay nada más que hacer en el código. Hay que esperar a que el SII sincronice sus servidores.`);
            return;
        }

        if (respuesta.data && Array.isArray(respuesta.data)) {
            const lista = respuesta.data;
            console.log(`\n✅ ¡ACCESO CONCEDIDO AL RCV DE LA EMPRESA!`);
            console.log(`📊 Se encontraron ${lista.length} facturas de venta en este mes.`);
            
            lista.forEach((doc, index) => {
                console.log(`\n📄 Factura #${index + 1} | Folio: ${doc.folio}`);
                console.log(`   - Cliente: ${doc.rutRecep}-${doc.dvRecep}`);
                console.log(`   - Total: $${doc.mntTotal}`);
            });
        } else {
            console.log("\n⚠️ Respuesta inesperada del SII:", JSON.stringify(respuesta));
        }

    } catch (e) {
        console.error("\n❌ Error en el código:", e.message);
    }
}

main();