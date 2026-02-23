import { pool } from '../database/db.js';
import { cleanRut } from '../lib/rut.js';
import { generateHash, decrypt } from '../utils/crypto.js';

export async function obtenerClaveSii(rutEmpresa) {
  const rutLimpio = cleanRut(String(rutEmpresa));
  const rutHash = generateHash(rutLimpio);
  const query = `
    SELECT ec.sii_password_encrypted
    FROM empresa e
    JOIN empresa_credenciales ec ON e.id = ec.empresa_id
    WHERE e.rut_hash = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [rutHash]);
  if (!rows.length) {
    throw new Error(`No existen credenciales SII para el RUT ${rutEmpresa}`);
  }
  
  return decrypt(rows[0].sii_password_encrypted);
}
