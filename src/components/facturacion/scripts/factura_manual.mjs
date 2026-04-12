import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

// Helper para pausas exactas
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function navegarAEmision(page) {
    let exito = false;
    let intentos = 0;
    while (!exito && intentos < 5) {
        try {
            await page.goto('https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=33&TIPO=4', { 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });
            exito = true; 
        } catch (error) {
            intentos++;
            await delay(3000);
        }
    }
    if (!exito) throw new Error('No se pudo acceder al portal del SII.');
}

// 🚀 Exportamos la función para que el servidor (Express) pueda usarla
export async function emitirFacturaPuppeteer(datos) {
    const browser = await puppeteer.launch({ 
        headless: true, // DEBE SER TRUE EN LA NUBE
        defaultViewport: null, 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--start-maximized', 
            '--disable-blink-features=AutomationControlled'
        ] 
    });

    const page = await browser.newPage();
    
    try {
        console.log('>>> Iniciando proceso de facturación vía Web (Escritura Humana)...');
        await navegarAEmision(page);

        // ==========================================
        // 1. LOGIN CON TIEMPOS DE ESPERA
        // ==========================================
        const inputRutExiste = await page.$('#rutcntr');
        if (inputRutExiste) {
            await page.type('#rutcntr', `${process.env.DTE_RUT}-${process.env.DTE_DV}`, { delay: 150 });
            await page.type('#clave', process.env.DTE_PASS, { delay: 150 });
            await Promise.all([page.waitForNavigation(), page.click('#bt_ingresar')]);
            
            await delay(2000); // Pausa post-login

            if (await page.$('select[name="RUT_EMP"]')) {
                await page.waitForSelector('select[name="RUT_EMP"]');
                await page.select('select[name="RUT_EMP"]', '78306207-0');
                await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
            }
        }

        // ==========================================
        // 2. EMISIÓN CON PAUSAS DE SEGURIDAD
        // ==========================================
        await navegarAEmision(page);
        await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true, timeout: 45000 });
        await delay(2000); // Dar respiro al DOM

        await page.click('#EFXP_RUT_RECEP');
        await page.type('#EFXP_RUT_RECEP', datos.rutReceptor, { delay: 150 });
        await page.type('#EFXP_DV_RECEP', datos.dvReceptor, { delay: 150 });
        await page.keyboard.press('Tab');
        
        // 🚨 PAUSA CRÍTICA: Esperar que el SII cargue la Razón Social automáticamente
        console.log('>>> Esperando respuesta del servidor SII (7.5s)...');
        await delay(7500); 

        // Función auxiliar para borrar y escribir a velocidad humana
        const limpiarYTipar = async (selector, texto) => {
            await page.waitForSelector(selector, { visible: true });
            await page.click(selector, { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type(selector, texto, { delay: 150 });
        };

        await limpiarYTipar('input[name="EFXP_CIUDAD_ORIGEN"]', datos.ciudadEmisor);
        await limpiarYTipar('input[name="EFXP_FONO_EMISOR"]', datos.telefonoEmisor);
        await limpiarYTipar('input[name="EFXP_CIUDAD_RECEP"]', datos.ciudadReceptor);
        if (datos.contactoReceptor) {
            await limpiarYTipar('input[name="EFXP_CONTACTO"]', datos.contactoReceptor);
        }
        
        if (datos.rutSolicita && datos.dvSolicita) {
            await limpiarYTipar('input[name="EFXP_RUT_SOLICITA"]', datos.rutSolicita);
            await limpiarYTipar('input[name="EFXP_DV_SOLICITA"]', datos.dvSolicita);
        }

        await page.type('input[name="EFXP_NMB_01"]', datos.producto.nombre, { delay: 150 });
        await page.type('input[name="EFXP_QTY_01"]', datos.producto.cantidad, { delay: 150 });
        await page.type('input[name="EFXP_UNMD_01"]', datos.producto.unidad, { delay: 150 });
        
        await page.click('input[name="EFXP_PRC_01"]', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('input[name="EFXP_PRC_01"]', datos.producto.precio, { delay: 150 });
        
        // 🚨 CONTROL DE DESCRIPCIÓN REBELDE
        const checkbox = await page.waitForSelector('input[name="DESCRIP_01"]', { visible: true });
        await checkbox.click(); 
        
        try {
            await page.waitForSelector('textarea[name="EFXP_DSC_ITEM_01"]', { visible: true, timeout: 7000 });
        } catch (e) {
            console.log('>>> El cuadro de descripción no cargó. Reintentando clic...');
            await checkbox.click(); 
            await page.waitForSelector('textarea[name="EFXP_DSC_ITEM_01"]', { visible: true, timeout: 7000 });
        }

        await page.type('textarea[name="EFXP_DSC_ITEM_01"]', datos.producto.descripcion, { delay: 150 });
        await page.select('select[name="EFXP_FMA_PAGO"]', '1');

        // ==========================================
        // 3. FIRMA Y CAPTURA (LOOP DE ESPERA)
        // ==========================================
        await page.click('button[name="Button_Update"]');
        await delay(6000); // 🚨 PAUSA CRÍTICA: Esperar validación del total
        
        await page.click('input[name="btnSign"]');
        await delay(4000); // 🚨 PAUSA CRÍTICA: Esperar que cargue el Java de la firma

        await page.waitForSelector('#myPass', { visible: true });
        await page.type('#myPass', process.env.SII_PFX_PASS, { delay: 150 });
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
            page.click('#btnFirma')
        ]);

        // Loop seguro de búsqueda de Folio (Para cuando el SII tarda en generar el PDF)
        let folio = null;
        for (let j = 0; j < 60; j++) {
            const text = await page.evaluate(() => document.body.innerText).catch(() => "");
            const match = text.match(/N[°º]\s*(\d+)/i) || text.match(/Folio\s*(\d+)/i);
            if (match) { 
                folio = match[1]; 
                break; 
            }
            await delay(1000);
        }
        
        if (!folio) throw new Error("No se pudo obtener el folio de la pantalla final.");
        
        console.log(`✅ Éxito: Folio ${folio}`);

        // 4. CIERRE DE SESIÓN
        console.log('>>> Cerrando sesión...');
        try { 
            await page.goto('https://misiir.sii.cl/cgi_misii/siu/cgi_misii_logout', { waitUntil: 'networkidle2' }); 
            await delay(2000);
        } catch (e) {}

        // Retornamos los datos al controlador
        return { ok: true, folio: folio, fileName: `Factura_${folio}.pdf` };
        
    } catch (error) {
        console.error('❌ Error en Puppeteer:', error.message);
        throw new Error(error.message);
    } finally {
        await browser.close();
    }
}