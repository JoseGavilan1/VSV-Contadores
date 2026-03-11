// sii_database.mjs
import crypto from 'crypto';
import { pool } from '../../database/db.js'; 

// --- 1. LÓGICA DE CIFRADO (Equivalente exacto al Python) ---
// Extraemos la clave desde las variables de entorno, igual que en Python.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY) : null;

export function encryptAES(text) {
    if (!text || !ENCRYPTION_KEY) return null;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Retornamos en el formato exacto del Python: "iv:ciphertext"
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (e) {
        console.error("Error encriptando dato:", e);
        return null;
    }
}

export function generateHash(text) {
    if (!text) return null;
    return crypto.createHash('sha256').update(text).digest('hex');
}

// --- 2. VERIFICACIÓN ---
export async function verificarEmpresaExistente(rut) {
    const rutHash = generateHash(rut);
    try {
        const checkQuery = await pool.query(
            `SELECT id, razon_social FROM empresa WHERE rut_hash = $1`,
            [rutHash]
        );
        return checkQuery.rows.length > 0 ? checkQuery.rows[0] : null; 
    } catch (error) {
        console.error(`[!] Error al verificar la base de datos:`, error.message);
        throw error;
    }
}

// --- 3. GUARDADO MAESTRO ---
export async function guardarEmpresa(datos, claveSii = '') {
    console.log(`\n[+] Inyectando empresa en el Búnker con la estructura oficial...`);

    try {
        // A. Obtener un Plan por defecto (ej. 'FREE' o 'GO') tal como lo hace Python
        let planId;
        const planRes = await pool.query(`SELECT id FROM plan WHERE nombre = 'FREE' LIMIT 1`);
        if (planRes.rows.length > 0) {
            planId = planRes.rows[0].id;
        } else {
            // Si por alguna razón la BD está vacía, creamos el plan
            const nuevoPlan = await pool.query(`INSERT INTO plan (nombre) VALUES ('FREE') RETURNING id`);
            planId = nuevoPlan.rows[0].id;
        }

        // B. Extraer y preparar al Representante Legal
        let nombreRep = 'No registra en SII';
        let rutRep = '11111111-1'; // Default genérico por si no tiene
        if (datos.representantes && datos.representantes.length > 0) {
            nombreRep = datos.representantes[0].nombre || nombreRep;
            rutRep = datos.representantes[0].rut || rutRep;
        }

        // C. Encriptar los datos críticos
        const rutEncrypted = encryptAES(datos.rut);
        const rutHash = generateHash(datos.rut);
        const rutRepEncrypted = encryptAES(rutRep);

        // --- TRADUCTOR DE ESTADOS ESTRICTOS (F29) ---
        // Aseguramos que solo pasen los valores permitidos por tu base de datos
        const textoCumplimiento = (datos.estadoCumplimiento || '').toUpperCase();
        const estadoF29Valido = textoCumplimiento.includes('DECLARADO') ? 'DECLARADO' : 'PENDIENTE';

        // D. Insertar en tabla EMPRESA (Usando las columnas exactas del CRM)
        const queryEmpresa = `
            INSERT INTO empresa (
                plan_id, razon_social, rut_encrypted, rut_hash, rut_rep_encrypted, 
                giro, regimen_tributario, telefono_corporativo, email_corporativo, 
                logo_url, estado_pago, estado_f29, impuesto_pagar, dts_mensuales, score, nombre_rep
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
            RETURNING id;
        `;
        const valoresEmpresa = [
            planId,
            datos.razonSocial,
            rutEncrypted,
            rutHash,
            rutRepEncrypted,
            datos.giro || 'Sin giro registrado',
            'Por asignar', // Regimen
            datos.telefono !== 'No registra' ? datos.telefono : null,
            datos.correo !== 'No registra' ? datos.correo : null,
            `https://placehold.co/200?text=${datos.razonSocial.substring(0, 2).toUpperCase()}`, // Logo
            'AL DIA', // Por defecto 
            estadoF29Valido, // <--- Estado estrictamente validado
            0, // impuesto_pagar
            0, // dts_mensuales
            100, // score inicial
            nombreRep
        ];

        const resEmpresa = await pool.query(queryEmpresa, valoresEmpresa);
        const empresaId = resEmpresa.rows[0].id;

        // E. Insertar en tabla SUCURSAL
        const querySucursal = `
            INSERT INTO sucursal (empresa_id, direccion, comuna, ciudad, telefono_sucursal, es_casa_matriz) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool.query(querySucursal, [
            empresaId, 
            datos.direccion || 'Sin dirección', 
            datos.comuna || 'Santiago', 
            datos.comuna || 'Santiago', 
            datos.telefono !== 'No registra' ? datos.telefono : null, 
            true 
        ]);

        // F. Insertar en tabla EMPRESA_CREDENCIALES
        const siiRutEncrypted = encryptAES(datos.rut); 
        const siiEmailEncrypted = encryptAES(datos.correo !== 'No registra' ? datos.correo : 'sin@correo.cl');
        const siiPasswordEncrypted = encryptAES(claveSii);
        const webPasswordEncrypted = encryptAES('por_asignar');

        const queryCreds = `
            INSERT INTO empresa_credenciales (
                empresa_id, sii_rut_encrypted, sii_email_encrypted, sii_password_encrypted, web_password_encrypted
            ) VALUES ($1, $2, $3, $4, $5)
        `;
        await pool.query(queryCreds, [
            empresaId, siiRutEncrypted, siiEmailEncrypted, siiPasswordEncrypted, webPasswordEncrypted
        ]);

        console.log(`[+] ¡Registro completado! Todos los datos encriptados y guardados en tu CRM.`);
        return { id: empresaId };

    } catch (error) {
        console.error(`[!] Error crítico al guardar en PostgreSQL:`, error.message);
        throw error;
    }
}