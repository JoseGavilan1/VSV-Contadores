import puppeteer from 'puppeteer';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// ==========================================
// CONFIGURACIÓN Y CONSTANTES GLOBALES
// ==========================================
// Guardamos el log en la raíz del proyecto para mantener el historial intacto
const RUTA_LOG = path.join(process.cwd(), 'facturas_emitidas_nombres_log.txt'); 
const URL_EMISION = 'https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=33&TIPO=4';
const URL_INICIO_SII = 'https://homer.sii.cl/';
const URL_LOGOUT = 'https://mpe.sii.cl/auth/logout';
const TEL_EMISOR = '56920134015';

if (!fs.existsSync(RUTA_LOG)) fs.writeFileSync(RUTA_LOG, '');
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// ==========================================
// MOTOR DE FACTURACIÓN (PESO PESADO INTEGRADO)
// ==========================================
export async function emitirLotePuppeteer(facturasFront) {
    console.log('\n==================================================');
    console.log('[INFO] AUDITORÍA: Filtrando empresas enviadas desde la Web...');
    
    const logText = fs.readFileSync(RUTA_LOG, 'utf-8').toUpperCase();
    const logLineas = logText.split('\n');
    
    // LISTA ACTUALIZADA AL FOLIO 857 (30 de Marzo 2026)
    const rutsEmitidosSII = [
    ];

    const pendientes = [];
    
    // Filtrado adaptado para el JSON que viene desde React
    facturasFront.forEach((f) => {
        const rutCuerpo = f.rutReceptor;
        const nombrePlan = (f.producto.nombre || '').toUpperCase();
        const emitidoEnLog = logLineas.some(linea => linea.includes(rutCuerpo) && !linea.includes('FALLO') && !linea.includes('ERROR'));
        const esExclusion = nombrePlan.includes('HAMABU') || nombrePlan.includes('ANITA MARIA VEAS');

        if (!rutsEmitidosSII.includes(rutCuerpo) && !emitidoEnLog && !esExclusion) {
            pendientes.push(f);
        } else {
            console.log(`[SALTADO] RUT ${rutCuerpo} ya emitido en SII, log o excluido.`);
        }
    });

    if (pendientes.length === 0) {
        console.log('\n[INFO] Todo procesado en el SII. No hay pendientes.');
        return { ok: true, mensaje: "No hay facturas pendientes por procesar.", detalle: [] };
    }

    console.log(`\n[INFO] Iniciando para ${pendientes.length} empresas (Escritura Humana Lenta)...`);

    const browser = await puppeteer.launch({ 
        headless: false, defaultViewport: null, 
        args: ['--start-maximized', '--disable-blink-features=AutomationControlled'] 
    });

    const page = (await browser.pages())[0];
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    page.on('dialog', async d => await d.accept());

    const resultados = [];

    for (let i = 0; i < pendientes.length; i++) {
        const f = pendientes[i];
        console.log(`\n==================================================`);
        console.log(`[INFO] Facturando: RUT ${f.rutReceptor} (${i + 1}/${pendientes.length})`);

        try {
            await page.goto(URL_INICIO_SII, { waitUntil: 'domcontentloaded' });
            await delay(2000);
            await page.goto(URL_EMISION, { waitUntil: 'networkidle2', timeout: 60000 });

            if (await page.$('#rutcntr')) {
                await page.type('#rutcntr', `${process.env.DTE_RUT}-${process.env.DTE_DV}`, { delay: 150 });
                await page.type('#clave', process.env.DTE_PASS, { delay: 150 });
                await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('#bt_ingresar')]);
                
                if (await page.$('select[name="RUT_EMP"]')) {
                    await page.select('select[name="RUT_EMP"]', '78306207-0');
                    await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
                    await page.goto(URL_EMISION, { waitUntil: 'networkidle2' });
                }
            }

            await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true, timeout: 45000 });
            await delay(2000);

            await page.click('#EFXP_RUT_RECEP');
            await page.type('#EFXP_RUT_RECEP', f.rutReceptor, { delay: 150 });
            await page.type('#EFXP_DV_RECEP', f.dvReceptor, { delay: 150 });
            await page.keyboard.press('Tab');
            await delay(7500); 

            const limpiarYTipar = async (selector, texto) => {
                await page.waitForSelector(selector, { visible: true });
                await page.click(selector, { clickCount: 3 });
                await page.keyboard.press('Backspace');
                await page.type(selector, texto, { delay: 130 });
            };

            await limpiarYTipar('input[name="EFXP_CIUDAD_ORIGEN"]', 'Santiago');
            await limpiarYTipar('input[name="EFXP_FONO_EMISOR"]', TEL_EMISOR);
            await limpiarYTipar('input[name="EFXP_CIUDAD_RECEP"]', 'Santiago');
            if(f.contactoReceptor) await limpiarYTipar('input[name="EFXP_CONTACTO"]', f.contactoReceptor);

            await page.type('input[name="EFXP_NMB_01"]', f.producto.nombre, { delay: 150 });
            await page.type('input[name="EFXP_QTY_01"]', '1', { delay: 150 });
            await page.click('input[name="EFXP_PRC_01"]', { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type('input[name="EFXP_PRC_01"]', f.producto.precio, { delay: 150 });

            console.log('[INFO] Activando descripción...');
            const checkbox = await page.waitForSelector('input[name="DESCRIP_01"]', { visible: true });
            await checkbox.click(); 
            
            try {
                await page.waitForSelector('textarea[name="EFXP_DSC_ITEM_01"]', { visible: true, timeout: 7000 });
            } catch (e) {
                console.log('[REINTENTO] El cuadro no cargó. Re-clic...');
                await checkbox.click(); 
                await page.waitForSelector('textarea[name="EFXP_DSC_ITEM_01"]', { visible: true, timeout: 7000 });
            }

            // Aquí pasamos la descripción dinámica (ej. "Marzo")
            await page.type('textarea[name="EFXP_DSC_ITEM_01"]', f.producto.descripcion, { delay: 150 });
            await page.select('select[name="EFXP_FMA_PAGO"]', '1');

            await page.click('button[name="Button_Update"]');
            await delay(6000);
            await page.click('input[name="btnSign"]');
            await delay(4000);

            await page.waitForSelector('#myPass', { visible: true });
            await page.type('#myPass', process.env.SII_PFX_PASS, { delay: 150 }); 
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
                page.click('#btnFirma')
            ]);

            let folio = null;
            for (let j = 0; j < 60; j++) {
                const text = await page.evaluate(() => document.body.innerText).catch(() => "");
                const match = text.match(/N[°º]\s*(\d+)/i) || text.match(/Folio\s*(\d+)/i);
                if (match) { folio = match[1]; break; }
                await delay(1000);
            }

            if (folio) {
                fs.appendFileSync(RUTA_LOG, `${f.rutReceptor} - Folio: ${folio}\n`); 
                console.log(`[ÉXITO] Folio: ${folio}`);
                resultados.push({ rut: f.rutReceptor, estado: 'exito', folio: folio });
            } else {
                fs.appendFileSync(RUTA_LOG, `ERROR_VERIFICAR: ${f.rutReceptor} - ${f.producto.nombre}\n`);
                resultados.push({ rut: f.rutReceptor, estado: 'error', error: 'No se obtuvo folio de pantalla' });
            }

        } catch (e) {
            console.log(`[ERROR] Falla en ${f.rutReceptor}: ${e.message}`);
            fs.appendFileSync(RUTA_LOG, `FALLO: ${f.rutReceptor} - ${f.producto.nombre}\n`);
            resultados.push({ rut: f.rutReceptor, estado: 'error', error: e.message });
        }
        
        // La pausa de seguridad solo se hace si NO es el último elemento
        if (i < pendientes.length - 1) {
            console.log('[INFO] Pausa de seguridad de 30 segundos...');
            await delay(30000);
        }
    }
    
    console.log('\n[INFO] Cerrando sesión y navegador...');
    try { await page.goto(URL_LOGOUT, { waitUntil: 'networkidle2' }); await delay(2000); } catch (err) {}
    await browser.close();

    return { ok: true, mensaje: "Lote procesado", detalle: resultados };
}