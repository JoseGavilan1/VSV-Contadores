import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Activar el modo indetectable para saltar el firewall F5 del SII
puppeteer.use(StealthPlugin());

const LOGIN_URL = "https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi";

// Inicia el navegador con configuraciones para parecer un humano real
export async function iniciarNavegador() {
    return await puppeteer.launch({
        headless: false,
        executablePath: 'C://Program Files//Google//Chrome//Application//chrome.exe',
        args: [
            '--start-maximized', 
            '--disable-blink-features=AutomationControlled'
        ],
        ignoreDefaultArgs: ['--enable-automation'], // Oculta el cartel superior de Chrome
        defaultViewport: null
    });
}

// Lógica pura de inicio de sesión
export async function loginSII(page, rutCompleto, clave) {
    const [rut, dv] = rutCompleto.split("-");
    
    console.log(`\n[+] Navegando al portal del SII para el RUT: ${rutCompleto}...`);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
    
    // Esperar a que el campo de RUT exista en la página
    await page.waitForSelector("#rutcntr");

    console.log(`[+] Escribiendo credenciales simulando tipeo humano...`);
    await page.type("#rutcntr", rut, { delay: 80 });
    await page.keyboard.type(dv, { delay: 80 });
    await page.type("#clave", clave, { delay: 80 });

    console.log(`[+] Presionando botón de ingreso y esperando respuesta...`);
    
    // Hacemos clic y esperamos a que la página termine de cargar
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
        page.click("#bt_ingresar")
    ]);

    // Pausa estratégica para dejar que el SII termine sus redirecciones internas
    console.log(`[+] Esperando a que el portal interno estabilice la carga...`);
    await new Promise(r => setTimeout(r, 4000));
    
    // --- INICIO: SALTAR AVISO DE ACTUALIZACIÓN ---
    try {
        console.log(`[+] Verificando si aparece el aviso de actualización de datos...`);
        
        // Buscamos cualquier botón o enlace que contenga el texto "más tarde"
        const cerroAviso = await page.evaluate(() => {
            const botones = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const botonMasTarde = botones.find(b => 
                b.textContent.toLowerCase().includes('más tarde') || 
                b.value?.toLowerCase().includes('más tarde')
            );
            
            if (botonMasTarde) {
                botonMasTarde.click();
                return true;
            }
            return false;
        });

        if (cerroAviso) {
            console.log(`[+] ¡Aviso detectado! Se hizo clic en "Actualizar más tarde".`);
            // Le damos 2 segunditos para que la página procese el clic y cierre la ventana
            await new Promise(r => setTimeout(r, 2000)); 
        } else {
            console.log(`[+] No apareció el aviso. Todo despejado.`);
        }
    } catch (error) {
        // Si falla por cualquier cosa, lo ignoramos y seguimos
        console.log(`[+] No se encontró el aviso o hubo un error al cerrarlo. Continuamos...`);
    }
    // --- FIN: SALTAR AVISO DE ACTUALIZACIÓN ---

    console.log(`[+] ¡Proceso de login finalizado!`);
}