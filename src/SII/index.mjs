// index.mjs
import { iniciarNavegador, loginSII } from './sii_login.mjs';
import { extraerDatosTributarios } from './sii_extraccion.mjs';
import { guardarEmpresa, verificarEmpresaExistente } from './sii_database.mjs'; 

/**
 * Función para imprimir un resumen visual en la terminal
 */
function imprimirResumen(datos) {
    console.log("\n=======================================================");
    console.log("🏢 DATOS TRIBUTARIOS EXTRAÍDOS");
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
    // Credenciales para la ejecución
    const credenciales = {
        rutCompleto: "774931325", 
        clave: "poli2021"
    };

    let browser;

    try {
        console.log(`\n[1] Verificando RUT ${credenciales.rutCompleto} en la Base de Datos...`);
        
        // --- PASO 1: VERIFICAR SI EXISTE ---
        // Se detiene si el RUT ya está registrado para ahorrar recursos del SII
        const empresaExistente = await verificarEmpresaExistente(credenciales.rutCompleto);
        
        if (empresaExistente) {
            console.log(`\n✅ LA EMPRESA YA EXISTE: "${empresaExistente.razon_social}" está en el Bunker.`);
            console.log(`No es necesario iniciar el bot. Proceso terminado.\n`);
            process.exit(0); 
        }

        console.log(`[+] Cliente nuevo detectado. Iniciando recorrido en el SII...`);

        // --- PASO 2: INICIAR NAVEGADOR ---
        browser = await iniciarNavegador();
        const page = await browser.newPage();
        
        // Ajustamos la resolución para que se vea como una pantalla estándar
        await page.setViewport({ width: 1366, height: 768 });

        // --- PASO 3: LOGIN ---
        // Esta función (en sii_login.mjs) debe manejar la cola de espera y reintentar si el SII limpia el formulario
        await loginSII(page, credenciales.rutCompleto, credenciales.clave);

        // --- PASO 4: ADAPTACIÓN Y ESTABILIZACIÓN ---
        // Esperamos un tiempo prudente para que la página cargue todos los datos dinámicos
        console.log(`[+] Esperando 6 segundos para que la página se adapte y cargue la información...`);
        await new Promise(r => setTimeout(r, 6000)); 

        // --- PASO 5: EXTRACCIÓN ---
        const datosExtraidos = await extraerDatosTributarios(page);
        imprimirResumen(datosExtraidos);

        // --- PASO 6: GUARDADO ---
        // Registra la empresa y su sucursal de forma encriptada
        await guardarEmpresa(datosExtraidos);

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

// Iniciar ejecución
main();