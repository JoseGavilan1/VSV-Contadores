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
const URL_LOGOUT = 'https://mpe.sii.cl/auth/logout';
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
    
    // LISTA ACTUALIZADA AL FOLIO 857 (30 de Marzo 2026)
    const rutsEmitidosSII = [
        '78288354', '77953827', '78116703', '78300694', '78305639', '78128622', '77787781', '78228538', 
        '77119822', '78093448', '78142901', '76916588', '78271993', '78221159', '77805707', '78248387', 
        '78229656', '78226429', '78074297', '78209664', '76587522', '78165722', '78056692', '77871935', 
        '78113009', '77901312', '78076436', '78133285', '77937906', '78123097', '78044219', '78020281', 
        '77839119', '78155728', '19087425', '78033074', '77938492', '77756574', '77852913', '77992106', 
        '77756586', '78137171', '78203384', '78184026', '78151033', '78198808', '77847561', '78216688', 
        '77583495', '77493132', '77139803', '78217204', '78119769', '78097527', '78112284', '78109295', 
        '78109223', '77902854', '78194318', '78064752', '78054419', '77951107', '78071957', '77944164', 
        '77937684', '77849617', '77753277', '78064268', '77924326', '77087108', '77891881', '77994026', 
        '78000714', '77983326', '77961583', '77984639', '78016722', '77852939', '77877135', '77955178', 
        '65191713', '77336372', '77854265', '77862673', '77149046', '77904639', '77835246', '77782757', 
        '77758342', '56024480', '77970864', '5778534', '78221287'
    ];

    const pendientes = [];
    registros.forEach((fila) => {
        const razon = (fila['RAZON SOCIAL'] || '').toString().toUpperCase().trim();
        const rutLimpio = (fila['RUT'] || '').toString().replace(/[^0-9kK]/g, '').toUpperCase();
        if (!razon || rutLimpio.length < 7) return; 

        const rutCuerpo = rutLimpio.slice(0, -1);
        const rutDv = rutLimpio.slice(-1);
        const esValido = (fila['PAGO SERVICIO'] || '').toString().toUpperCase().includes('PAGADO');
        const emitidoEnLog = logLineas.some(linea => linea.includes(rutCuerpo) && !linea.includes('FALLO') && !linea.includes('ERROR'));

        const esExclusion = razon.includes('HAMABU') || razon.includes('ANITA MARIA VEAS');

        if (!rutsEmitidosSII.includes(rutCuerpo) && !emitidoEnLog && esValido && !esExclusion) {
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
// MOTOR DE FACTURACIÓN (PESO PESADO)
// ==========================================
(async () => {
    const pendientes = auditarYObtenerPendientes();
    if (pendientes.length === 0) return console.log('\n[INFO] Todo procesado en el SII.');

    console.log(`\n[INFO] Iniciando para ${pendientes.length} empresas (Escritura Humana Lenta)...`);

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
            await page.type('#EFXP_RUT_RECEP', f.rut, { delay: 150 });
            await page.type('#EFXP_DV_RECEP', f.dv, { delay: 150 });
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
            if(f.correo) await limpiarYTipar('input[name="EFXP_CONTACTO"]', f.correo);

            await page.type('input[name="EFXP_NMB_01"]', `Plan ${f.plan}`, { delay: 150 });
            await page.type('input[name="EFXP_QTY_01"]', '1', { delay: 150 });
            await page.click('input[name="EFXP_PRC_01"]', { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type('input[name="EFXP_PRC_01"]', f.neto, { delay: 150 });

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

            await page.type('textarea[name="EFXP_DSC_ITEM_01"]', 'Marzo', { delay: 150 });
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
                fs.appendFileSync(RUTA_LOG, `${f.rut} - Folio: ${folio}\n`); 
                console.log(`[ÉXITO] Folio: ${folio}`);
            } else {
                fs.appendFileSync(RUTA_LOG, `ERROR_VERIFICAR: ${f.rut} - ${f.razon}\n`);
            }

        } catch (e) {
            console.log(`[ERROR] Falla en ${f.razon}: ${e.message}`);
            fs.appendFileSync(RUTA_LOG, `FALLO: ${f.rut} - ${f.razon}\n`);
        }
        
        console.log('[INFO] Pausa de seguridad de 30 segundos...');
        await delay(30000);
    }
    
    console.log('\n[INFO] Cerrando sesión y navegador...');
    try { await page.goto(URL_LOGOUT, { waitUntil: 'networkidle2' }); await delay(2000); } catch (err) {}
    await browser.close();
})();