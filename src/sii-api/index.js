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
    throw new Error("No se encontró la variable SII_PFX_PASS en el archivo .env");
}
// Cambia esto en index.js
const URL_SEED = "https://palena.sii.cl/DTEWS/CrSeed.jws";
const URL_TOKEN = "https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws";

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

  const privateKeyPem = forge.pki.privateKeyToPem(keyBags[0].key);
  const cert = certBags[0].cert;
  const certPem = forge.pki.certificateToPem(cert).replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\r?\n|\r|\s+/g, "");

  const publicKey = cert.publicKey;
  let nHex = publicKey.n.toString(16);
  if (nHex.length % 2 !== 0) nHex = '0' + nHex;
  let eHex = publicKey.e.toString(16);
  if (eHex.length % 2 !== 0) eHex = '0' + eHex;
  
  const modulus = forge.util.encode64(forge.util.hexToBytes(nHex));
  const exponent = forge.util.encode64(forge.util.hexToBytes(eHex));

  const xml = `<getToken><item><Semilla>${seed}</Semilla></item></getToken>`;
  const sig = new SignedXml();
  
  sig.privateKey = privateKeyPem; 

  sig.addReference({
    xpath: "//*[local-name()='getToken']",
    transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1"
  });

  sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
  sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

  sig.computeSignature(xml, {
    location: { reference: "//*[local-name()='getToken']", action: "append" },
    prefix: '' 
  });

  let signedXml = sig.getSignedXml();
  
  const keyInfoXml = `<KeyInfo><KeyValue><RSAKeyValue><Modulus>${modulus}</Modulus><Exponent>${exponent}</Exponent></RSAKeyValue></KeyValue><X509Data><X509Certificate>${certPem}</X509Certificate></X509Data></KeyInfo>`;
  signedXml = signedXml.replace("</Signature>", keyInfoXml + "</Signature>");
  signedXml = signedXml.replace(/>\s+</g, "><"); 
  
  return `<?xml version="1.0" encoding="UTF-8"?>\n${signedXml}`;
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

// ESTA ES LA FUNCIÓN MAESTRA QUE EXPORTAMOS
export async function obtenerTokenSII() {
    try {
        const seed = await getSeed();
        const signed = signSeed(seed);
        const res = await getToken(signed);
        
        const tokenMatch = res.replace(/&lt;/g, '<').replace(/&gt;/g, '>').match(/<TOKEN>(.*?)<\/TOKEN>/);
        if (tokenMatch) {
            return tokenMatch[1]; // Retorna solo el string del token
        } else {
            throw new Error("Fallo en el SII: " + res);
        }
    } catch (error) {
        throw new Error("Error obteniendo Token: " + error.message);
    }
}