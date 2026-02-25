// sii_database.mjs
import crypto from 'crypto';
import { pool } from '../../database/db.js'; 
import { encrypt, generateHash } from '../../utils/crypto.js'; 

// 🔥 NUEVO: Función para consultar ANTES de iniciar el bot 🔥
export async function verificarEmpresaExistente(rut) {
    // Generamos el hash del RUT tal cual lo tienes en tu sistema
    const rutHash = generateHash(rut);
    
    try {
        const checkQuery = await pool.query(
            `SELECT id, razon_social FROM empresa WHERE rut_hash = $1`,
            [rutHash]
        );
        
        // Si la encuentra, devolvemos los datos. Si no, devolvemos null.
        if (checkQuery.rows.length > 0) {
            return checkQuery.rows[0]; 
        }
        return null; 
    } catch (error) {
        console.error(`[!] Error al verificar la base de datos:`, error.message);
        throw error;
    }
}

// Función exclusiva para guardar (ya sabemos que no existe cuando llega aquí)
export async function guardarEmpresa(datos) {
    console.log(`\n[+] Guardando nueva empresa en el Bunker...`);

    const empresaId = crypto.randomUUID();
    const sucursalId = crypto.randomUUID();
    const rutEncriptado = encrypt(datos.rut);
    const rutHash = generateHash(datos.rut);

    try {
        await pool.query(
            `INSERT INTO empresa (
                id, razon_social, rut_encrypted, rut_hash, giro, regimen_tributario, 
                email_corporativo, telefono_corporativo, inicio_actividades, 
                termino_giro, cumplimiento, representantes_legales, activo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                empresaId, datos.razonSocial, rutEncriptado, rutHash,
                datos.giro || 'Sin giro registrado', 'Por asignar',                        
                datos.correo !== 'No registra' ? datos.correo : null,
                datos.telefono !== 'No registra' ? datos.telefono : null,
                datos.inicioActividades, datos.terminoGiro, datos.estadoCumplimiento,
                JSON.stringify(datos.representantes), true 
            ]
        );

        await pool.query(
            `INSERT INTO sucursal (
                id, empresa_id, direccion, comuna, ciudad, telefono_sucursal, es_casa_matriz
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                sucursalId, empresaId, datos.direccion || 'Sin dirección', 
                'Santiago', 'Santiago', 
                datos.telefono !== 'No registra' ? datos.telefono : null, true 
            ]
        );

        console.log(`[+] ¡Registro completado con éxito!`);
        return { id: empresaId };

    } catch (error) {
        console.error(`[!] Error crítico al guardar en PostgreSQL:`, error.message);
        throw error;
    }
}