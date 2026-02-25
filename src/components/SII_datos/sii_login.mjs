import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const LOGIN_URL = "https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi";

export async function iniciarNavegador() {
    return await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--start-maximized', 
            '--disable-blink-features=AutomationControlled'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null
    });
}

export async function loginSII(page, rutCompleto, clave) {
    const [rut, dv] = rutCompleto.split("-");
    
    console.log(`\n[+] Navegando al portal del SII para el RUT: ${rutCompleto}...`);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector("#rutcntr");

    console.log(`[+] Escribiendo credenciales...`);
    await page.type("#rutcntr", rut, { delay: 80 });
    await page.keyboard.type(dv, { delay: 80 });
    await page.type("#clave", clave, { delay: 80 });

    console.log(`[+] Ingresando...`);
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
        page.click("#bt_ingresar")
    ]);

    console.log(`[+] Estabilizando carga...`);
    await new Promise(r => setTimeout(r, 4000));
    
    // Saltar aviso de actualización
    try {
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
            console.log(`[+] Se cerró el aviso de actualización.`);
            await new Promise(r => setTimeout(r, 2000)); 
        }
    } catch (error) {
        // Ignorar
    }
}