import axios from "axios";
import { obtenerTokenSII } from "./index.js"; // Importamos tu generador de tokens

// Esta es la URL de la API SOAP Oficial que SÍ acepta tu Token
// Cambia esto en sii_consultar_estado.js
const URL_CONSULTA = "https://palena.sii.cl/DTEWS/QueryEstDte.jws";

async function consultarEstadoFactura(token, datos) {
    // Fíjate cómo el SII EXIGE que le envíes el Monto y la Fecha en el XML
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
       <soapenv:Header/>
       <soapenv:Body>
          <def:getEstDte>
             <RutConsultante>${datos.rutConsultante}</RutConsultante>
             <DvConsultante>${datos.dvConsultante}</DvConsultante>
             <RutCompania>${datos.rutEmisor}</RutCompania>
             <DvCompania>${datos.dvEmisor}</DvCompania>
             <RutReceptor>${datos.rutReceptor}</RutReceptor>
             <DvReceptor>${datos.dvReceptor}</DvReceptor>
             <TipoDte>${datos.tipoDte}</TipoDte>
             <FolioDte>${datos.folio}</FolioDte>
             <FechaEmisionDte>${datos.fecha}</FechaEmisionDte>
             <MontoDte>${datos.monto}</MontoDte>
             <Token>${token}</Token>
          </def:getEstDte>
       </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(URL_CONSULTA, soap, {
            headers: { "Content-Type": "text/xml;charset=UTF-8", "SOAPAction": "" }
        });
        return response.data;
    } catch (error) {
        console.error("❌ Error de conexión:", error.message);
        return null;
    }
}

async function main() {
    try {
        console.log("🔐 Generando tu Token oficial del SII...");
        const token = await obtenerTokenSII();
        console.log("✅ Token obtenido con éxito.");

        // =========================================================
        // AQUÍ ESTÁ LA TRAMPA DEL SII: 
        // Tienes que saber los datos ANTES de preguntar
        // =========================================================
        const datosFactura = {
            rutConsultante: "11030124", dvConsultante: "3", // Tu RUT
            rutEmisor: "76610718",      dvEmisor: "4",      // BPO ADVISORS SPA
            rutReceptor: "78306207",    dvReceptor: "0",    // VOLLAIRE & OLIVOS
            tipoDte: "33",                                  // 33 = Factura Electrónica
            folio: "76796",                                 // El folio que vimos
            fecha: "27-02-2026",                            // DD-MM-YYYY
            monto: "750"                                    // Tienes que saber el monto total
        };

        console.log(`\n📡 Validando la Factura N° ${datosFactura.folio} con la API oficial...`);
        const resultado = await consultarEstadoFactura(token, datosFactura);
        
        console.log("\n📄 RESPUESTA DEL SII:");
        // El SII no te devolverá un JSON bonito con los datos, 
        // te devolverá un XML diciendo <ESTADO>DOK</ESTADO> (Válido)
        console.log(resultado); 

    } catch (error) {
        console.error("\n❌ PROCESO DETENIDO:", error.message);
    }
}

main();