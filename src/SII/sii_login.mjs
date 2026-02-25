// sii_login.mjs
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const pausa = (ms) => new Promise(res => setTimeout(res, ms));

export async function iniciarNavegador() {
    return await puppeteer.launch({
        headless: false, // Útil mantenerlo en false mientras depuras
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null
    });
}

export async function loginSII(page, rutCompleto, clave) {
    const [rut, dv] = rutCompleto.split("-");
    let ingresado = false;

    while (!ingresado) {
        console.log(`\n[+] Cargando portal de acceso...`);
        // Usamos domcontentloaded para que no se quede pegado si un recurso de terceros no carga
        await page.goto("https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi", { waitUntil: 'domcontentloaded' });

        // --- 1. MANEJO DE SALA DE ESPERA ---
        console.log(`[+] Verificando si hay sala de espera...`);
        let enSalaDeEspera = true;
        while (enSalaDeEspera) {
            const url = page.url();
            const contenido = await page.content();
            
            // Queue-it suele cambiar la URL o mostrar textos específicos
            if (url.includes('queue-it.net') || contenido.toLowerCase().includes('sala de espera') || contenido.toLowerCase().includes('espere un momento')) {
                console.log(`[⏳] En sala de espera. Aguardando 15 segundos antes de volver a revisar...`);
                await pausa(15000); // Revisamos cada 15 segundos
            } else {
                enSalaDeEspera = false;
            }
        }

        // Esperamos que el campo RUT esté realmente disponible
        try {
            await page.waitForSelector("#rutcntr", { timeout: 15000, visible: true });
        } catch (error) {
            console.log(`[!] No se encontró el campo RUT, recargando página...`);
            continue; // Volver al inicio del bucle while
        }

        // --- 2. INGRESO DE CREDENCIALES (Tipeo Humano) ---
        console.log(`[+] Ingresando credenciales simulando teclado humano...`);
        
        // Limpiamos los campos por si el navegador autocompletó algo
        await page.evaluate(() => {
            document.querySelector("#rutcntr").value = '';
            document.querySelector("#clave").value = '';
        });

        // Escribimos el RUT simulando teclas reales
        await page.type('#rutcntr', rut, { delay: 100 });
        
        // Encontramos el DV (suele ser el siguiente input) y lo llenamos
        await page.evaluate((d) => {
            const inputRut = document.querySelector("#rutcntr");
            const todosLosInputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
            const indexRut = todosLosInputs.indexOf(inputRut);
            const inputDV = todosLosInputs[indexRut + 1]; 
            
            if (inputDV && inputDV.id !== 'clave') {
                inputDV.value = d.toUpperCase();
                // Disparamos eventos esenciales para que el frontend del SII registre el cambio
                inputDV.dispatchEvent(new Event('input', { bubbles: true }));
                inputDV.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, dv);

        // Escribimos la clave
        await page.type('#clave', clave, { delay: 100 });

        console.log(`[+] Haciendo clic en Ingresar...`);
        
        // Hacemos clic y esperamos que ocurra la navegación
        await Promise.all([
            page.click("#bt_ingresar"),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => console.log("[!] Timeout en navegación post-clic, verificando estado de todas formas..."))
        ]);

        // --- 3. VERIFICACIÓN DE ESTADO ---
        console.log(`[+] Verificando resultado del login...`);
        
        // Re-verificar si nos mandaron a sala de espera DESPUÉS de hacer clic
        if (page.url().includes('queue-it.net')) {
            console.log(`[⏳] Nos enviaron a sala de espera tras el login. Habrá que esperar...`);
            await pausa(15000);
            continue;
        }

        try {
            const estado = await page.evaluate(() => {
                const txt = document.body.innerText.toLowerCase();
                // Si vemos el nombre, "Mi SII" o el botón de cerrar sesión, entramos.
                if (document.querySelector("#nameCntr") || txt.includes("mi sii") || txt.includes("cerrar sesión")) return "EXITO";
                if (txt.includes("clave incorrecta") || txt.includes("datos incorrectos")) return "ERROR_CLAVE";
                if (txt.includes("código verificador")) return "ERROR_DV";
                if (document.querySelector("#rutcntr")) return "REINTENTO"; 
                return "DESCONOCIDO";
            });

            if (estado === "EXITO") {
                console.log(`[✅] ¡Acceso concedido!`);
                ingresado = true;
            } else if (estado === "ERROR_CLAVE" || estado === "ERROR_DV") {
                throw new Error(`Credenciales inválidas según el SII (${estado}). Revisar RUT y Clave.`);
            } else {
                console.log(`[!] Estado post-login: ${estado}. Posible error temporal del portal, reintentando...`);
                await pausa(3000);
            }
        } catch (e) {
            if (e.message.includes("Credenciales")) throw e; // Si es error de clave, detenemos el proceso
            console.log(`[!] Error al verificar estado, reintentando carga...`);
            await pausa(3000);
        }
    }
}