import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { pool } from '../database/db.js'; 
import 'dotenv/config';

// Configuración de encriptación (debe ser igual a la de tus otros scripts)
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'vsv_secreto_2026_default_key_!!');

function decryptAES(encryptedText) {
    if (!encryptedText || encryptedText === 'SIN_DATO') return null;
    const [ivHex, encryptedHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

function encryptAES(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

const generateHash = (text) => crypto.createHash('sha256').update(text).digest('hex');

async function autoProvisionarCliente(rutInput) {
    console.log(`\n🚀 INICIANDO AUTO-PROVISIONAMIENTO PARA: ${rutInput}`);
    
    try {
        const rutLimpio = rutInput.replace(/\./g, '');
        const rutHash = generateHash(rutLimpio);

        // 1. Buscar Empresa y sus credenciales SII
        const queryEmpresa = `
            SELECT e.id, e.razon_social, e.email_corporativo, c.sii_password_encrypted 
            FROM empresa e
            JOIN empresa_credenciales c ON e.id = c.empresa_id
            WHERE e.rut_hash = $1 LIMIT 1
        `;
        const res = await pool.query(queryEmpresa, [rutHash]);

        if (res.rows.length === 0) {
            throw new Error("No se encontró la empresa o sus credenciales del SII en la base de datos.");
        }

        const empresa = res.rows[0];
        console.log(`   ✔️ Empresa encontrada: ${empresa.razon_social}`);

        // 2. Obtener la clave real del SII
        const claveSiiReal = decryptAES(empresa.sii_password_encrypted);
        if (!claveSiiReal) throw new Error("No se pudo desencriptar la clave del SII.");

        // 3. Preparar datos para la tabla 'usuario'
        // Si hay varios correos separados por ";" o ",", toma solo el primero y quita los espacios
        const emailRaw = empresa.email_corporativo ? empresa.email_corporativo.split(/[,;]/)[0].trim() : `contacto@${empresa.razon_social.split(' ')[0].toLowerCase()}.cl`;
        const email = emailRaw;
        const emailHash = generateHash(email);
        const claveBcrypt = await bcrypt.hash(claveSiiReal, 10);

        // 4. Insertar Usuario con rol 'Cliente'
        const insertUsuario = `
            INSERT INTO usuario (
                nombre, rut_encrypted, rut_hash, email_encrypted, email_hash, clave, rol, activo, empresa_id
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Cliente', true, $7)
            RETURNING id;
        `;

        const resUser = await pool.query(insertUsuario, [
            empresa.razon_social,
            encryptAES(rutLimpio),
            rutHash,
            encryptAES(email),
            emailHash,
            claveBcrypt,
            empresa.id
        ]);

        console.log(`\n✅ ¡USUARIO CREADO AUTOMÁTICAMENTE!`);
        console.log(`   📧 Correo de acceso: ${email}`);
        console.log(`   🔑 Contraseña: (La misma del SII)`);
        console.log(`   🆔 ID Usuario: ${resUser.rows[0].id}`);

    } catch (error) {
        console.error("\n❌ Error en el proceso:", error.message);
    } finally {
        process.exit(0);
    }
}

// Para usarlo: node crear_usuario_automatico.mjs 77944164-4
// Para usarlo: node crear_usuario_automatico.mjs 77944164-4
const rutArg = process.argv[2];
if (rutArg) {
    autoProvisionarCliente(rutArg);
} else {
    console.log("Por favor ingresa un RUT. Ejemplo: node crear_usuario_automatico.mjs 77.944.164-4");
    process.exit(0);
}