import { iniciarNavegador, loginSII, cerrarSesion } from './sii_login.mjs';
import { extraerDatosTributarios } from './sii_extraccion.mjs';
import { guardarEmpresa, verificarEmpresaExistente } from './sii_database.mjs'; 
import 'dotenv/config';

async function main() {
    console.log("==================================================");
    console.log("🚀 VSV CONTADORES - ONBOARDING DE EMPRESAS (PROD)");
    console.log("==================================================");

    const rutCompleto = `${process.env.DTE_RUT}-${process.env.DTE_DV}`;
    const claveInput = process.env.DTE_PASS;
    const rutLimpio = rutCompleto.replace(/\./g, '');

    let browser;
    let page;

    try {
        // --- PASO 1: VERIFICACIÓN EN BASE DE DATOS ---
        console.log(`\n[1/4] Verificando RUT ${rutCompleto} en el Búnker...`);
        const empresaExistente = await verificarEmpresaExistente(rutCompleto);
        
        if (empresaExistente) {
            console.log(`\n✅ LA EMPRESA YA EXISTE: "${empresaExistente.razon_social}".`);
            console.log(`[!] El proceso se detiene para evitar duplicados.\n`);
            process.exit(0); 
        }

        // --- PASO 2: EXTRACCIÓN SII ---
        console.log(`[+] Cliente nuevo detectado. Iniciando recorrido en el SII...`);
        const inicioTime = Date.now(); 

        browser = await iniciarNavegador();
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await loginSII(page, rutLimpio, claveInput);
        const datosExtraidos = await extraerDatosTributarios(page);

        // --- PASO 3: GUARDADO EN BASE DE DATOS ---
        console.log("\n" + "═".repeat(60));
        console.log(` 🏢 GUARDANDO DATOS: ${datosExtraidos.razonSocial}`);
        console.log("═".repeat(60));
        
        await guardarEmpresa(datosExtraidos, claveInput);

        console.log("─".repeat(60));
        console.log(`⏱️ Tiempo total de onboarding: ${((Date.now() - inicioTime) / 1000).toFixed(2)} segundos`);

    } catch (error) {
        console.error("\n❌ ERROR CRÍTICO EN EL PROCESO:", error.message);
    } finally {
        // --- PASO 4: LIMPIEZA FINAL ---
        if (page) await cerrarSesion(page); 
        if (browser) {
            await browser.close();
            console.log("\n🏁 NAVEGADOR APAGADO Y SESIÓN CERRADA.");
        }
        process.exit(0);
    }
}

main();