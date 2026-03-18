import { pool } from '../database/db.js';
import { decrypt, encrypt } from '../utils/crypto.js';

/**
 * Desencripta datos de forma segura. 
 * Si falla o es nulo, devuelve el valor original o null.
 */
const decryptData = (encryptedValue) => {
    if (!encryptedValue || encryptedValue === 'SIN_DATO') return null;
    try {
        const decrypted = decrypt(encryptedValue);
        return decrypted || encryptedValue;
    } catch (error) {
        // Si no se puede desencriptar, devolvemos el valor original (por si no está encriptado)
        return encryptedValue;
    }
};

export const getClientesCRM = async (req, res) => {
    try {
        // 1. Obtener empresas con todas sus columnas (e.*) para traer los nuevos campos de finanzas
        const clientesResult = await pool.query(`
            SELECT 
                e.*,
                p.nombre as plan_nombre,
                ec.sii_rut_encrypted,
                ec.sii_email_encrypted,
                ec.sii_password_encrypted,
                ec.web_password_encrypted,
                s.direccion,
                s.comuna,
                s.ciudad
            FROM empresa e
            LEFT JOIN plan p ON e.plan_id = p.id
            LEFT JOIN empresa_credenciales ec ON e.id = ec.empresa_id
            LEFT JOIN sucursal s ON e.id = s.empresa_id AND s.es_casa_matriz = TRUE
            ORDER BY e.razon_social ASC
        `);

        // 2. Obtener servicios contratados
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

        // 3. Obtener bitácora de gestión
        const notasResult = await pool.query(`
            SELECT
                id,
                empresa_id,
                texto,
                created_at
            FROM bitacora_gestion
            ORDER BY created_at DESC
        `);

        // 4. Mapear servicios por empresa_id
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
                precioPactado: parseFloat(srv.precio_pactado) || 0
            });
        });

        // 5. Mapear notas por empresa_id (CORREGIDO: Se agregó .rows)
        const notasPorEmpresa = {};
        notasResult.rows.forEach(nota => {
            if (!notasPorEmpresa[nota.empresa_id]) {
                notasPorEmpresa[nota.empresa_id] = [];
            }
            notasPorEmpresa[nota.empresa_id].push({
                id: nota.id,
                fecha: nota.created_at ? new Date(nota.created_at).toLocaleDateString('es-CL') : '',
                texto: nota.texto
            });
        });

        // 6. Procesar y limpiar clientes para el Frontend
        const clients = clientesResult.rows.map((cliente) => ({
            id: cliente.id,
            razonSocial: cliente.razon_social,
            razon_social: cliente.razon_social,
            rut: decryptData(cliente.rut_encrypted),
            rut_encrypted: cliente.rut_encrypted,
            repRut: decryptData(cliente.rut_rep_encrypted),
            repNombre: cliente.nombre_rep,
            giro: cliente.giro,
            regimen: cliente.regimen_tributario,
            telefono: cliente.telefono_corporativo,
            correo: cliente.email_corporativo,
            logo: cliente.logo_url,
            plan: cliente.plan_nombre || 'FREE',
            
            // Estados
            pagoServicio: cliente.estado_pago || 'AL DIA',
            estadoFormulario: cliente.estado_f29 || 'PENDIENTE',
            
            // Finanzas: Conversión estricta para asegurar que React reciba números reales
            impuestoPagar: parseFloat(cliente.impuesto_pagar) || 0,
            neto: parseFloat(cliente.impuesto_pagar) || 0,
            bruto: parseFloat(cliente.monto_bruto) || 0,
            monto_bruto: parseFloat(cliente.monto_bruto) || 0,
            ventas: parseFloat(cliente.ventas_mensuales) || 0,
            compras: parseFloat(cliente.compras_mensuales) || 0,
            facturacionTotal: parseFloat(cliente.facturacion_total) || 0,
            numeroFactura: cliente.nro_factura || '',
            nro_factura: cliente.nro_factura || '',
            impuestoUnico: parseFloat(cliente.impuesto_unico) || 0,
            
            // Renta
            montoRenta: parseFloat(cliente.monto_renta) || 0,
            contratoRenta: cliente.contrato_renta || false,
            formularioRenta: cliente.estado_formulario_renta || '',
            rentaMarzoNeto: parseFloat(cliente.renta_marzo_neto) || 0,
            rentaMarzoBruto: parseFloat(cliente.renta_marzo_bruto) || 0,
            
            // Dirección del Trabajo
            dts: parseInt(cliente.dts_mensuales) || 0,
            dtAtrasados: parseInt(cliente.dts_mensuales) || 0,
            dtPendientesFirma: parseInt(cliente.pendientes_firma) || 0,
            
            // Credenciales: CLAVE del Excel -> web_password_encrypted
            claveWeb: decryptData(cliente.web_password_encrypted),
            claveSII: decryptData(cliente.sii_password_encrypted),
            
            // Otros
            score: parseInt(cliente.score) || 50,
            direccion: cliente.direccion || '',
            comuna: cliente.comuna || '',
            ciudad: cliente.ciudad || '',
            whatsapp: cliente.whatsapp || '',
            importante: cliente.nota_urgente || '',

            notas: notasPorEmpresa[cliente.id] || [],
            servicios: serviciosPorEmpresa[cliente.id] || [],
            type: cliente.tipo_cliente || 'Empresa'
        }));

        return res.json({
            success: true,
            clients,
            total: clients.length
        });
    } catch (error) {
        console.error('❌ Error CRM Controller:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error al sincronizar datos con el CRM.'
        });
    }
};

export const updateClienteCRM = async (req, res) => {
    try {
        const { empresaId } = req.params;
        const {
            razonSocial, rut, repRut, repNombre, giro, regimen,
            telefono, correo, plan, pagoServicio, estadoFormulario,
            score, direccion, comuna, ciudad, bruto, neto,
            ventas, compras, impuestoUnico, numeroFactura,
            montoRenta, contratoRenta, formularioRenta, whatsapp, importante
        } = req.body;

        const rutEncrypted = rut ? encrypt(rut) : null;
        const repRutEncrypted = repRut ? encrypt(repRut) : null;

        let planId = null;
        if (plan) {
            const planResult = await pool.query('SELECT id FROM plan WHERE nombre = $1', [plan]);
            planId = planResult.rows[0]?.id;
        }

        const parseNum = (val) => {
            if (val === undefined || val === null || val === '') return null;
            const clean = String(val).replace(/[^0-9.-]+/g, "");
            return isNaN(parseFloat(clean)) ? null : parseFloat(clean);
        };

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
                monto_bruto = COALESCE($13, monto_bruto),
                impuesto_pagar = COALESCE($14, impuesto_pagar),
                ventas_mensuales = COALESCE($15, ventas_mensuales),
                compras_mensuales = COALESCE($16, compras_mensuales),
                impuesto_unico = COALESCE($17, impuesto_unico),
                nro_factura = COALESCE($18, nro_factura),
                monto_renta = COALESCE($19, monto_renta),
                contrato_renta = COALESCE($20, contrato_renta),
                estado_formulario_renta = COALESCE($21, estado_formulario_renta),
                whatsapp = COALESCE($22, whatsapp),
                nota_urgente = COALESCE($23, nota_urgente),
                updated_at = NOW()
            WHERE id = $24
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            razonSocial || null, rutEncrypted || null, repRutEncrypted || null,
            repNombre || null, giro || null, regimen || null, telefono || null,
            correo || null, planId || null, pagoServicio || null, estadoFormulario || null,
            score || null, parseNum(bruto), parseNum(neto), parseNum(ventas),
            parseNum(compras), parseNum(impuestoUnico), numeroFactura || null,
            parseNum(montoRenta),
            contratoRenta !== undefined ? (contratoRenta === 'SÍ' || contratoRenta === true) : null,
            formularioRenta || null, whatsapp || null, importante || null,
            empresaId
        ]);

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Empresa no encontrada.' });

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

        return res.json({ success: true, message: 'Datos de empresa actualizados correctamente.' });
    } catch (error) {
        console.error('❌ Error updating cliente:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar los datos en la base de datos.'
        });
    }
};

export const addNotaCRM = async (req, res) => {
    try {
        const { empresaId } = req.params;
        const { texto } = req.body;
        if (!texto || !texto.trim()) return res.status(400).json({ success: false, message: 'La nota no puede estar vacía.' });

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
                fecha: nota.created_at ? new Date(nota.created_at).toLocaleDateString('es-CL') : ''
            }
        });
    } catch (error) {
        console.error('❌ Error guardando nota CRM:', error.message);
        return res.status(500).json({
            success: false,
            message: 'No se pudo guardar la gestión en la bitácora.'
        });
    }
};