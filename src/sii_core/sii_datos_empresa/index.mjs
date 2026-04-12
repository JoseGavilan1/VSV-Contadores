import { iniciarNavegador, loginSII, cerrarSesion } from './sii_login.mjs';
import { extraerDatosTributarios } from './sii_extraccion.mjs';
import { prepararPayloadSupabase } from './sii_database.mjs'; // Usamos la nueva función
import 'dotenv/config';

async function main() {
    console.log("==================================================");
    console.log("🚀 VSV CONTADORES - MODO PREVISUALIZACIÓN JSON");
    console.log("==================================================");

    const rut = `${process.env.DTE_RUT}-${process.env.DTE_DV}`;
    const pass = process.env.DTE_PASS;

    let browser;
    let page;

    try {
        browser = await iniciarNavegador();
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        const inicioTime = Date.now(); 

        await loginSII(page, rut, pass);
        const datosBrutos = await extraerDatosTributarios(page);
        
        // Transformamos los datos al modelo de tu Base de Datos
        const payloadJSON = prepararPayloadSupabase(datosBrutos, pass);

        // IMPRIMIMOS EL JSON EN PANTALLA
        console.log("\n📦 SALIDA JSON GENERADA (LISTA PARA LA BD):");
        console.log("------------------------------------------------------------------");
        console.log(JSON.stringify(payloadJSON, null, 4));
        console.log("------------------------------------------------------------------\n");

        console.log(`⏱️ Tiempo total del proceso: ${((Date.now() - inicioTime) / 1000).toFixed(2)} segundos`);
        console.log("⚠️ NOTA: Los datos NO han sido guardados en Supabase.");

    } catch (error) {
        console.error("\n❌ ERROR CRÍTICO EN EL ROBOT PRINCIPAL:", error.message);
    } finally {
        if (page) await cerrarSesion(page); 
        if (browser) await browser.close();
        console.log("🏁 PROCESO COMPLETADO Y SESIÓN CERRADA.");
        process.exit(0);
    }
}

main();