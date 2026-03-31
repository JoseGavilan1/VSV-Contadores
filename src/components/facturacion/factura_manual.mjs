import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import readline from 'node:readline/promises'; // Para solicitar métricas/variables
import { stdin as input, stdout as output } from 'node:process';

dotenv.config();

const rl = readline.createInterface({ input, output });

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
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    if (!exito) throw new Error('No se pudo acceder al portal del SII.');
}

async function iniciar() {
    // ==========================================
    // SOLICITUD DE MÉTRICAS (VARIABLES DINÁMICAS)
    // ==========================================
    console.log('--- CONFIGURACIÓN DE FACTURA ---');
    const rutFull = await rl.question('RUT Receptor (sin puntos ni guion, ej: 77871935): ');
    const dv = await rl.question('DV Receptor: ');
    const contacto = await rl.question('Email Contacto Receptor: ');
    const rutSoli = await rl.question('RUT Solicita (ej: 14143766): ');
    const dvSoli = await rl.question('DV Solicita: ');
    const planNombre = await rl.question('Nombre del Plan (ej: Plan EXECUTIVE): ');
    const precio = await rl.question('Precio (neto): ');
    const mesDescripcion = await rl.question('Mes/Descripción (ej: Marzo): ');
    
    rl.close();

    const facturasAProcesar = [{
        rutReceptor: rutFull,
        dvReceptor: dv,
        ciudadEmisor: 'Santiago',   // Fijo
        telefonoEmisor: '56978278733', // Fijo
        ciudadReceptor: 'Santiago', // Fijo
        contactoReceptor: contacto, 
        rutSolicita: rutSoli,    
        dvSolicita: dvSoli,
        producto: {
            nombre: planNombre,      
            cantidad: '1', // Fijo
            unidad: '1',   // Fijo
            precio: precio,
            descripcion: mesDescripcion
        }
    }];

    // Configuración: headless: true para que no se vea
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--start-maximized', '--ignore-certificate-errors'] 
    });

    const page = await browser.newPage();
    const reporteResultados = [];

    try {
        console.log('>>> Procesando en segundo plano...');
        await navegarAEmision(page);

        // 1. LOGIN
        const inputRutExiste = await page.$('#rutcntr');
        if (inputRutExiste) {
            await page.type('#rutcntr', `${process.env.DTE_RUT}-${process.env.DTE_DV}`);
            await page.type('#clave', process.env.DTE_PASS);
            await Promise.all([page.waitForNavigation(), page.click('#bt_ingresar')]);

            await page.waitForSelector('select[name="RUT_EMP"]');
            await page.select('select[name="RUT_EMP"]', '78306207-0');
            await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
        }

        // 2. EMISIÓN
        for (const datos of facturasAProcesar) {
            await navegarAEmision(page);
            await page.waitForSelector('#EFXP_RUT_RECEP');

            await page.type('#EFXP_RUT_RECEP', datos.rutReceptor);
            await page.type('#EFXP_DV_RECEP', datos.dvReceptor);
            await page.keyboard.press('Tab');
            await new Promise(r => setTimeout(r, 2000));

            await page.evaluate(val => document.querySelector('input[name="EFXP_CIUDAD_ORIGEN"]').value = val, datos.ciudadEmisor);
            await page.type('input[name="EFXP_FONO_EMISOR"]', datos.telefonoEmisor);
            await page.type('input[name="EFXP_CIUDAD_RECEP"]', datos.ciudadReceptor);
            await page.type('input[name="EFXP_CONTACTO"]', datos.contactoReceptor);
            await page.type('input[name="EFXP_RUT_SOLICITA"]', datos.rutSolicita);
            await page.type('input[name="EFXP_DV_SOLICITA"]', datos.dvSolicita);

            await page.type('input[name="EFXP_NMB_01"]', datos.producto.nombre);
            await page.type('input[name="EFXP_QTY_01"]', datos.producto.cantidad);
            await page.type('input[name="EFXP_UNMD_01"]', datos.producto.unidad);
            await page.type('input[name="EFXP_PRC_01"]', datos.producto.precio);
            
            await page.click('input[name="DESCRIP_01"]');
            await page.waitForSelector('textarea[name="EFXP_DSC_ITEM_01"]');
            await page.type('textarea[name="EFXP_DSC_ITEM_01"]', datos.producto.descripcion);
            await page.select('select[name="EFXP_FMA_PAGO"]', '1');

            // Firmar
            await Promise.all([page.waitForNavigation(), page.click('button[name="Button_Update"]')]);
            await page.waitForSelector('input[name="btnSign"]');
            await Promise.all([page.waitForNavigation(), page.click('input[name="btnSign"]')]);

            await page.waitForSelector('#myPass');
            await page.type('#myPass', process.env.SII_PFX_PASS);
            await Promise.all([page.waitForNavigation(), page.click('#btnFirma')]);

            // Obtener Folio
            const folio = await page.evaluate(() => {
                const el = Array.from(document.querySelectorAll('b')).find(e => e.innerText.includes('N°'));
                return el ? el.innerText.match(/\d+/)[0] : "No obtenido";
            });
            
            reporteResultados.push({ Rut: datos.rutReceptor, Folio: folio });
            console.log(`✅ Éxito: Folio ${folio}`);
        }

        // 3. CIERRE DE SESIÓN
        console.log('>>> Cerrando sesión...');
        await page.goto('https://misiir.sii.cl/cgi_misii/siu/cgi_misii_logout'); 
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
        console.table(reporteResultados);
        process.exit();
    }
}

iniciar();