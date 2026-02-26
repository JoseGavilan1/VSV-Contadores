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
    const credenciales = { rutCompleto: "774931325", clave: "poli2021" };
    let browser;

    try {
        console.log(`\n[1] Verificando RUT ${credenciales.rutCompleto} en el Búnker...`);
        const empresaExistente = await verificarEmpresaExistente(credenciales.rutCompleto);
        
        if (empresaExistente) {
            console.log(`\n✅ LA EMPRESA YA EXISTE: "${empresaExistente.razon_social}". Proceso terminado.\n`);
            process.exit(0); 
        }

        console.log(`[+] Cliente nuevo detectado. Iniciando recorrido en el SII...`);
        browser = await iniciarNavegador();
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        await loginSII(page, credenciales.rutCompleto, credenciales.clave);

        console.log(`[+] Esperando adaptación del portal...`);
        await new Promise(r => setTimeout(r, 6000)); 

        const datosExtraidos = await extraerDatosTributarios(page);
        imprimirResumen(datosExtraidos);

        await guardarEmpresa(datosExtraidos, credenciales.clave);
        console.log(`\n[🏁] Proceso completado con éxito para ${datosExtraidos.razonSocial}.`);
        
    } catch (error) {
        console.error("\n❌ ERROR CRÍTICO EN EL PROCESO:", error.message);
    } finally {
        if (browser) {
            console.log("Cerrando navegador en 5 segundos...");
            await new Promise(r => setTimeout(r, 5000));
            await browser.close();
        }
        process.exit(0);
    }
}
main();