import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function iniciarNavegador() {
    return await puppeteer.launch({
        headless: false, // Puedes cambiar a 'new' como en tu index.js si quieres que sea invisible
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        args: [
            '--start-maximized',
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process', // Optimiza memoria como en tu modelo
            '--disable-blink-features=AutomationControlled'
        ],
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation']
    });
}

// 🛡️ Destructor de Pop-ups intrusivos (Extraído de tu modelo)
export async function matarPopups(page) {
    try {
        await page.evaluate(() => {
            const modales = document.querySelectorAll('.modal-content, .modal-dialog, .ui-dialog');
            for (const m of modales) {
                if (m.innerText.toUpperCase().includes('ACTUALIZAR MÁS TARDE')) {
                    const btnAct = Array.from(m.querySelectorAll('button')).find(b => b.innerText.toUpperCase().includes('ACTUALIZAR MÁS TARDE'));
                    if (btnAct) btnAct.click();
                }
                const btnCerrar = Array.from(m.querySelectorAll('button')).find(b => b.innerText.toUpperCase().includes('CERRAR'));
                if (btnCerrar) btnCerrar.click();
            }
        });
        await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}
}

export async function loginSII(page, rutCompleto, clave) {
    const rutLimpio = rutCompleto.replace(/-/g, '');
    
    // ⚡ BLOQUEADOR DE BASURA (Adaptado de tu index.js)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const resourceType = req.resourceType();
        // Bloqueamos imágenes y fuentes, pero dejamos 'stylesheet' para que no se vea mal
        if (['image', 'font', 'media'].includes(resourceType)) req.abort();
        else req.continue();
    });

    console.log(`\n🔑 [1/4] Iniciando sesión en el SII...`);
    await page.goto("https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi", { waitUntil: 'domcontentloaded' });

    await page.waitForSelector("#rutcntr");
    await page.type('#rutcntr', rutLimpio);
    await page.keyboard.press('Tab');
    await page.type('#clave', clave);
    
    await new Promise(r => setTimeout(r, 1500)); 

    await Promise.all([
        page.click("#bt_ingresar"),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {})
    ]);
    
    await matarPopups(page);
}

// 🚪 Cierre de sesión (Extraído de tu modelo)
export async function cerrarSesion(page) {
    console.log("\n🚪 [4/4] Tareas finalizadas. Cerrando sesión...");
    try {
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.toLowerCase().includes('cerrar sesi'));
            if (btn) btn.click();
            else window.location.href = 'https://misiir.sii.cl/cgi_misii/siihome.cgi?fin';
        });
        await new Promise(r => setTimeout(r, 3000));
    } catch (e) {}
}