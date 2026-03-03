import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs'; // Necesario para guardar el archivo JSON

async function recolectarFolios() {
    console.log("🤖 Iniciando el Robot Recolector en Edge...");
    const rutaEdge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        executablePath: rutaEdge,
        args: ['--start-maximized'] 
    });
    
    const page = await browser.newPage();

    try {
        console.log("🔑 Iniciando sesión rápida...");
        await page.goto('https://misiir.sii.cl/cgi_misii/siihome.cgi', { waitUntil: 'networkidle2' });

        const rutElement = await page.waitForSelector('#rutcntr, #rut', { timeout: 15000 });
        const idCajaRut = await page.evaluate(el => el.id, rutElement);

        const rutCrudo = process.env.DTE_RUT || "";
        const dvCrudo = process.env.DTE_DV || "";
        const rutLimpio = `${rutCrudo}${dvCrudo}`.replace(/[^0-9kK]/gi, ''); 

        await page.type(`#${idCajaRut}`, rutLimpio, { delay: 60 }); 
        await page.type('#clave', process.env.DTE_PASS); 
        await page.click('#bt_ingresar');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Cerrar popup si aparece
        try {
            await page.waitForFunction(() => {
                const botones = Array.from(document.querySelectorAll('button, a, span'));
                const btn = botones.find(b => b.innerText && b.innerText.includes('ACTUALIZAR MÁS TARDE'));
                if (btn) { btn.click(); return true; }
                return false;
            }, { timeout: 4000 });
            await new Promise(r => setTimeout(r, 1500)); 
        } catch (e) {}

        console.log("📂 Yendo a la selección de empresa...");
        await page.goto('https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=1&TIPO=4', { waitUntil: 'networkidle2' });

        console.log("🏢 Seleccionando VOLLAIRE Y OLIVOS...");
        await page.evaluate(() => {
            const rutBuscado = '78306207'; 
            const selects = document.querySelectorAll('select');
            for (const select of selects) {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].text.includes(rutBuscado) || select.options[i].value.includes(rutBuscado)) {
                        select.selectedIndex = i; 
                        const botonesEnviar = document.querySelectorAll('input[type="submit"], input[type="button"], button');
                        for (const btn of botonesEnviar) {
                            if (btn.value.includes('Enviar') || btn.innerText.includes('Enviar')) {
                                btn.click(); return;
                            }
                        }
                    }
                }
            }
        });

        console.log("⏳ Esperando la tabla de facturas...");
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log("🔎 Extrayendo datos de la tabla...");
        // Inyectamos código en la página para leer la tabla HTML
        const facturas = await page.evaluate(() => {
            const lista = [];
            // Buscamos todas las filas de las tablas de datos
            const filas = document.querySelectorAll('table tbody tr'); 
            
            filas.forEach(fila => {
                const celdas = fila.querySelectorAll('td');
                // Aseguramos que es una fila de factura revisando que tenga suficientes columnas
                if (celdas.length >= 7) { 
                    const rutEmisor = celdas[1]?.innerText.trim();
                    const razonSocial = celdas[2]?.innerText.trim();
                    const folio = celdas[4]?.innerText.trim();
                    const montoTotal = celdas[6]?.innerText.trim();

                    // Si encontró un RUT y un folio válidos, lo guardamos
                    if (rutEmisor && folio && !isNaN(folio)) {
                        lista.push({ 
                            rutEmisor: rutEmisor, 
                            razonSocial: razonSocial,
                            folio: folio,
                            montoTotal: montoTotal,
                            procesado: false // Indicador para el Script 2
                        });
                    }
                }
            });
            return lista;
        });

        console.log(`🎉 ¡Se extrajeron ${facturas.length} folios!`);
        
        // --- LA RUTA EXACTA QUE PEDISTE ---
        const rutaDestino = "C:\\Users\\felip\\OneDrive\\Documentos\\VS\\VSV-Contadores\\src\\sii-robot\\folios_pendientes.json";
        
        fs.writeFileSync(rutaDestino, JSON.stringify(facturas, null, 2));
        console.log(`💾 Archivo guardado exitosamente en:\n👉 ${rutaDestino}`);

    } catch (error) {
        console.error("\n❌ Error en el Recolector:", error.message);
    } finally {
        await browser.close();
    }
}

recolectarFolios();