// index.mjs
import { iniciarNavegador, loginSII } from './sii_login.mjs';
import { extraerDatosTributarios } from './sii_extraccion.mjs';
import { guardarEmpresa, verificarEmpresaExistente } from './sii_database.mjs'; 

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
    console.log("=======================================================\n");
}

async function main() {
    // ⚠️ CREDENCIALES ACTUALIZADAS PARA LA PRUEBA ⚠️
    const credencialesPrueba = {
        rutCompleto: "77493132-5", 
        clave: "poli2021"
    };

    try {
        console.log(`\n[1] Comprobando disponibilidad del RUT ${credencialesPrueba.rutCompleto} en la base de datos...`);
        
        // 🔥 VERIFICACIÓN PREVIA (Early Exit) 🔥
        const empresaExistente = await verificarEmpresaExistente(credencialesPrueba.rutCompleto);
        
        if (empresaExistente) {
            console.log(`\n✅ ¡DETENCIÓN TEMPRANA!`);
            console.log(`La empresa "${empresaExistente.razon_social}" YA EXISTE en el Bunker.`);
            console.log(`No es necesario iniciar el bot ni entrar al SII. Misión abortada para ahorrar recursos.\n`);
            process.exit(0); // Cierra todo el proceso inmediatamente
        }

        console.log(`[+] La empresa es nueva. Desplegando el bot del SII...`);
        
        // Si no existe, recién aquí abrimos el navegador
        const browser = await iniciarNavegador();
        const page = await browser.newPage();
        
        await loginSII(page, credencialesPrueba.rutCompleto, credencialesPrueba.clave);
        const datosEmpresa = await extraerDatosTributarios(page);
        
        imprimirBoucher(datosEmpresa);
        await guardarEmpresa(datosEmpresa);

        console.log("Cerrando navegador en 5 segundos...");
        await new Promise(r => setTimeout(r, 5000));
        await browser.close(); 
        
    } catch (error) {
        console.error("\n❌ Ocurrió un error en el proceso:", error.message);
    } finally {
        process.exit(0);
    }
}

main();