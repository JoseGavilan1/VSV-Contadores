// index.mjs
import { iniciarNavegador, loginSII } from './sii_login.mjs';
import { extraerDatosTributarios } from './sii_extraccion.mjs';

// Función para imprimir bonito en la terminal
function imprimirBoucher(datos) {
    console.log("\n=======================================================");
    console.log("🏢 DATOS PERSONALES Y TRIBUTARIOS EXTRAÍDOS");
    console.log("=======================================================");
    console.log(`👤 Razón Social   : ${datos.razonSocial}`);
    console.log(`🆔 RUT            : ${datos.rut}`);
    console.log(`📍 Dirección      : ${datos.direccion}`);
    console.log(`📞 Teléfono       : ${datos.telefono}`);
    console.log(`📧 Correo         : ${datos.correo}`);
    console.log("-------------------------------------------------------");
    console.log(`📅 Inicio Activid.: ${datos.inicioActividades}`);
    console.log(`🛑 Término Giro   : ${datos.terminoGiro}`);
    console.log(`✅ Cumplimiento   : ${datos.estadoCumplimiento}`);
    console.log("-------------------------------------------------------");
    console.log("👥 REPRESENTANTES LEGALES:");
    if (datos.representantes.length > 0) {
        datos.representantes.forEach((rep, i) => {
            console.log(`   ${i + 1}. ${rep.nombre} (RUT: ${rep.rut})`);
        });
    } else {
        console.log("   No se encontraron representantes.");
    }
    console.log("=======================================================\n");
}

async function main() {
    // ⚠️ PON AQUÍ UN RUT Y CLAVE REAL PARA LA PRUEBA ⚠️
    const credencialesPrueba = {
        rutCompleto: "77493132-5", 
        clave: "poli2021"
    };

    let browser;
    try {
        console.log("Iniciando conexión automatizada al SII...");
        
        browser = await iniciarNavegador();
        const page = await browser.newPage();
        
        // 1. Hacer Login
        await loginSII(page, credencialesPrueba.rutCompleto, credencialesPrueba.clave);
        
        // 2. Extraer los datos
        const datosEmpresa = await extraerDatosTributarios(page);
        
        // 3. Imprimir el resultado ordenado
        imprimirBoucher(datosEmpresa);

    } catch (error) {
        console.error("\n❌ Ocurrió un error en el proceso:", error.message);
    } finally {
        if (browser) {
            console.log("Cerrando navegador en 5 segundos...");
            await new Promise(r => setTimeout(r, 5000));
            await browser.close(); 
        }
    }
}

main();