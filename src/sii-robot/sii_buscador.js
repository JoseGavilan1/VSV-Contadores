import puppeteer from 'puppeteer';
import 'dotenv/config';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// Importamos tu módulo especializado en leer PDFs
import { extraerDatosFactura } from './leerpdf.js';

// Configuración de rutas
const rutaArchivoJSON = "C:\\Users\\felip\\OneDrive\\Documentos\\VS\\VSV-Contadores\\src\\sii-robot\\folios_pendientes.json";
const carpetaDescargas = path.resolve('./pdf_descargados');

if (!fs.existsSync(carpetaDescargas)) {
    fs.mkdirSync(carpetaDescargas);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function buscarDetalleEnSII(folioBuscado) {
    console.log(`\n🚀 Iniciando búsqueda en SII para el folio: ${folioBuscado}...`);
    
    const rutaEdge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        executablePath: rutaEdge,
        args: ['--start-maximized'] 
    });
    
    const context = await browser.createBrowserContext(); 
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000); 

    try {
        // ==========================================
        // PASO 1: LOGIN Y GESTIÓN DE POP-UPS
        // ==========================================
        console.log("🔑 Iniciando sesión...");
        await page.goto('https://misiir.sii.cl/cgi_misii/siihome.cgi', { waitUntil: 'networkidle2' });

        const rutElement = await page.waitForSelector('#rutcntr, #rut');
        const idCajaRut = await page.evaluate(el => el.id, rutElement);
        const rutLimpio = `${process.env.DTE_RUT}${process.env.DTE_DV}`.replace(/[^0-9kK]/gi, ''); 

        await page.type(`#${idCajaRut}`, rutLimpio);
        await page.type('#clave', process.env.DTE_PASS); 
        
        await Promise.all([
            page.click('#bt_ingresar'),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);

        try {
            const btnSesion = await page.waitForSelector('input[value="Cerrar sesión anterior y continuar"]', { timeout: 3000 });
            if (btnSesion) {
                await Promise.all([
                    page.click('input[value="Cerrar sesión anterior y continuar"]'),
                    page.waitForNavigation({ waitUntil: 'networkidle2' })
                ]);
            }
        } catch (e) {}

        // ==========================================
        // PASO 2: NAVEGACIÓN Y SELECCIÓN DE EMPRESA
        // ==========================================
        console.log("📂 Seleccionando empresa...");
        await page.goto('https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=1&TIPO=4', { waitUntil: 'networkidle2' });

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'load' }),
            page.evaluate(() => {
                const rutBuscado = '78306207';
                const select = document.querySelector('select');
                if (select) {
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].text.includes(rutBuscado)) {
                            select.selectedIndex = i; 
                            const btn = document.querySelector('input[type="submit"], button[type="submit"]');
                            if (btn) btn.click();
                            return;
                        }
                    }
                }
            })
        ]);

        await page.waitForSelector('table tbody tr');

        const clicExitoso = await page.evaluate((folio) => {
            const filas = document.querySelectorAll('table tbody tr');
            for (let fila of filas) {
                const celdas = fila.querySelectorAll('td');
                if (celdas[4]?.innerText.trim() === String(folio)) {
                    const btnVer = celdas[0].querySelector('a, img, input');
                    if (btnVer) { btnVer.click(); return true; }
                }
            }
            return false;
        }, folioBuscado);

        if (!clicExitoso) throw new Error("Folio no encontrado en la tabla.");

        // ==========================================
        // PASO 3: EXTRACCIÓN DEL CÓDIGO
        // ==========================================
        console.log("🔗 Buscando la redirección de la URL...");
        
        let codigoDocumento = null;
        let urlDetalle = "";
        let popupPage = null;

        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const paginasActuales = await browser.pages();
            
            const paginaConCodigo = paginasActuales.find(p => p.url().includes('CODIGO='));
            
            if (paginaConCodigo) {
                urlDetalle = paginaConCodigo.url();
                const urlObj = new URL(urlDetalle);
                codigoDocumento = urlObj.searchParams.get('CODIGO');
                
                if (codigoDocumento) {
                    popupPage = paginaConCodigo; 
                    await popupPage.bringToFront();
                    break; 
                }
            }
        }

        if (!codigoDocumento) {
            const urlsAbiertas = (await browser.pages()).map(p => p.url());
            console.log("❌ URLs detectadas actualmente:", urlsAbiertas);
            throw new Error("El portal del SII nunca cargó la URL con el parámetro CODIGO.");
        }

        console.log(`🌐 URL capturada: ${urlDetalle}`);
        console.log(`🎯 ¡Código extraído con éxito!: ${codigoDocumento}`);

        // ==========================================
        // PASO 4: DESCARGA INTERNA DEL PDF
        // ==========================================
        const urlPDF = `https://www1.sii.cl/cgi-bin/Portal001/mipeShowPdf.cgi?CODIGO=${codigoDocumento}`;
        console.log(`🚀 Evadiendo interfaz... Descargando PDF silenciosamente.`);

        const base64PDF = await popupPage.evaluate(async (url) => {
            const res = await fetch(url);
            const buffer = await res.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }, urlPDF);

        const pdfBuffer = Buffer.from(base64PDF, 'base64');
        const rutaGuardado = path.join(carpetaDescargas, `Folio_${folioBuscado}.pdf`);
        fs.writeFileSync(rutaGuardado, pdfBuffer);
        console.log(`💾 PDF guardado temporalmente en: ${rutaGuardado}`);

        // ==========================================
        // PASO 5: EXTRACCIÓN DE DATOS Y ELIMINACIÓN DE PDF
        // ==========================================
        console.log("🕵️‍♂️ Analizando el texto del PDF desde el módulo externo...");
        
        // Llamamos a nuestra función importada
        const datosExtraidos = await extraerDatosFactura(rutaGuardado);

        // ==========================================
        // PASO 6: ACTUALIZAR JSON (CRM)
        // ==========================================
        if (datosExtraidos) {
            const datosJson = JSON.parse(fs.readFileSync(rutaArchivoJSON, 'utf8'));
            const index = datosJson.findIndex(f => String(f.folio) === String(folioBuscado));
            
            if (index !== -1) {
                datosJson[index].procesado = true;
                datosJson[index].detalleCompleto = datosExtraidos;
                fs.writeFileSync(rutaArchivoJSON, JSON.stringify(datosJson, null, 2));
                console.log(`📝 Folio ${folioBuscado} actualizado exitosamente en el JSON.`);
            }
        } else {
            console.log(`⚠️ No se pudo extraer la información del folio ${folioBuscado}.`);
        }

        // ==========================================
        // PASO 7: RETROCEDER Y CERRAR SESIÓN
        // ==========================================
        console.log("\n🚪 Cerrando pestaña del detalle...");
        await popupPage.close(); 
        await page.bringToFront(); 

        console.log("🔐 Cerrando sesión en el SII de forma segura...");
        await page.evaluate(() => {
            const botones = Array.from(document.querySelectorAll('a, button'));
            const btnCerrar = botones.find(el => el.innerText && el.innerText.toLowerCase().includes('cerrar sesi'));
            
            if (btnCerrar) {
                btnCerrar.click();
            } else {
                window.location.href = 'https://misiir.sii.cl/cgi_misii/siihome.cgi?fin';
            }
        });

        await new Promise(r => setTimeout(r, 3000));
        console.log("✅ Sesión cerrada correctamente.");

    } catch (error) {
        console.error("\n❌ Error en el proceso:", error.message);
    } finally {
        await browser.close();
        console.log("🛑 Robot apagado.");
    }
}

function menu() {
    console.log("\n========================================");
    console.log("🔍 BUSCADOR DE DOCUMENTOS - VSV CONTADORES");
    console.log("========================================");
    rl.question('👉 Ingrese el Folio que desea consultar (o "salir"): ', async (folio) => {
        if (folio.toLowerCase() === 'salir') { rl.close(); return; }

        const datosJson = JSON.parse(fs.readFileSync(rutaArchivoJSON, 'utf8'));
        if (datosJson.some(f => String(f.folio) === folio.trim())) {
            await buscarDetalleEnSII(folio.trim());
        } else {
            console.log(`❌ El folio ${folio} no figura en folios_pendientes.json`);
        }
        menu();
    });
}

menu();