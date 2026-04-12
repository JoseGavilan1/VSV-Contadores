/**
 * sii_database.mjs
 * MODO PRUEBA: Solo genera el JSON estructurado, sin conexión a la DB.
 */
import crypto from 'crypto';

// Usamos tu clave secreta del .env o una de respaldo para pruebas
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
        return null;
    }
}

export function generateHash(text) {
    if (!text || text === 'No registra') return null;
    return crypto.createHash('sha256').update(text).digest('hex');
}

export function prepararPayloadSupabase(datos, claveSii) {
    // Traductor de F29
    const textoCumplimiento = (datos.estadoF29 || '').toUpperCase();
    const estadoF29Valido = textoCumplimiento.includes('DECLARADO') ? 'DECLARADO' : 'PENDIENTE';

    // 1. Estructura exacta para tu tabla 'empresa'
    const payloadEmpresa = {
        razon_social: datos.razonSocial,
        rut_encrypted: encryptAES(datos.rut),
        rut_hash: generateHash(datos.rut),
        rut_rep_encrypted: encryptAES(datos.rutRep),
        nombre_rep: datos.nombreRep !== 'No registra' ? datos.nombreRep : null,
        giro: datos.giro || 'Sin giro registrado',
        regimen_tributario: 'Por asignar',
        telefono_corporativo: datos.telefono !== 'No registra' ? datos.telefono : null,
        email_corporativo: datos.correo !== 'No registra' ? datos.correo : null,
        logo_url: `https://placehold.co/200?text=${datos.razonSocial.substring(0, 2).toUpperCase()}`,
        estado_pago: 'AL DIA',
        estado_f29: estadoF29Valido,
        impuesto_pagar: 0,
        dts_mensuales: 0,
        score: 100,
        activo: true
    };

    // 2. Estructura exacta para tu tabla 'empresa_credenciales'
    const payloadCredenciales = {
        sii_rut_encrypted: encryptAES(datos.rut),
        sii_email_encrypted: encryptAES(datos.correo !== 'No registra' ? datos.correo : 'sin@correo.cl'),
        sii_password_encrypted: encryptAES(claveSii),
        web_password_encrypted: encryptAES('por_asignar')
    };

    // 3. Estructura para 'sucursal' (Casa Matriz)
    const payloadSucursal = {
        direccion: datos.direcciones.length > 0 ? datos.direcciones[0].split(' | ')[2] : datos.direccion,
        comuna: datos.comuna || 'Santiago',
        ciudad: datos.comuna || 'Santiago',
        telefono_sucursal: datos.telefono !== 'No registra' ? datos.telefono : null,
        es_casa_matriz: true
    };

    return {
        tabla_empresa: payloadEmpresa,
        tabla_empresa_credenciales: payloadCredenciales,
        tabla_sucursal: payloadSucursal,
        // Agrego esto para que veas qué extrajo el bot de las listas
        metadata_extraida: {
            giros_detectados: datos.actividades,
            sociedades_detectadas: datos.sociedades,
            oficina_sii: datos.oficinaSII
        }
    };
}