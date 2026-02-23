import { pool } from "../database/db.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { generateHash, decrypt } from "../utils/crypto.js";

export const loginUser = async (req, res) => {
    const { email, clave } = req.body;

    try {
        const emailHash = generateHash(email);

        const userResult = await pool.query(
            'SELECT id, nombre, email_encrypted, rol, clave, activo FROM usuario WHERE email_hash = $1',
            [emailHash]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = userResult.rows[0];

        if (!user.activo) {
            return res.status(403).json({ 
                success: false,
                message: 'Cuenta suspendida por seguridad. Contacte al administrador.' 
            });
        }
        
        const realMatch = await bcrypt.compare(clave, user.clave);

        if (!realMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const companyResult = await pool.query(
            `SELECT e.id, e.razon_social, e.rut_encrypted 
             FROM empresa e 
             JOIN audita a ON a.empresa_id = e.id 
             WHERE a.usuario_id = $1`,
            [user.id]
        );

        const assignedCompanies = companyResult.rows.map(co => ({
            id: co.id,
            razonSocial: co.razon_social,
            rut: decrypt(co.rut_encrypted)
        }));

        const sessionId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 Horas de validez

        await pool.query(
            `INSERT INTO sessions (session_id, usuario_id, expires_at) VALUES ($1, $2, $3)`,
            [sessionId, user.id, expiresAt]
        );

        return res.json({
            id: user.id,
            nombre: user.nombre,
            email: decrypt(user.email_encrypted),
            rol: user.rol,
            assignedCompanies,
            sessionId
        });

    } catch (err) {
        console.error('❌ Error Crítico en Autenticación:', err.message);
        res.status(500).json({ message: 'Error interno en la cámara de seguridad del búnker.' });
    }
};