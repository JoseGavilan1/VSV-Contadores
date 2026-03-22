import { iniciarNavegador, loginSII } from './sii_login.mjs';
import { extraerDatosTributarios } from './sii_extraccion.mjs';
import { guardarEmpresa, verificarEmpresaExistente } from './sii_database.mjs'; 

function imprimirResumen(datos) {
    console.log("\n=======================================================");
    console.log("🏢 DATOS TRIBUTARIOS EXTRAÍDOS");
    console.log("=======================================================");
    console.log(`👤 Razón Social   : ${datos.razonSocial}`);
    console.log(`🆔 RUT            : ${datos.rut}`);
    console.log(`📍 Dirección      : ${datos.direccion}`);
    console.log(`🏙️ Comuna         : ${datos.comuna}`);
    console.log(`💼 Giro           : ${datos.giro}`);
    console.log("-------------------------------------------------------");
    console.log(`📅 Inicio Activid.: ${datos.inicioActividades}`);
    console.log(`✅ Cumplimiento   : ${datos.estadoCumplimiento}`);
    console.log(`👥 Representantes : ${datos.representantes.length} encontrados`);
    console.log("=======================================================\n");
}
 
async function main() {
    // Captura argumentos: node index.mjs 12345678-9 clave123
    const args = process.argv.slice(2);
    const rutInput = args[0] || "77493132-5"; 
    const claveInput = args[1] || "poli2021";

    const credenciales = { 
        rutCompleto: rutInput.replace(/\./g, ''), 
        clave: claveInput 
    };

    // Declaramos browser y page a nivel global de la función
    let browser;
    let page; 

    try {
        // --- PASO 1: VERIFICACIÓN EN SUPABASE ---
        console.log(`\n[1] Verificando RUT ${credenciales.rutCompleto} en el Búnker...`);
        const empresaExistente = await verificarEmpresaExistente(credenciales.rutCompleto);
        
        if (empresaExistente) {
            console.log(`\n✅ LA EMPRESA YA EXISTE: "${empresaExistente.razon_social}".`);
            console.log(`[!] El proceso se detiene para evitar duplicados.\n`);
            process.exit(0); 
        }

        // --- PASO 2: ENTRAR AL SII (SOLO SI NO EXISTE) ---
        console.log(`[+] Cliente nuevo detectado. Iniciando recorrido en el SII...`);
        browser = await iniciarNavegador();
        page = await browser.newPage(); // Usamos la variable global
        await page.setViewport({ width: 1366, height: 768 });

        await loginSII(page, credenciales.rutCompleto, credenciales.clave);

        console.log(`[+] Esperando adaptación del portal...`);
        await new Promise(r => setTimeout(r, 6000)); 

        // --- PASO 3: EXTRACCIÓN Y GUARDADO ---
        const datosExtraidos = await extraerDatosTributarios(page);
        imprimirResumen(datosExtraidos);

        await guardarEmpresa(datosExtraidos, credenciales.clave);
        console.log(`\n[🏁] Proceso completado con éxito para ${datosExtraidos.razonSocial}.`);
        
    } catch (error) {
        console.error("\n❌ ERROR CRÍTICO EN EL PROCESO:", error.message);
    } finally {
        // --- PASO 4: LIMPIEZA FINAL ---
        // Cerramos la sesión en la página primero
        if (page && !page.isClosed()) {
            await cerrarSesion(page);
        }

        // Luego apagamos el navegador completamente
        if (browser) {
            console.log("🛑 Apagando el motor del navegador...");
            await browser.close();
        }
        process.exit(0);
    }
}

main();