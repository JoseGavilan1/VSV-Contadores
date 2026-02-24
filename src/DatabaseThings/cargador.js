//
// Este script carga automaticamente datos de prueba
// a la base de datos desde un .txt en formato json.
// El script además se encarga encriptar y hashear los datos
// por lo que es necesario que el .txt tenga los datos planos

//
// Precaución: Este script borra toda la información ya existente
// en la base datos por lo que es exclusivo para el desarrollo y pruebas
//

// node Compartido/DatabaseThings/cargador.js

// Importaciones
import { pool } from "../database/db.js";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { encrypt, generateHash } from "../utils/crypto.js";

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_DATOS_COMPLETO = path.join(__dirname, "datosdepruebahash_completo.txt");
const RUTA_DATOS_LEGACY = path.join(__dirname, "datosdepruebahash.txt");

const cargarSistemaTotal = async () => {
    // Importante: el saltRounds tiene que ser de 10 ya que asi esta configurado en los controladores
    const saltRounds = 10;

    try {
        console.log("Inicio de la carga de datos de prueba...");

        // Verificación de la existencia del archivo .txt (prioriza completo)
        let RUTA_DATOS = RUTA_DATOS_COMPLETO;
        if (!fs.existsSync(RUTA_DATOS)) {
            RUTA_DATOS = RUTA_DATOS_LEGACY;
        }
        if (!fs.existsSync(RUTA_DATOS)) {
            throw new Error(`No se encontró archivo de datos en: ${RUTA_DATOS_COMPLETO} o ${RUTA_DATOS_LEGACY}`);
        }
        
        const rawData = fs.readFileSync(RUTA_DATOS, "utf8");
        const data = JSON.parse(rawData);
        console.log(`📂 Usando archivo: ${path.basename(RUTA_DATOS)}`);

        // 1. Limpieza total de los datos en la base de datos
        console.log("Limpiando la base de datos...");
        await pool.query(`
            TRUNCATE TABLE 
                empresa_servicio_historial,
                empresa_servicio,
                bitacora_gestion,
                sessions,
                audita,
                sucursal,
                empresa_credenciales,
                empresa,
                usuario
            RESTART IDENTITY CASCADE
        `);
        
        // 2. Cargar Usuarios
        console.log(`Procesando ${data.usuarios.length} usuarios...`);
        for (const u of data.usuarios) {
            const passHash = await bcrypt.hash(u.clave, saltRounds);
            await pool.query(
                `INSERT INTO usuario (id, nombre, rut_encrypted, rut_hash, email_encrypted, email_hash, clave, rol, activo) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [u.id, u.nombre, encrypt(u.rut), generateHash(u.rut), encrypt(u.email), generateHash(u.email), passHash, u.rol, u.activo]
            );
        }

        // 3. Cargar Empresas
        console.log(`Cargando ${data.empresas.length} empresas con sus representantes...`);
        for (const e of data.empresas) {
            // Si existe plan en datos, buscar su ID; si no, usar NULL
            let plan_id = null;
            if (e.plan) {
                const result = await pool.query('SELECT id FROM plan WHERE nombre = $1', [e.plan]);
                plan_id = result.rows[0]?.id || null;
            }
            
            await pool.query(
                `INSERT INTO empresa (
                    id, plan_id, tipo_cliente, razon_social, rut_encrypted, rut_hash, giro, regimen_tributario, 
                    telefono_corporativo, email_corporativo, logo_url, drive_url,
                    nombre_rep, rut_rep_encrypted, rut_rep_hash,
                    estado_pago, estado_f29, impuesto_pagar, dts_mensuales, score, activo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
                [
                    e.id, 
                    plan_id,
                    e.tipo_cliente || 'Empresa',
                    e.razon_social, 
                    encrypt(e.rut), 
                    generateHash(e.rut), 
                    e.giro, 
                    e.regimen_tributario, 
                    e.telefono_corporativo, 
                    e.email_corporativo, 
                    e.logo_url, 
                    e.drive_url,
                    e.nombre_rep,
                    encrypt(e.rut_rep),
                    generateHash(e.rut_rep),
                    e.estado_pago || 'AL DIA',
                    e.estado_f29 || 'DECLARADO',
                    e.impuesto_pagar || 0,
                    e.dts_mensuales || 0,
                    e.score || 100,
                    e.activo !== false
                ]
            );
        }

        // 4. Cargar Credenciales
        console.log("Sincronizando credenciales de SII...");
        for (const c of data.credenciales) {
            await pool.query(
                `INSERT INTO empresa_credenciales (
                    empresa_id, 
                    sii_rut_encrypted,
                    sii_email_encrypted, 
                    sii_password_encrypted,
                    web_password_encrypted
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                    c.empresa_id, 
                    encrypt(c.sii_rut),
                    encrypt(c.sii_email), 
                    encrypt(c.sii_password),
                    encrypt(c.sii_password || "web_default_pass")
                ]
            );
        }

        // 5. Cargar Sucursales
        console.log(`Cargando ${data.sucursales.length} sucursales...`);
        for (const s of data.sucursales) {
            await pool.query(
                `INSERT INTO sucursal (id, empresa_id, direccion, comuna, ciudad, telefono_sucursal, es_casa_matriz) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [s.id, s.empresa_id, s.direccion, s.comuna, s.ciudad, s.telefono_sucursal, s.es_casa_matriz]
            );
        }

        // 6. Cargar Relaciones Audita
        console.log("Cargar tabla audita...");
        for (const a of data.audita) {
            await pool.query(
                'INSERT INTO audita (usuario_id, empresa_id) VALUES ($1, $2)',
                [a.usuario_id, a.empresa_id]
            );
        }

        // 7. Cargar Servicios asignados a empresas (si existen en datos)
        if (data.empresa_servicios && data.empresa_servicios.length > 0) {
            console.log(`Cargando ${data.empresa_servicios.length} servicios asignados...`);
            
            // Pre-cargar mapa servicio_id por slug
            const result = await pool.query('SELECT id, slug FROM servicio');
            const servicioMap = {};
            result.rows.forEach(row => {
                servicioMap[row.slug] = row.id;
            });

            for (const es of data.empresa_servicios) {
                const servicio_id = servicioMap[es.servicio_slug];
                if (!servicio_id) {
                    console.warn(`⚠️  Servicio slug ${es.servicio_slug} no encontrado, omitiendo...`);
                    continue;
                }
                
                await pool.query(
                    `INSERT INTO empresa_servicio (
                        id, empresa_id, servicio_id, estado, precio_pactado, fecha_inicio, fecha_termino
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        es.id,
                        es.empresa_id,
                        servicio_id,
                        es.estado || 'Pendiente',
                        es.precio_pactado,
                        es.fecha_inicio,
                        es.fecha_termino
                    ]
                );
            }
        }

        // 8. Cargar Historial de servicios (si existen en datos)
        if (data.empresa_servicio_historial && data.empresa_servicio_historial.length > 0) {
            console.log(`Cargando ${data.empresa_servicio_historial.length} cambios en historial...`);
            for (const hist of data.empresa_servicio_historial) {
                await pool.query(
                    `INSERT INTO empresa_servicio_historial (
                        id, empresa_servicio_id, usuario_id, estado_anterior, estado_nuevo, motivo, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        hist.id,
                        hist.empresa_servicio_id,
                        hist.usuario_id,
                        hist.estado_anterior,
                        hist.estado_nuevo,
                        hist.motivo,
                        hist.created_at
                    ]
                );
            }
        }

        // 9. Cargar Bitácora de gestión (si existen en datos)
        if (data.bitacora_gestion && data.bitacora_gestion.length > 0) {
            console.log(`Cargando ${data.bitacora_gestion.length} entradas de bitácora...`);
            for (const bit of data.bitacora_gestion) {
                await pool.query(
                    `INSERT INTO bitacora_gestion (
                        id, empresa_id, usuario_id, texto, created_at
                    ) VALUES ($1, $2, $3, $4, $5)`,
                    [
                        bit.id,
                        bit.empresa_id,
                        bit.usuario_id,
                        bit.texto,
                        bit.created_at
                    ]
                );
            }
        }

        // 10. Cargar Sesiones (si existen en datos)
        if (data.sessions && data.sessions.length > 0) {
            console.log(`Cargando ${data.sessions.length} sesiones activas...`);
            for (const sess of data.sessions) {
                await pool.query(
                    `INSERT INTO sessions (
                        session_id, usuario_id, expires_at, created_at
                    ) VALUES ($1, $2, $3, $4)`,
                    [
                        sess.session_id,
                        sess.usuario_id,
                        sess.expires_at,
                        sess.created_at
                    ]
                );
            }
        }

        console.log("✅ Bunker cargado exitosamente.");
        console.log(`\n📊 Resumen:`);
        console.log(`   • Usuarios: ${data.usuarios?.length || 0}`);
        console.log(`   • Empresas: ${data.empresas?.length || 0}`);
        console.log(`   • Credenciales: ${data.credenciales?.length || 0}`);
        console.log(`   • Sucursales: ${data.sucursales?.length || 0}`);
        console.log(`   • Relaciones audita: ${data.audita?.length || 0}`);
        console.log(`   • Servicios asignados: ${data.empresa_servicios?.length || 0}`);
        console.log(`   • Historial: ${data.empresa_servicio_historial?.length || 0}`);
        console.log(`   • Bitácora: ${data.bitacora_gestion?.length || 0}`);
        console.log(`   • Sesiones: ${data.sessions?.length || 0}`);

    } catch (error) {
        console.error("\n❌ ERROR CRÍTICO EN CARGADOR:", error.message);
    } finally {
        await pool.end();
        process.exit();
    }
};

cargarSistemaTotal();