import crypto from 'crypto';
import { pool } from '../../database/db.js'; 
import { encrypt, generateHash } from '../../utils/crypto.js'; 

export async function guardarEmpresa(datos) {
    console.log(`\n[+] Guardando datos de ${datos.razonSocial} en la base de datos...`);

    const empresaId = crypto.randomUUID();
    const sucursalId = crypto.randomUUID();

    const rutEncriptado = encrypt(datos.rut);
    const rutHash = generateHash(datos.rut);

    try {
        // 1. Insertamos la Empresa con TODOS los campos obligatorios
        await pool.query(
            `INSERT INTO empresa (
                id, 
                razon_social, 
                rut_encrypted, 
                rut_hash, 
                giro,                 -- Agregado
                regimen_tributario,   -- Agregado
                email_corporativo, 
                telefono_corporativo, 
                inicio_actividades, 
                termino_giro, 
                cumplimiento, 
                representantes_legales, 
                activo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                empresaId,
                datos.razonSocial,
                rutEncriptado,
                rutHash,
                datos.giro || 'Sin giro registrado',  // Evita el error de Null
                'Por asignar',                        // Evita el error de Null
                datos.correo !== 'No registra' ? datos.correo : null,
                datos.telefono !== 'No registra' ? datos.telefono : null,
                datos.inicioActividades,
                datos.terminoGiro,
                datos.estadoCumplimiento,
                JSON.stringify(datos.representantes), 
                true 
            ]
        );

        console.log(`[+] Empresa registrada con éxito (ID: ${empresaId})`);

        // 2. Insertamos la Sucursal (Casa Matriz) vinculada a la empresa
        await pool.query(
            `INSERT INTO sucursal (
                id, 
                empresa_id, 
                direccion, 
                comuna, 
                ciudad, 
                telefono_sucursal, 
                es_casa_matriz
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                sucursalId,
                empresaId,
                datos.direccion || 'Sin dirección', // Por si acaso
                'Santiago', 
                'Santiago', 
                datos.telefono !== 'No registra' ? datos.telefono : null,
                true 
            ]
        );

        console.log(`[+] Dirección registrada con éxito en la tabla Sucursal.`);
        
        return { id: empresaId };

    } catch (error) {
        console.error(`[!] Error crítico al guardar en PostgreSQL:`, error.message);
        throw error;
    }
}