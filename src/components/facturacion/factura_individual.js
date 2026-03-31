import puppeteer from 'puppeteer';
import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const RUTA_EXCEL = 'C:\\Users\\felip\\OneDrive\\Documentos\\VS\\VSV-Contadores\\src\\components\\facturacion\\CONTABILIDAD 2026 (2).xlsx';
const RUTA_LOG = './facturas_emitidas_nombres_log.txt'; 
const URL_EMISION = 'https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=33&TIPO=4';
const TEL_EMISOR = '56920134015';

if (!fs.existsSync(RUTA_LOG)) fs.writeFileSync(RUTA_LOG, '');
const obtenerLogNombres = () => fs.readFileSync(RUTA_LOG, 'utf-8').split('\n').map(n => n.trim().toUpperCase());

function auditarYObtenerPendientes() {
    console.log(`\n==================================================`);
    console.log(`🔍 FASE 1: LEYENDO ARCHIVO Y APLICANDO FILTROS`);
    console.log(`==================================================\n`);
    
    const workbook = readFile(RUTA_EXCEL);
    const registros = utils.sheet_to_json(workbook.Sheets['MARZO']);
    const logNombres = obtenerLogNombres();
    
    // LISTA NEGRA: Incluye a Naty Ruz que acaba de salir
    const listosUser = [
        'NATY RUZ COSMETICS', 'TRANSPORTES Y LOGISTICAS AMADO BERMEJO SPA', 
        'AGUSTO LE GLACE SPA', 'FERNANDO FERRUZOLA', 'TELEX SPA', 'ROCKPERO SPA', 
        'HI-GREEN-TECH SPA', 'COMERCIALIZADORA HORMITZA', 'BURBUJITAS LIMITADA', 
        'A&L SOLUCIONES', 'INVERSIONES A Y E SPA', 'ESMEC SPA', 'COMERCIALIZADORA ROVIRA',
        'APRENDIZAJE ACTIVO SPA', 'FARMACIAS HIGIA SPA', 'GOOK PRODUCCIONES',
        'SANHUEZA MANSO SPA', 'MCB CONSULTORES SPA', 'COMERCIALIZADORA A&R',
        'EXOVET LABORATORIO', 'ELECTROPROYECT', 'CONSTRUCCIONES Y REMODELACIONES',
        'COMPAÑIA DE SOLUCIONES', 'P & R - FIJACIÓN', 'P & R FIJACION', 
        'INVERSIONES MUNDO CANINO SPA', 'GOVINDA CANO SPA', 
        'COMERCIALIZADORA TORRES ASEO', 'GATO DOLZ FUNDACION', 'VOLLAIRE Y OLIVOS'
    ].map(n => n.toUpperCase().trim());

    const exclusionesEspeciales = ['HAMABU SPA', 'ANITA MARIA VEAS'].map(n => n.toUpperCase().trim());
    const pendientes = [];

    let countAprobadas = 0;

    registros.forEach((fila) => {
        const razon = (fila['RAZON SOCIAL'] || '').toString().toUpperCase().trim();
        const pagoOriginal = (fila['PAGO SERVICIO'] || '').toString().toUpperCase();
        
        if (!razon) return; 

        const esValido = pagoOriginal.includes('PAGADO');
        const esExclusionEspecial = exclusionesEspeciales.some(ex => razon.includes(ex));
        const yaHecha = listosUser.some(ex => razon.includes(ex)) || logNombres.includes(razon);

        if (esExclusionEspecial) {
            // Ignorada silenciosamente (o puedes poner console.log si quieres)
        } else if (yaHecha) {
            // En lista negra
        } else if (!esValido) {
            // Inválida
        } else {
            console.log(`✅ [APROBADA] ${razon}`);
            countAprobadas++;
            
            const rF = (fila['RUT'] || '').toString().replace(/\./g, '');
            const [rutR, dvR] = rF.split('-');
            
            pendientes.push({
                razon: (fila['RAZON SOCIAL'] || '').toString().trim(),
                rut: rutR, dv: dvR,
                correo: (fila['CORREO'] || '').toString().trim(),
                neto: (fila['NETO'] || '0').toString().replace(/[^0-9]/g, ''),
                plan: fila['PLAN CONTABLE'] || 'GO'
            });
        }
    });

    console.log(`\n>> Total a facturar: ${countAprobadas}`);
    return pendientes;
}

(async () => {
    const pendientes = auditarYObtenerPendientes();
    
    if (pendientes.length === 0) {
        console.log("No hay empresas pendientes. Cerrando script.");
        return;
    }

    console.log(`\n==================================================`);
    console.log(`🚀 FASE 2: INICIANDO FACTURACIÓN VELOZ`);
    console.log(`==================================================\n`);

    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null, 
        args: ['--start-maximized', '--disable-blink-features=AutomationControlled', '--ignore-certificate-errors'] 
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    page.on('dialog', async d => { 
        console.log(`💬 [AVISO SII] ${d.message()}`);
        await d.accept(); 
    });

    try {
        await page.goto(URL_EMISION, { waitUntil: 'load' });

        for (const f of pendientes) {
            let folioExito = false;

            while (!folioExito) {
                console.log(`\n▶️ [FACTURANDO] ${f.razon}`);
                try {
                    await page.goto(URL_EMISION, { waitUntil: 'load' });

                    // AUTO-RECONEXIÓN: Si la sesión se cayó y pide RUT, se loguea de nuevo
                    const necesitaLogin = await page.$('#rutcntr');
                    if (necesitaLogin) {
                        console.log(`🔄 [SESION] Detectado cierre de sesión. Reconectando...`);
                        await page.type('#rutcntr', `${process.env.DTE_RUT}-${process.env.DTE_DV}`);
                        await page.type('#clave', process.env.DTE_PASS);
                        await Promise.all([page.waitForNavigation(), page.click('#bt_ingresar')]);
                        
                        await page.waitForSelector('select[name="RUT_EMP"]');
                        await page.select('select[name="RUT_EMP"]', '78306207-0');
                        await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
                        
                        await page.goto(URL_EMISION, { waitUntil: 'load' }); // Volver a emisión tras reconectar
                    }

                    // LLENADO RÁPIDO
                    await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true, timeout: 15000 });
                    
                    await page.type('#EFXP_RUT_RECEP', f.rut);
                    await page.type('#EFXP_DV_RECEP', f.dv);
                    await page.keyboard.press('Tab');
                    await new Promise(r => setTimeout(r, 1200)); 

                    await page.type('input[name="EFXP_CIUDAD_ORIGEN"]', 'Santiago');
                    await page.type('input[name="EFXP_FONO_EMISOR"]', TEL_EMISOR);
                    await page.type('input[name="EFXP_CIUDAD_RECEP"]', 'Santiago');
                    if (f.correo) await page.type('input[name="EFXP_CONTACTO"]', f.correo);

                    await page.type('input[name="EFXP_NMB_01"]', `Plan ${f.plan}`);
                    await page.type('input[name="EFXP_QTY_01"]', '1');
                    await page.type('input[name="EFXP_UNMD_01"]', '1');
                    await page.type('input[name="EFXP_PRC_01"]', f.neto);
                    await page.click('input[name="DESCRIP_01"]');
                    await page.type('textarea[name="EFXP_DSC_ITEM_01"]', 'Marzo');
                    await page.select('select[name="EFXP_FMA_PAGO"]', '1');

                    // FIRMA
                    await page.click('button[name="Button_Update"]');
                    await page.waitForNavigation({ waitUntil: 'load' });
                    await page.click('input[name="btnSign"]');
                    await page.waitForNavigation({ waitUntil: 'load' });
                    await page.type('#myPass', process.env.SII_PFX_PASS);
                    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('#btnFirma')]);

                    // ESPERA INTELIGENTE DE FOLIO (Vigila la pantalla hasta 15s)
                    console.log(`[VALIDANDO] Esperando folio en pantalla...`);
                    await page.waitForFunction(() => {
                        return document.body.innerText.includes('N°') || document.body.innerText.includes('Por el momento no es posible');
                    }, { timeout: 15000 }).catch(() => {});

                    const folio = await page.evaluate(() => {
                        const m = document.body.innerText.match(/N°\s*(\d+)/);
                        return m ? m[1] : null;
                    });

                    if (folio) {
                        fs.appendFileSync(RUTA_LOG, `${f.razon.toUpperCase()}\n`); 
                        console.log(`✅ [EXITO] Folio generado: ${folio}`);
                        folioExito = true;
                    } else {
                        throw new Error("El SII no entregó folio (posible error o lentitud extrema)");
                    }
                } catch (e) {
                    console.log(`⚠️ [ERROR] ${e.message}. Forzando reinicio del ciclo y esperando 2s...`);
                    await new Promise(r => setTimeout(r, 2000)); // La pausa de 2 segundos exigida
                }
            }
        }

        console.log(`\n🏁 [FIN] Todas las facturas de la cola fueron procesadas.`);

    } catch (e) {
        console.error(`❌ [ERROR CRITICO] ${e.message}`);
    }
})();