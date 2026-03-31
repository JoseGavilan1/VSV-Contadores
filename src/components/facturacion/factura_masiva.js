import puppeteer from 'puppeteer';
import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURACIÓN Y CONSTANTES GLOBALES
// ==========================================
const RUTA_EXCEL = 'C:\\Users\\felip\\OneDrive\\Documentos\\VS\\VSV-Contadores\\src\\components\\facturacion\\CONTABILIDAD 2026 (2).xlsx';
const RUTA_LOG = './facturas_emitidas_nombres_log.txt'; 
const URL_EMISION = 'https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=33&TIPO=4';
const URL_INICIO_SII = 'https://homer.sii.cl/';
const TEL_EMISOR = '56920134015';

if (!fs.existsSync(RUTA_LOG)) fs.writeFileSync(RUTA_LOG, '');
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// ==========================================
// MÓDULO DE AUDITORÍA Y FILTRADO
// ==========================================
function auditarYObtenerPendientes() {
    console.log('\n==================================================');
    console.log('[INFO] AUDITORÍA: Filtrando empresas pendientes...');
    const workbook = readFile(RUTA_EXCEL);
    const registros = utils.sheet_to_json(workbook.Sheets['MARZO']);
    const logText = fs.readFileSync(RUTA_LOG, 'utf-8').toUpperCase();
    const logLineas = logText.split('\n');
    
    const rutsEmitidosSII = [
        '77493132', '77583495', '78217204', '78119769', '78097527', 
        '78112284', '78109295', '78109223', '77902854', '78194318', 
        '78064752', '77139803', '78054419', '77951107', '78071957', 
        '77944164', '77937684', '77849617', '77753277', '78064268', 
        '77924326', '77087108', '77891881', '77994026', '78000714', 
        '77983326', '77961583', '77984639', '78016722', '77852939', 
        '77877135', '77955178', '65191713', '77336372', '77854265', 
        '77862673', '77149046', '77904639', '77835246', '77782757', 
        '77758342', '77877135', '76916588', '78216688', '77847561',
        '78198808', '78151033', '78184026', '78203384', '78137171', 
        '77756586', '77992106', '77852913', '77756574', '77938492', 
        '78033074', '19087425', '78155728', '77839119', '78142901', 
        '78020281', '78044219', '78123097', '77937906', '78133285',
        '78076436', '77901312', '78093448', '78113009', '77871935',
        '78056692' // Éxito JL MONTERO
    ];

    const pendientes = [];
    registros.forEach((fila) => {
        const razon = (fila['RAZON SOCIAL'] || '').toString().toUpperCase().trim();
        const rutLimpio = (fila['RUT'] || '').toString().replace(/[^0-9kK]/g, '').toUpperCase();
        if (!razon || rutLimpio.length < 7) return; 

        const rutCuerpo = rutLimpio.slice(0, -1);
        const rutDv = rutLimpio.slice(-1);
        const esValido = (fila['PAGO SERVICIO'] || '').toString().toUpperCase().includes('PAGADO');
        const emitidoEnLog = logLineas.some(linea => linea.includes(rutCuerpo) && !linea.includes('ERROR'));

        if (!rutsEmitidosSII.includes(rutCuerpo) && !emitidoEnLog && esValido && !razon.includes('HAMABU')) {
            pendientes.push({
                razon, rut: rutCuerpo, dv: rutDv,
                correo: (fila['CORREO'] || '').toString().trim(),
                neto: (fila['NETO'] || '0').toString().replace(/[^0-9]/g, ''),
                plan: fila['PLAN CONTABLE'] || 'GO'
            });
        }
    });
    return pendientes;
}

// ==========================================
// MOTOR DE FACTURACIÓN (SESIÓN PERMANENTE)
// ==========================================
(async () => {
    const pendientes = auditarYObtenerPendientes();
    if (pendientes.length === 0) return console.log('\n[INFO] Todo procesado.');

    const browser = await puppeteer.launch({ 
        headless: false, defaultViewport: null, 
        args: ['--start-maximized', '--disable-blink-features=AutomationControlled'] 
    });

    const page = (await browser.pages())[0];
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    page.on('dialog', async d => await d.accept());

    for (let i = 0; i < pendientes.length; i++) {
        const f = pendientes[i];
        console.log(`\n==================================================`);
        console.log(`[INFO] Facturando: ${f.razon} (${i + 1}/${pendientes.length})`);

        try {
            await page.goto('about:blank');
            await delay(1000);
            await page.goto(URL_INICIO_SII, { waitUntil: 'domcontentloaded' });
            await page.goto(URL_EMISION, { waitUntil: 'networkidle2', timeout: 60000 });

            // Login solo si es necesario
            if (await page.$('#rutcntr')) {
                await page.type('#rutcntr', `${process.env.DTE_RUT}-${process.env.DTE_DV}`, { delay: 110 });
                await page.type('#clave', process.env.DTE_PASS, { delay: 110 });
                await Promise.all([page.waitForNavigation(), page.click('#bt_ingresar')]);
                if (await page.$('select[name="RUT_EMP"]')) {
                    await page.select('select[name="RUT_EMP"]', '78306207-0');
                    await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
                    await page.goto(URL_EMISION);
                }
            }

            await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true });
            await delay(2000);

            // Rellenar RUT
            await page.click('#EFXP_RUT_RECEP');
            await page.type('#EFXP_RUT_RECEP', f.rut, { delay: 130 });
            await page.type('#EFXP_DV_RECEP', f.dv, { delay: 150 });
            await page.keyboard.press('Tab');
            await delay(5000); 

            // 🔥 LIMPIEZA DE CAMPOS PARA EVITAR SANTIAGOSANTIAGO
            const limpiarYTipar = async (selector, texto) => {
                await page.click(selector, { clickCount: 3 });
                await page.keyboard.press('Backspace');
                await page.type(selector, texto, { delay: 110 });
            };

            await limpiarYTipar('input[name="EFXP_CIUDAD_ORIGEN"]', 'Santiago');
            await limpiarYTipar('input[name="EFXP_FONO_EMISOR"]', TEL_EMISOR);
            await limpiarYTipar('input[name="EFXP_CIUDAD_RECEP"]', 'Santiago');
            
            if(f.correo) {
                await limpiarYTipar('input[name="EFXP_CONTACTO"]', f.correo);
            }

            // Datos del Producto
            await page.click('input[name="EFXP_NMB_01"]');
            await page.type('input[name="EFXP_NMB_01"]', `Plan ${f.plan}`, { delay: 120 });
            await page.type('input[name="EFXP_QTY_01"]', '1', { delay: 140 });
            
            await page.click('input[name="EFXP_PRC_01"]', { clickCount: 3 });
            await page.type('input[name="EFXP_PRC_01"]', f.neto, { delay: 100 });

            // 🔥 ACTIVAR DESCRIPCIÓN (Checkbox)
            console.log('[INFO] Activando descripción...');
            await page.click('input[name="DESCRIP_01"]'); 
            await delay(3000); 
            
            await page.waitForSelector('textarea[name="EFXP_DSC_ITEM_01"]', { visible: true });
            await page.type('textarea[name="EFXP_DSC_ITEM_01"]', 'Marzo', { delay: 140 });
            
            await page.select('select[name="EFXP_FMA_PAGO"]', '1');
            await delay(2000);

            // Finalización
            await page.click('button[name="Button_Update"]');
            await delay(5000);
            await page.click('input[name="btnSign"]');
            await delay(3000);

            await page.waitForSelector('#myPass', { visible: true });
            await page.type('#myPass', process.env.SII_PFX_PASS, { delay: 140 }); 
            await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(()=>{}), page.click('#btnFirma')]);

            // Captura de Folio
            let folio = null;
            for (let j = 0; j < 60; j++) {
                const text = await page.evaluate(() => document.body.innerText).catch(() => "");
                const match = text.match(/N[°º]\s*(\d+)/i) || text.match(/Folio\s*(\d+)/i);
                if (match) { folio = match[1]; break; }
                await delay(1000);
            }

            if (folio) {
                fs.appendFileSync(RUTA_LOG, `${f.rut} - Folio: ${folio}\n`); 
                console.log(`[ÉXITO] Folio: ${folio}`);
            } else {
                fs.appendFileSync(RUTA_LOG, `ERROR_VERIFICAR: ${f.rut} - ${f.razon}\n`);
            }

        } catch (e) {
            console.log(`[ERROR] Falla: ${e.message}`);
            fs.appendFileSync(RUTA_LOG, `FALLO: ${f.rut} - ${f.razon}\n`);
        }
        
        console.log('[INFO] Pausa humana de 20 segundos...');
        await delay(20000);
    }
    
    console.log('\n[INFO] Fin.');
    await browser.close();
})();