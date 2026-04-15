import { pool } from '../database/db.js';
// Importamos la herramienta de desencriptación si es que la necesitas 
// (aunque en tu esquema rut_cliente parece ser texto plano)
import { decrypt } from '../utils/crypto.js';

export const consultarHistorialEmpresa = async (req, res) => {
    try {
        // Obtenemos el ID desde la consulta (query string)
        const { empresa_id } = req.query;

        if (!empresa_id) {
            return res.status(400).json({ ok: false, error: "Falta el identificador de la empresa." });
        }

        // Ejecutamos la consulta SQL uniendo la tabla de documentos con la de empresa
        const query = `
            SELECT 
                d.id,
                d.folio,
                d.tipo_dte,
                d.monto_neto,
                d.fecha_emision,
                d.url_pdf,
                d.rut_cliente,
                e.razon_social
            FROM documentos_emitidos d
            JOIN empresa e ON d.empresa_id = e.id
            WHERE d.empresa_id = $1
            ORDER BY d.fecha_emision DESC;
        `;

        const result = await pool.query(query, [empresa_id]);

        // Retornamos el arreglo de documentos
        return res.json({
            ok: true,
            documentos: result.rows
        });

    } catch (error) {
        console.error('❌ Error en dteConsulta.controller:', error.message);
        return res.status(500).json({
            ok: false,
            error: 'No se pudo conectar con la bóveda de documentos.'
        });
    }
};