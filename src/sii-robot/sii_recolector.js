import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';

async function recolectarFolios() {
    console.log("🚀 Iniciando el Robot en Modo Visual y de Incógnito...");
    
    // Ruta de Edge
    const rutaEdge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

    const browser = await puppeteer.launch({ 
        headless: false, // Cambiado a false para que puedas ver el proceso
        defaultViewport: null,
        executablePath: rutaEdge,
        args: ['--start-maximized'] 
    });
    
    // Crear contexto limpio para evitar caché y cookies guardadas
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    
    // Aumentamos el tiempo de espera global a 60 segundos
    page.setDefaultNavigationTimeout(60000); 

    try {
        console.log("🔑 Iniciando sesión...");
        await page.goto('https://misiir.sii.cl/cgi_misii/siihome.cgi', { waitUntil: 'networkidle2' });

        const rutElement = await page.waitForSelector('#rutcntr, #rut', { timeout: 15000 });
        const idCajaRut = await page.evaluate(el => el.id, rutElement);

        const rutCrudo = process.env.DTE_RUT || "";
        const dvCrudo = process.env.DTE_DV || "";
        const rutLimpio = `${rutCrudo}${dvCrudo}`.replace(/[^0-9kK]/gi, ''); 

        await page.type(`#${idCajaRut}`, rutLimpio, { delay: 60 }); 
        await page.type('#clave', process.env.DTE_PASS); 
        
        // Clic en ingresar y esperar navegación
        await Promise.all([
            page.click('#bt_ingresar'),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);

        // Manejo de Sesión Activa
        try {
            const btnSesion = await page.waitForSelector('input[value="Cerrar sesión anterior y continuar"]', { timeout: 5000 });
            if (btnSesion) {
                await Promise.all([
                    page.click('input[value="Cerrar sesión anterior y continuar"]'),
                    page.waitForNavigation({ waitUntil: 'networkidle2' })
                ]);
                console.log("⚠️ Se forzó el cierre de una sesión previa.");
            }
        } catch (e) {
            // No hay sesión activa, continuamos normal
        }

        // Cerrar popup de actualización si aparece
        try {
            await page.waitForFunction(() => {
                const botones = Array.from(document.querySelectorAll('button, a, span'));
                const btn = botones.find(b => b.innerText && b.innerText.includes('ACTUALIZAR MÁS TARDE'));
                if (btn) { btn.click(); return true; }
                return false;
            }, { timeout: 4000 });
        } catch (e) {}

        console.log("📂 Yendo a la selección de empresa...");
        await page.goto('https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=1&TIPO=4', { waitUntil: 'networkidle2' });

        console.log("🏢 Seleccionando RUT 78306207...");
        
        // Selección de empresa con manejo de errores mejorado
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
            page.evaluate(() => {
                const rutBuscado = '78306207'; 
                const selects = document.querySelectorAll('select');
                for (const select of selects) {
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

        console.log("⏳ Esperando la carga de la tabla de facturas...");
        await page.waitForSelector('table tbody tr', { timeout: 60000 });

        const facturas = await page.evaluate(() => {
            const lista = [];
            const filas = document.querySelectorAll('table tbody tr'); 
            
            filas.forEach(fila => {
                const celdas = fila.querySelectorAll('td');
                if (celdas.length >= 7) { 
                    const rutEmisor = celdas[1]?.innerText.trim();
                    const razonSocial = celdas[2]?.innerText.trim();
                    const folio = celdas[4]?.innerText.trim();
                    const montoTotal = celdas[6]?.innerText.trim();

                    if (rutEmisor && folio && !isNaN(folio)) {
                        lista.push({ 
                            rutEmisor: rutEmisor, 
                            razonSocial: razonSocial,
                            folio: folio,
                            montoTotal: montoTotal,
                            procesado: false 
                        });
                    }
                }
            });
            return lista;
        });

        console.log(`🎉 ¡Se extrajeron ${facturas.length} folios exitosamente!`);
        
        const rutaDestino = "C:\\Users\\felip\\OneDrive\\Documentos\\VS\\VSV-Contadores\\src\\sii-robot\\folios_pendientes.json";
        fs.writeFileSync(rutaDestino, JSON.stringify(facturas, null, 2));
        console.log(`💾 Archivo guardado y actualizado.`);

        // CERRAR SESIÓN EN EL SII (VERSIÓN ROBUSTA)
        console.log("🚪 Solicitando cierre de sesión al servidor del SII...");
        try {
            await Promise.all([
                // El catch vacío evita que el script falle si el SII tarda más de 10 segundos en responder al cierre
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
                page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    const btnSalir = links.find(link => 
                        link.innerText && link.innerText.toLowerCase().includes('cerrar sesi')
                    );
                    if (btnSalir) {
                        btnSalir.click();
                    } else {
                        window.location.href = 'https://misiir.sii.cl/cgi_misii/siihome.cgi?fin';
                    }
                })
            ]);
            console.log("✅ Sesión cerrada correctamente en los servidores del portal.");
            
        } catch (errorCierre) {
            console.log("⚠️ No se pudo confirmar visualmente el cierre, pero el contexto aislado destruirá las cookies locales.");
        }

    } catch (error) {
        console.error("\n❌ Error en el Recolector:", error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log("🛑 Robot terminado y memoria liberada.");
        }
    }
}

recolectarFolios();