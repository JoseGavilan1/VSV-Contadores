import fs from "fs";
import forge from "node-forge";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_PATH = path.join(__dirname, "cert.p12.pfx");
const CERT_PASS = "5229"; 

try {
    const p12Buffer = fs.readFileSync(CERT_PATH);
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
    
    // Aquí es donde ocurre la validación real
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, CERT_PASS);
    
    console.log("✅ ¡ÉXITO! La contraseña es correcta.");
    
    const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    if (bags[forge.pki.oids.pkcs8ShroudedKeyBag]) {
        console.log("🗝️  Llave privada encontrada y desbloqueada.");
    } else {
        console.log("⚠️  Archivo abierto, pero NO tiene llaves privadas.");
    }
} catch (err) {
    console.error("❌ ERROR: La contraseña NO coincide o el archivo está corrupto.");
    console.error("Detalle:", err.message);
}