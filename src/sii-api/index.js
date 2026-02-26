import fs from "fs";
import axios from "axios";
import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto"; // Añade este import arriba
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== CONFIG ======
const CERT_PATH = path.join(__dirname, "cert.p12.pfx");
const CERT_PASS = "5229"; 
const URL_SEED = "https://maullin.sii.cl/DTEWS/CrSeed.jws";
const URL_TOKEN = "https://maullin.sii.cl/DTEWS/GetTokenFromSeed.jws";

async function getSeed() {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
  <soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
    <soapenv:Header/><soapenv:Body><getSeed xmlns="http://DefaultNamespace"></getSeed></soapenv:Body>
  </soapenv:Envelope>`;

  const response = await axios.post(URL_SEED, soap, {
    headers: { "Content-Type": "text/xml;charset=UTF-8", "SOAPAction": "" }
  });
  const match = response.data.replace(/&lt;/g, '<').replace(/&gt;/g, '>').match(/<SEMILLA>(.*?)<\/SEMILLA>/);
  return match[1];
}



function signSeed(seed) {
  const p12Buffer = fs.readFileSync(CERT_PATH);
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, CERT_PASS);

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];

  // 1. Convertimos a PEM y luego a llave nativa de Node.js
  const privateKeyPem = forge.pki.privateKeyToPem(keyBags[0].key);
  const signingKey = crypto.createPrivateKey(privateKeyPem); // <--- ESTO ELIMINA EL ERROR

  const certPem = forge.pki.certificateToPem(certBags[0].cert)
    .replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\r?\n|\r|\s+/g, "");

  const xml = `<getToken><item><Semilla>${seed}</Semilla></item></getToken>`;
  const sig = new SignedXml();
  
  // 2. Asignación directa
  sig.signingKey = signingKey; 
  
  sig.addReference({
    xpath: "//*[local-name()='Semilla']",
    transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1"
  });

  sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
  sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

  sig.keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${certPem}</X509Certificate></X509Data>`
  };

  sig.computeSignature(xml, {
    location: { reference: "//*[local-name()='item']", action: "append" }
  });

  // Limpieza para evitar el Estado 11 del SII [cite: 12]
  let signedXml = sig.getSignedXml();
  signedXml = signedXml.replace(/ds:/g, "").replace("<Signature", '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"');
  return signedXml.replace(/>\s+</g, "><");
}

async function getToken(signedXml) {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
    <soapenv:Header/><soapenv:Body>
      <getToken xmlns="http://DefaultNamespace">
        <pszXml><![CDATA[${signedXml}]]></pszXml>
      </getToken>
    </soapenv:Body>
  </soapenv:Envelope>`;

  const response = await axios.post(URL_TOKEN, soap, {
    headers: { "Content-Type": "text/xml;charset=UTF-8", "SOAPAction": "" }
  });
  return response.data;
}

async function main() {
  try {
    console.log("🔄 Obteniendo semilla...");
    const seed = await getSeed();
    console.log("✅ SEMILLA:", seed);

    console.log("🔐 Firmando...");
    const signed = signSeed(seed);

    console.log("📡 Solicitando Token...");
    const res = await getToken(signed);
    const tokenMatch = res.replace(/&lt;/g, '<').replace(/&gt;/g, '>').match(/<TOKEN>(.*?)<\/TOKEN>/);
    
    if (tokenMatch) {
      console.log("\n🚀 TOKEN OBTENIDO:", tokenMatch[1]);
    } else {
      console.log("\n⚠️ Error del SII:", res);
    }
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
  }
}

main();