import fs from "fs";
import axios from "axios";
import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import path from "path";
import { fileURLToPath } from "url";
import 'dotenv/config'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CERT_PATH = path.join(__dirname, "cert.p12.pfx");
const CERT_PASS = process.env.SII_PFX_PASS; 

if (!CERT_PASS) {
    throw new Error("❌ No se encontró la variable SII_PFX_PASS en el archivo .env");
}

const URL_SEED = "https://palena.sii.cl/DTEWS/CrSeed.jws";
const URL_TOKEN = "https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws";

async function getSeed() {
    console.log("--------------------------------------------------");
    console.log("1. SOLICITANDO SEMILLA AL SII...");
    console.log(`URL: ${URL_SEED}`);
    
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <getSeed xmlns="http://DefaultNamespace"></getSeed>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await axios.post(URL_SEED, soap, {
            headers: { "Content-Type": "text/xml;charset=UTF-8", "SOAPAction": "" }
        });
        
        console.log("   ✅ Respuesta bruta recibida del SII.");
        
        const unescapedXml = response.data.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const match = unescapedXml.match(/<SEMILLA>(.*?)<\/SEMILLA>/);
        
        if (match && match[1]) {
            const seed = match[1];
            console.log(`   🌱 Semilla extraída con éxito: ${seed}`); 
            return seed;
        } else {
            throw new Error("No se pudo extraer la semilla de la respuesta del SII.");
        }
    } catch (error) {
        console.error("   ❌ Error al solicitar la semilla:", error.message);
        throw error;
    }
}

function signSeed(seed) {
    console.log("--------------------------------------------------");
    console.log("2. PREPARANDO FIRMA DIGITAL (XML-DSIG)...");
    console.log(`   Leyendo certificado desde: ${CERT_PATH}`);
    
    try {
        const p12Buffer = fs.readFileSync(CERT_PATH);
        const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, CERT_PASS);

        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];

        const privateKey = keyBags[0].key;
        const cert = certBags[0].cert;
        
        const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
        const certPem = forge.pki.certificateToPem(cert).replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\r?\n|\r/g, "");

        console.log("   🔑 Clave privada y certificado extraídos del PFX.");

        const publicKey = cert.publicKey;
        let nHex = publicKey.n.toString(16);
        if (nHex.length % 2 !== 0) nHex = '0' + nHex;
        let eHex = publicKey.e.toString(16);
        if (eHex.length % 2 !== 0) eHex = '0' + eHex;
        
        const modulus = forge.util.encode64(forge.util.hexToBytes(nHex));
        const exponent = forge.util.encode64(forge.util.hexToBytes(eHex));
        
        console.log("   🧮 Modulus y Exponent calculados.");

        const xmlToSign = `<getToken><item><Semilla>${seed}</Semilla></item></getToken>`;
        
        console.log("   📝 Firmando nodo <getToken>...");
        
        const sig = new SignedXml();
        sig.privateKey = privateKeyPem; 
        sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
        
        // ¡Aquí está la línea que solucionará el error!
        sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
        
        sig.addReference({
            xpath: "//*[local-name()='getToken']",
            transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"],
            digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1"
        });

        sig.computeSignature(xmlToSign, {
            location: { reference: "//*[local-name()='getToken']", action: "append" },
            prefix: '' 
        });

        let signedXml = sig.getSignedXml();
        
        const keyInfoXml = `<KeyInfo><KeyValue><RSAKeyValue><Modulus>${modulus}</Modulus><Exponent>${exponent}</Exponent></RSAKeyValue></KeyValue><X509Data><X509Certificate>${certPem}</X509Certificate></X509Data></KeyInfo>`;
        
        signedXml = signedXml.replace("</Signature>", keyInfoXml + "</Signature>");
        signedXml = signedXml.replace(/>\s+</g, "><"); 
        
        console.log("   ✅ XML firmado correctamente.");
        return signedXml; 

    } catch (error) {
        console.error("   ❌ Error en el proceso de firma:", error.message);
        throw error;
    }
}

async function solicitarTokenAlSII(signedXml) {
    console.log("--------------------------------------------------");
    console.log("3. ENVIANDO SEMILLA FIRMADA PARA OBTENER TOKEN...");
    console.log(`URL: ${URL_TOKEN}`);

    const xmlWithHeader = `<?xml version="1.0"?>${signedXml}`;
    
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <getToken xmlns="http://DefaultNamespace">
      <pszXml><![CDATA[${xmlWithHeader}]]></pszXml>
    </getToken>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await axios.post(URL_TOKEN, soap, {
            headers: { "Content-Type": "text/xml;charset=UTF-8", "SOAPAction": "" }
        });
        
        console.log("   ✅ Respuesta bruta recibida de GetTokenFromSeed.");
        
        const unescapedXml = response.data.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        
        const estadoMatch = unescapedXml.match(/<ESTADO>(.*?)<\/ESTADO>/);
        const glosaMatch = unescapedXml.match(/<GLOSA>(.*?)<\/GLOSA>/);
        
        if (estadoMatch && estadoMatch[1] === "00") {
             const tokenMatch = unescapedXml.match(/<TOKEN>(.*?)<\/TOKEN>/);
             if (tokenMatch) {
                 const token = tokenMatch[1];
                 console.log(`   🎫 ¡TOKEN OBTENIDO EXITOSAMENTE!: ${token.substring(0, 10)}...`);
                 return token;
             }
        } else {
             console.error("   ❌ EL SII RECHAZÓ LA SOLICITUD:");
             console.error(`      Estado: ${estadoMatch ? estadoMatch[1] : 'Desconocido'}`);
             console.error(`      Glosa:  ${glosaMatch ? glosaMatch[1] : 'Desconocida'}`);
             console.error("\nRespuesta completa del SII:");
             console.error(unescapedXml);
             throw new Error(`SII devolvió error. Estado: ${estadoMatch ? estadoMatch[1] : 'NA'}`);
        }

    } catch (error) {
        console.error("   ❌ Error en la petición del Token:", error.message);
        throw error;
    }
}

export async function obtenerTokenSII() {
    try {
        const seed = await getSeed();
        const signedXml = signSeed(seed);
        const token = await solicitarTokenAlSII(signedXml);
        
        console.log("==================================================");
        console.log("🎉 PROCESO FINALIZADO CON ÉXITO");
        console.log("TOKEN FINAL:", token);
        console.log("==================================================");
        
        return token;
    } catch (error) {
        console.log("==================================================");
        console.error("💀 EL PROCESO FALLÓ");
        console.log("==================================================");
    }
}

// Solo para probarlo si ejecutas 'node index.js'
obtenerTokenSII();