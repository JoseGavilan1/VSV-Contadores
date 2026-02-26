import { pool } from './database/db.js'; // Conexión centralizada
import { decrypt } from './utils/crypto.js'; // Tu lógica de desencriptación
import 'dotenv/config'; // Carga de llaves AES del .env

async function ejecutarAuditoria() {
    console.log("======================================================");
    console.log("🔐 EXTRACCIÓN DE DATOS DESENCRIPTADOS - MODO AUDITOR");
    console.log("======================================================");

    try {
        // 1. Recuperar Empresas (Datos del SII + Datos Propios)
        console.log("\n[+] LISTADO DE EMPRESAS EN EL BUNKER:");
        const resEmpresas = await pool.query(`
            SELECT 
                razon_social, 
                rut_encrypted, 
                email_corporativo, 
                telefono_corporativo, 
                giro, 
                inicio_actividades, 
                cumplimiento 
            FROM empresa
        `);

        if (resEmpresas.rows.length === 0) {
            console.log("   No hay empresas registradas.");
        } else {
            resEmpresas.rows.forEach((emp, i) => {
                // Desencriptamos el RUT usando tu llave del .env
                const rutReal = decrypt(emp.rut_encrypted);
                
                console.log(`\n${i + 1}. ${emp.razon_social.toUpperCase()}`);
                console.log(`   🆔 RUT: ${rutReal}`);
                console.log(`   💼 GIRO: ${emp.giro || 'No especificado'}`);
                console.log(`   📧 EMAIL: ${emp.email_corporativo || 'N/A'}`);
                console.log(`   📞 TEL: ${emp.telefono_corporativo || 'N/A'}`);
                console.log(`   📅 INICIO ACT: ${emp.inicio_actividades || 'No registra'}`);
                console.log(`   ✅ CUMPLIMIENTO: ${emp.cumplimiento || 'Pendiente'}`);
            });
        }

        console.log("\n" + "=".repeat(54));

        // 2. Recuperar Usuarios (RUTs y Emails de acceso)
        console.log("\n[+] LISTADO DE USUARIOS DEL SISTEMA:");
        const resUsuarios = await pool.query(`
            SELECT nombre, rut_encrypted, email_encrypted, rol, activo 
            FROM usuario
        `);

        if (resUsuarios.rows.length === 0) {
            console.log("   No hay usuarios registrados.");
        } else {
            resUsuarios.rows.forEach((user, i) => {
                const rutUser = decrypt(user.rut_encrypted);
                const emailUser = decrypt(user.email_encrypted);
                
                console.log(`\n${i + 1}. ${user.nombre} [${user.rol}]`);
                console.log(`   🆔 RUT: ${rutUser}`);
                console.log(`   📧 EMAIL: ${emailUser}`);
                console.log(`   🟢 ESTADO: ${user.activo ? 'ACTIVO' : 'INACTIVO'}`);
            });
        }

    } catch (error) {
        console.error("\n❌ ERROR DE AUDITORÍA:", error.message);
    } finally {
        // Cerramos la conexión para que el script termine
        await pool.end();
        console.log("\n======================================================");
        console.log("🔒 Auditoría finalizada. Conexión cerrada.");
        console.log("======================================================");
        process.exit(0);
    }
}

ejecutarAuditoria();