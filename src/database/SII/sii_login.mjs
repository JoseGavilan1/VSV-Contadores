import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const pausa = (ms) => new Promise(res => setTimeout(res, ms));

export async function iniciarNavegador() {
    return await puppeteer.launch({
        headless: false,
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
        await page.goto("https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi", { waitUntil: 'domcontentloaded' });

        let enSalaDeEspera = true;
        while (enSalaDeEspera) {
            const url = page.url();
            const contenido = await page.content();
            if (url.includes('queue-it.net') || contenido.toLowerCase().includes('sala de espera')) {
                console.log(`[⏳] En sala de espera. Aguardando 15 segundos...`);
                await pausa(15000);
            } else {
                enSalaDeEspera = false;
            }
        }

        try { await page.waitForSelector("#rutcntr", { timeout: 15000, visible: true }); } 
        catch (e) { continue; }

        console.log(`[+] Ingresando credenciales simulando teclado humano...`);
        await page.evaluate(() => { document.querySelector("#rutcntr").value = ''; document.querySelector("#clave").value = ''; });
        
        await page.type('#rutcntr', rut, { delay: 100 });
        
        await page.evaluate((d) => {
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
            const inputDV = inputs[inputs.indexOf(document.querySelector("#rutcntr")) + 1]; 
            if (inputDV && inputDV.id !== 'clave') {
                inputDV.value = d.toUpperCase();
                inputDV.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, dv);

        await page.type('#clave', clave, { delay: 100 });
        console.log(`[+] Haciendo clic en Ingresar...`);
        
        await Promise.all([
            page.click("#bt_ingresar"),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
        ]);

        if (page.url().includes('queue-it.net')) {
            console.log(`[⏳] Cola post-login. Aguardando...`);
            await pausa(15000); continue;
        }

        try {
            const estado = await page.evaluate(() => {
                const txt = document.body.innerText.toLowerCase();
                if (document.querySelector("#nameCntr") || txt.includes("mi sii") || txt.includes("cerrar sesión")) return "EXITO";
                if (txt.includes("clave incorrecta") || txt.includes("datos incorrectos")) return "ERROR_CLAVE";
                if (document.querySelector("#rutcntr")) return "REINTENTO"; 
                return "DESCONOCIDO";
            });

            if (estado === "EXITO") ingresado = true;
            else if (estado === "ERROR_CLAVE") throw new Error("Credenciales inválidas.");
            else await pausa(3000);
        } catch (e) {
            if (e.message.includes("Credenciales")) throw e;
            await pausa(3000);
        }
    }
}