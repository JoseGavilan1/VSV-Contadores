// sii_database.mjs
import crypto from 'crypto';
import { pool } from '../database/db.js'; 
import { encrypt, generateHash } from '../utils/crypto.js'; 

// Función de apoyo para evitar el error "value too long for type character varying(100)"
const limitarTexto = (texto, max = 95) => {
    if (!texto) return 'No registra';
    return texto.length > max ? texto.substring(0, max) + "..." : texto;
};

export async function verificarEmpresaExistente(rut) {
    const rutHash = generateHash(rut);
    try {
        const checkQuery = await pool.query(
            `SELECT id, razon_social FROM empresa WHERE rut_hash = $1`,
            [rutHash]
        );
        if (checkQuery.rows.length > 0) {
            return checkQuery.rows[0]; 
        }
        return null; 
    } catch (error) {
        console.error(`[!] Error al verificar la base de datos:`, error.message);
        throw error;
    }
}

export async function guardarEmpresa(datos) {
    console.log(`\n[+] Guardando empresa y sus Representantes Legales en el Bunker...`);

    const empresaId = crypto.randomUUID();
    const sucursalId = crypto.randomUUID();
    const rutEncriptado = encrypt(datos.rut);
    const rutHash = generateHash(datos.rut);

    // Formatear los representantes en formato JSON stringificado
    const representantesJSON = JSON.stringify(datos.representantes.length > 0 ? datos.representantes : [{ nombre: "Sin representantes extraídos", rut: "N/A" }]);

    try {
        await pool.query(
            `INSERT INTO empresa (
                id, razon_social, rut_encrypted, rut_hash, giro, regimen_tributario, 
                email_corporativo, telefono_corporativo, inicio_actividades, 
                termino_giro, cumplimiento, representantes_legales, activo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                empresaId, 
                limitarTexto(datos.razonSocial), // Limitamos textos para que no superen el VARCHAR(100)
                rutEncriptado, 
                rutHash,
                'Sin giro registrado', 
                'Por asignar',                        
                limitarTexto(datos.correo !== 'No registra' ? datos.correo : null),
                limitarTexto(datos.telefono !== 'No registra' ? datos.telefono : null),
                limitarTexto(datos.inicioActividades), 
                limitarTexto(datos.terminoGiro), 
                limitarTexto(datos.estadoCumplimiento),
                representantesJSON, // Los representantes legales se guardan en formato JSON
                true 
            ]
        );

        await pool.query(
            `INSERT INTO sucursal (
                id, empresa_id, direccion, comuna, ciudad, telefono_sucursal, es_casa_matriz
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                sucursalId, 
                empresaId, 
                limitarTexto(datos.direccion || 'Sin dirección'), 
                'Santiago', 
                'Santiago', 
                limitarTexto(datos.telefono !== 'No registra' ? datos.telefono : null), 
                true 
            ]
        );

        console.log(`[+] ¡Registro completado con éxito! Se guardaron ${datos.representantes.length} representantes legales.`);
        return { id: empresaId };

    } catch (error) {
        console.error(`[!] Error crítico al guardar en PostgreSQL:`, error.message);
        throw error;
    }
}