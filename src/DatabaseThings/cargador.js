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
const RUTA_DATOS = path.join(__dirname, "datosdepruebahash.txt"); 

const cargarSistemaTotal = async () => {
    // Importante: el saltRounds tiene que ser de 10 ya que asi esta configurado en los controladores
    const saltRounds = 10;

    try {
        console.log("Inicio de la carga de datos de prueba...");

        // Verificación de la existencia del archivo .txt
        if (!fs.existsSync(RUTA_DATOS)) {
            throw new Error(`No se encontró el archivo en: ${RUTA_DATOS}`);
        }
        const rawData = fs.readFileSync(RUTA_DATOS, "utf8");
        const data = JSON.parse(rawData); 

        // 1. Limpieza total de los datos en la base de datos
        console.log("Limpiando la base de datos...");
        await pool.query('TRUNCATE TABLE sessions, audita, sucursal, empresa_credenciales, empresa, usuario RESTART IDENTITY CASCADE');
        
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
            await pool.query(
                `INSERT INTO empresa (
                    id, razon_social, rut_encrypted, rut_hash, giro, regimen_tributario, 
                    telefono_corporativo, email_corporativo, logo_url, configuracion, activo,
                    nombre_rep, rut_rep_encrypted, rut_rep_hash
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [
                    e.id, 
                    e.razon_social, 
                    encrypt(e.rut), 
                    generateHash(e.rut), 
                    e.giro, 
                    e.regimen_tributario, 
                    e.telefono_corporativo, 
                    e.email_corporativo, 
                    e.logo_url, 
                    e.configuracion, 
                    e.activo,
                    e.nombre_rep,
                    encrypt(e.rut_rep),
                    generateHash(e.rut_rep)
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
                    sii_password_encrypted
                ) VALUES ($1, $2, $3, $4)`,
                [
                    c.empresa_id, 
                    encrypt(c.sii_rut),
                    encrypt(c.sii_email), 
                    encrypt(c.sii_password) 
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

        console.log("Bunker cargado exitosamente.");

    } catch (error) {
        console.error("\n❌ ERROR CRÍTICO EN CARGADOR:", error.message);
    } finally {
        await pool.end();
        process.exit();
    }
};

cargarSistemaTotal();