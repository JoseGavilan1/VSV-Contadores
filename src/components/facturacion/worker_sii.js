import puppeteer from 'puppeteer';

const URL_EMISION = 'https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=33&TIPO=4';
const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function emitirFacturaUnica(f, credenciales) {
    let browser = null;

    try {
        browser = await puppeteer.launch({ 
            headless: false, 
            defaultViewport: null, 
            args: ['--start-maximized', '--disable-blink-features=AutomationControlled', '--ignore-certificate-errors'] 
        });

        const pages = await browser.pages();
        const page = pages[0];
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        page.on('dialog', async d => { await d.accept().catch(() => {}); });

        await page.goto(URL_EMISION, { waitUntil: 'domcontentloaded', timeout: 35000 });

        // LOGIN
        const necesitaLogin = await page.$('#rutcntr').catch(() => null);
        if (necesitaLogin) {
            await page.type('#rutcntr', `${credenciales.rut}-${credenciales.dv}`);
            await page.type('#clave', credenciales.pass);
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
                page.click('#bt_ingresar')
            ]);

            const selectPresente = await page.$('select[name="RUT_EMP"]').catch(() => null);
            if (selectPresente) {
                await page.select('select[name="RUT_EMP"]', '78306207-0');
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
                    page.click('button[type="submit"]')
                ]);
                await page.goto(URL_EMISION, { waitUntil: 'domcontentloaded' });
            }
        }

        // LLENADO DEL FORMULARIO
        await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true, timeout: 15000 });
        await page.click('#EFXP_RUT_RECEP', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('#EFXP_RUT_RECEP', f.rut);
        await page.type('#EFXP_DV_RECEP', f.dv);
        await page.keyboard.press('Tab');
        
        await delay(3000); 

        await page.evaluate((tel, correo) => {
            document.querySelector('input[name="EFXP_CIUDAD_ORIGEN"]').value = 'Santiago';
            document.querySelector('input[name="EFXP_FONO_EMISOR"]').value = tel;
            document.querySelector('input[name="EFXP_CIUDAD_RECEP"]').value = 'Santiago';
            if(correo) document.querySelector('input[name="EFXP_CONTACTO"]').value = correo;
        }, credenciales.telefono, f.correo);

        await page.type('input[name="EFXP_NMB_01"]', `Plan ${f.plan}`);
        await page.type('input[name="EFXP_QTY_01"]', '1');
        await page.type('input[name="EFXP_UNMD_01"]', '1');
        
        await page.click('input[name="EFXP_PRC_01"]', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('input[name="EFXP_PRC_01"]', f.neto);
        
        await page.click('input[name="DESCRIP_01"]');
        await page.type('textarea[name="EFXP_DSC_ITEM_01"]', 'Marzo');
        await page.select('select[name="EFXP_FMA_PAGO"]', '1');

        await page.click('button[name="Button_Update"]');
        await delay(2000); 

        await page.click('input[name="btnSign"]');
        await delay(1500); 

        // FIRMA
        await page.waitForSelector('#myPass', { visible: true, timeout: 15000 });
        await page.type('#myPass', credenciales.pfx); 
        
        await Promise.all([
            page.click('#btnFirma'),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
        ]);

        // 🔥 OBLIGATORIO: Se esperan 35 segundos para leer el folio. NO REDUCIR.
        let folio = null;
        for (let i = 0; i < 35; i++) {
            const textoPantalla = await page.evaluate(() => document.body.innerText).catch(() => "");
            const match = textoPantalla.match(/N[°º]\s*(\d+)/i) || textoPantalla.match(/Folio\s*(\d+)/i);
            if (match) {
                folio = match[1];
                break;
            }
            await delay(1000); 
        }

        if (folio) {
            return { exito: true, folio: folio };
        } else {
            return { exito: false, error: "Timeout: El SII tardó más de 35 segundos en responder." };
        }

    } catch (e) {
        return { exito: false, error: e.message };
    } finally {
        if (browser) {
            await browser.close().catch(() => {}); // Cierra Chrome completamente al final
        }
    }
}