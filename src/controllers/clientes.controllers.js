import { pool } from '../database/db.js';
import { decrypt, encrypt } from '../utils/crypto.js';

const decryptData = (encryptedValue) => {
    if (!encryptedValue) return null;
    const decrypted = decrypt(encryptedValue);
    return decrypted || encryptedValue;
};

export const getClientesCRM = async (req, res) => {
    try {
        // Obtener empresas con JOIN a plan, credenciales y sucursal
        const clientesResult = await pool.query(`
            SELECT 
                e.id,
                e.razon_social,
                e.rut_encrypted,
                e.rut_rep_encrypted,
                e.giro,
                e.regimen_tributario,
                e.telefono_corporativo,
                e.email_corporativo,
                e.logo_url,
                e.estado_pago,
                e.estado_f29,
                e.impuesto_pagar,
                e.dts_mensuales,
                e.score,
                e.nombre_rep,
                p.nombre as plan,
                ec.sii_rut_encrypted,
                ec.sii_email_encrypted,
                ec.sii_password_encrypted,
                s.direccion,
                s.comuna,
                s.ciudad
            FROM empresa e
            LEFT JOIN plan p ON e.plan_id = p.id
            LEFT JOIN empresa_credenciales ec ON e.id = ec.empresa_id
            LEFT JOIN sucursal s ON e.id = s.empresa_id AND s.es_casa_matriz = TRUE
            ORDER BY e.id
        `);

        // Obtener servicios por empresa
        const serviciosResult = await pool.query(`
            SELECT 
                es.id,
                es.empresa_id,
                s.nombre,
                s.categoria,
                es.estado,
                es.precio_pactado
            FROM empresa_servicio es
            JOIN servicio s ON es.servicio_id = s.id
            ORDER BY es.empresa_id
        `);

        // Obtener bitacora por empresa
        const notasResult = await pool.query(`
            SELECT
                id,
                empresa_id,
                texto,
                created_at
            FROM bitacora_gestion
            ORDER BY created_at DESC
        `);

        // Mapear servicios por empresa_id
        const serviciosPorEmpresa = {};
        serviciosResult.rows.forEach(srv => {
            if (!serviciosPorEmpresa[srv.empresa_id]) {
                serviciosPorEmpresa[srv.empresa_id] = [];
            }
            serviciosPorEmpresa[srv.empresa_id].push({
                id: srv.id,
                nombre: srv.nombre,
                categoria: srv.categoria,
                estado: srv.estado,
                precioPactado: srv.precio_pactado
            });
        });

        // Mapear notas por empresa_id
        const notasPorEmpresa = {};
        notasResult.rows.forEach(nota => {
            if (!notasPorEmpresa[nota.empresa_id]) {
                notasPorEmpresa[nota.empresa_id] = [];
            }
            notasPorEmpresa[nota.empresa_id].push({
                id: nota.id,
                fecha: nota.created_at
                    ? new Date(nota.created_at).toLocaleDateString('es-CL')
                    : '',
                texto: nota.texto
            });
        });

        // Procesar clientes con desencriptación
        const clients = clientesResult.rows.map((cliente) => ({
            id: cliente.id,
            razonSocial: cliente.razon_social,
            rut: decryptData(cliente.rut_encrypted),
            repRut: decryptData(cliente.rut_rep_encrypted),
            repNombre: cliente.nombre_rep,
            giro: cliente.giro,
            regimen: cliente.regimen_tributario,
            telefono: cliente.telefono_corporativo,
            correo: cliente.email_corporativo,
            logo: cliente.logo_url,
            plan: cliente.plan,
            pagoServicio: cliente.estado_pago || 'AL DIA',
            estadoFormulario: cliente.estado_f29,
            impuestoPagar: cliente.impuesto_pagar || 0,
            neto: cliente.impuesto_pagar || 0,
            dts: cliente.dts_mensuales || 0,
            score: cliente.score || 50,
            claveWeb: decryptData(cliente.sii_email_encrypted),
            claveSII: decryptData(cliente.sii_password_encrypted),
            direccion: cliente.direccion || '',
            comuna: cliente.comuna || '',
            ciudad: cliente.ciudad || '',
            notas: notasPorEmpresa[cliente.id] || [],
            servicios: serviciosPorEmpresa[cliente.id] || [],
            type: 'Empresa'
        }));

        return res.json({
            success: true,
            clients,
            total: clients.length,
            byPlan: clients.reduce((acc, c) => {
                acc[c.plan] = (acc[c.plan] || 0) + 1;
                return acc;
            }, {}),
            byStatus: clients.reduce((acc, c) => {
                acc[c.pagoServicio] = (acc[c.pagoServicio] || 0) + 1;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error('❌ Error CRM Controller:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Fallo en sincronización CRM.'
        });
    }
};

export const updateClienteCRM = async (req, res) => {
    try {
        const { empresaId } = req.params;
        const {
            razonSocial,
            rut,
            repRut,
            repNombre,
            giro,
            regimen,
            telefono,
            correo,
            plan,
            pagoServicio,
            estadoFormulario,
            score,
            direccion,
            comuna,
            ciudad
        } = req.body;

        // Encriptar campos sensibles
        const rutEncrypted = rut ? encrypt(rut) : null;
        const repRutEncrypted = repRut ? encrypt(repRut) : null;

        // Obtener plan_id desde nombre del plan
        let planId = null;
        if (plan) {
            const planResult = await pool.query(
                'SELECT id FROM plan WHERE nombre = $1',
                [plan]
            );
            planId = planResult.rows[0]?.id;
        }

        // Actualizar empresa
        const updateQuery = `
            UPDATE empresa SET
                razon_social = COALESCE($1, razon_social),
                rut_encrypted = COALESCE($2, rut_encrypted),
                rut_rep_encrypted = COALESCE($3, rut_rep_encrypted),
                nombre_rep = COALESCE($4, nombre_rep),
                giro = COALESCE($5, giro),
                regimen_tributario = COALESCE($6, regimen_tributario),
                telefono_corporativo = COALESCE($7, telefono_corporativo),
                email_corporativo = COALESCE($8, email_corporativo),
                plan_id = COALESCE($9, plan_id),
                estado_pago = COALESCE($10, estado_pago),
                estado_f29 = COALESCE($11, estado_f29),
                score = COALESCE($12, score),
                updated_at = NOW()
            WHERE id = $13
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            razonSocial || null,
            rutEncrypted || null,
            repRutEncrypted || null,
            repNombre || null,
            giro || null,
            regimen || null,
            telefono || null,
            correo || null,
            planId || null,
            pagoServicio || null,
            estadoFormulario || null,
            score || null,
            empresaId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada.'
            });
        }

        // Actualizar sucursal si se proporcionan datos de dirección
        if (direccion || comuna || ciudad) {
            await pool.query(`
                UPDATE sucursal SET
                    direccion = COALESCE($1, direccion),
                    comuna = COALESCE($2, comuna),
                    ciudad = COALESCE($3, ciudad),
                    updated_at = NOW()
                WHERE empresa_id = $4 AND es_casa_matriz = TRUE
            `, [direccion || null, comuna || null, ciudad || null, empresaId]);
        }

        return res.json({
            success: true,
            message: 'Empresa actualizada correctamente.',
            empresa: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error updating cliente:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Fallo al actualizar empresa.'
        });
    }
};

export const addNotaCRM = async (req, res) => {
    try {
        const { empresaId } = req.params;
        const { texto } = req.body;

        if (!texto || !texto.trim()) {
            return res.status(400).json({
                success: false,
                message: 'La nota no puede estar vacia.'
            });
        }

        const result = await pool.query(
            `INSERT INTO bitacora_gestion (empresa_id, usuario_id, texto)
             VALUES ($1, $2, $3)
             RETURNING id, empresa_id, texto, created_at`,
            [empresaId, req.user?.usuarioId || null, texto.trim()]
        );

        const nota = result.rows[0];

        return res.json({
            success: true,
            nota: {
                id: nota.id,
                empresaId: nota.empresa_id,
                texto: nota.texto,
                fecha: nota.created_at
                    ? new Date(nota.created_at).toLocaleDateString('es-CL')
                    : ''
            }
        });
    } catch (error) {
        console.error('❌ Error guardando nota CRM:', error.message);
        return res.status(500).json({
            success: false,
            message: 'No se pudo guardar la nota.'
        });
    }
};