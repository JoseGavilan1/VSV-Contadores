import puppeteer from 'puppeteer';
import 'dotenv/config';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// Configuración de rutas (Rutas originales de tu entorno)
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
        // PASO 1: LOGIN
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

        // Manejo de sesiones previas y popups
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
                const rutBuscado = '78306207'; // RUT de la empresa
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

        const paginasAntes = await browser.pages();

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

        let popupPage;
        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const paginasActuales = await browser.pages();
            popupPage = paginasActuales.find(p => !paginasAntes.includes(p));
            if (popupPage) break;
        }

        if (!popupPage) throw new Error("No se detectó la ventana de detalle.");
        await popupPage.bringToFront();

        // ==========================================
// PASO 3: DESPLIEGUE FORZADO DE INFORMACIÓN
// ==========================================
console.log("🔽 Intentando expandir 'Otros detalles documento'...");

// 1. Esperamos a que la página de detalles esté realmente lista
await popupPage.waitForSelector('a[href="#collapseOtros"]', { visible: true, timeout: 10000 });

const seDesplego = await popupPage.evaluate(async () => {
    const btn = document.querySelector('a[href="#collapseOtros"]');
    if (!btn) return false;

    // Scroll para asegurar que el elemento esté en el "viewport"
    btn.scrollIntoView({ behavior: 'instant', block: 'center' });

    // SIMULACIÓN DE CLIC HUMANO COMPLETO
    // Disparamos los 3 eventos que los scripts antiguos del SII suelen escuchar
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    btn.click(); // Clic final

    return true;
});

if (seDesplego) {
    console.log("✅ Clic enviado. Esperando respuesta del servidor...");
    
    // 2. Verificación de seguridad: si el SII se queda "pegado" y no abre la sección, 
    // nosotros la obligamos a aparecer mediante CSS y clases de Bootstrap.
    try {
        await popupPage.waitForFunction(() => {
            const panel = document.querySelector('#collapseOtros');
            // Verificamos si ya tiene altura (está abierto) o si tiene la clase 'in'
            return panel && (panel.offsetHeight > 0 || panel.classList.contains('in'));
        }, { timeout: 4000 });
        console.log("🔓 Sección expandida correctamente.");
    } catch (e) {
        console.warn("⚠️ El sitio no respondió al clic. Forzando apertura manual...");
        await popupPage.evaluate(() => {
            const panel = document.querySelector('#collapseOtros');
            const chevron = document.querySelector('a[href="#collapseOtros"] i'); // La flechita
            
            if (panel) {
                // Inyectamos las clases que el SII usa para mostrar el contenido
                panel.classList.add('in'); 
                panel.style.display = 'block';
                panel.style.height = 'auto';
                panel.setAttribute('aria-expanded', 'true');
            }
            if (chevron) {
                chevron.style.transform = 'rotate(180deg)'; // Giramos la flecha visualmente
            }
        });
    }
}

        // ==========================================
        // PASO 4: VER EL PDF
        // ==========================================
        console.log("📄 Buscando el botón de Visualización Documento...");
        
        // Capturamos la promesa de la nueva pestaña antes del clic
        const pdfTargetPromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));

        const clicPDF = await popupPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('a, button, input'));
            const btnPdf = buttons.find(b => 
                (b.innerText || b.value || "").toUpperCase().includes('VISUALIZACIÓN DOCUMENTO')
            );

            if (btnPdf) {
                btnPdf.click();
                return true;
            }
            return false;
        });

        if (clicPDF) {
            const pdfPage = await pdfTargetPromise;
            if (pdfPage) {
                await pdfPage.bringToFront();
                console.log("✅ PDF abierto en nueva pestaña.");
                await new Promise(r => setTimeout(r, 8000)); // Tiempo para que lo veas
            }
        }

        // ==========================================
        // PASO 5: ACTUALIZAR ESTADO
        // ==========================================
        const datosJson = JSON.parse(fs.readFileSync(rutaArchivoJSON, 'utf8'));
        const index = datosJson.findIndex(f => String(f.folio) === String(folioBuscado));
        if (index !== -1) {
            datosJson[index].procesado = true;
            fs.writeFileSync(rutaArchivoJSON, JSON.stringify(datosJson, null, 2));
            console.log(`📝 Folio ${folioBuscado} marcado como procesado.`);
        }

    } catch (error) {
        console.error("❌ Error en el proceso:", error.message);
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