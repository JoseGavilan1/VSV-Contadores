/**
 * sii_database.mjs
 * CONEXIÓN ACTIVA: Guarda los datos extraídos directamente en PostgreSQL.
 */
import crypto from 'crypto';
import { pool } from '../../database/db.js'; // Conexión real a tu BD

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
    ? Buffer.from(process.env.ENCRYPTION_KEY) 
    : Buffer.alloc(32, 'vsv_secreto_2026_default_key_!!');

export function encryptAES(text) {
    if (!text || text === 'No registra') return null;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (e) {
        console.error("Error encriptando dato:", e);
        return null;
    }
}

export function generateHash(text) {
    if (!text || text === 'No registra') return null;
    return crypto.createHash('sha256').update(text).digest('hex');
}

// 1. VERIFICAR SI LA EMPRESA YA EXISTE
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

// 2. GUARDADO MAESTRO EN SUPABASE
export async function guardarEmpresa(datos, claveSii) {
    console.log(`\n[+] Inyectando empresa en el Búnker (Supabase)...`);

    try {
        // A. Obtener un Plan por defecto (ej. 'FREE' o el primero que exista)
        let planId = null;
        const planRes = await pool.query(`SELECT id FROM plan LIMIT 1`);
        if (planRes.rows.length > 0) {
            planId = planRes.rows[0].id;
        }

        // B. Encriptación y formateo
        const rutEncrypted = encryptAES(datos.rut);
        const rutHash = generateHash(datos.rut);
        const rutRepEncrypted = encryptAES(datos.rutRep);
        
        const textoCumplimiento = (datos.estadoF29 || '').toUpperCase();
        const estadoF29Valido = textoCumplimiento.includes('DECLARADO') ? 'DECLARADO' : 'PENDIENTE';

        // C. Insertar en tabla EMPRESA
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
            'Por asignar',
            datos.telefono !== 'No registra' ? datos.telefono : null,
            datos.correo !== 'No registra' ? datos.correo : null,
            `https://placehold.co/200?text=${datos.razonSocial.substring(0, 2).toUpperCase()}`,
            'AL DIA',
            estadoF29Valido,
            0, 
            0, 
            100,
            datos.nombreRep !== 'No registra' ? datos.nombreRep : null
        ];

        const resEmpresa = await pool.query(queryEmpresa, valoresEmpresa);
        const empresaId = resEmpresa.rows[0].id;
        console.log(`   ✔️ Empresa creada (ID: ${empresaId})`);

        // D. Insertar en tabla SUCURSAL (Casa Matriz)
        const direccionPrincipal = datos.direcciones.length > 0 ? datos.direcciones[0].split(' | ')[2] : datos.direccion;
        const querySucursal = `
            INSERT INTO sucursal (empresa_id, direccion, comuna, ciudad, telefono_sucursal, es_casa_matriz) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool.query(querySucursal, [
            empresaId, 
            direccionPrincipal || 'Sin dirección', 
            datos.comuna || 'Santiago', 
            datos.comuna || 'Santiago', 
            datos.telefono !== 'No registra' ? datos.telefono : null, 
            true 
        ]);
        console.log(`   ✔️ Sucursal Matriz registrada.`);

        // E. Insertar en tabla EMPRESA_CREDENCIALES
        const queryCreds = `
            INSERT INTO empresa_credenciales (
                empresa_id, sii_rut_encrypted, sii_email_encrypted, sii_password_encrypted, web_password_encrypted
            ) VALUES ($1, $2, $3, $4, $5)
        `;
        await pool.query(queryCreds, [
            empresaId, 
            encryptAES(datos.rut), 
            encryptAES(datos.correo !== 'No registra' ? datos.correo : 'sin@correo.cl'), 
            encryptAES(claveSii), 
            encryptAES('por_asignar')
        ]);
        console.log(`   ✔️ Credenciales encriptadas y guardadas.`);

        console.log(`[+] ¡Registro completado en la Base de Datos!`);
        return { id: empresaId, nombre: datos.razonSocial };

    } catch (error) {
        console.error(`[!] Error crítico al guardar en PostgreSQL:`, error.message);
        throw error;
    }
}