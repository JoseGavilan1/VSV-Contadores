import 'dotenv/config';
import fs from 'fs';
import path from 'path';

export async function iniciarSesion(page) {
    console.log("🔑 [1/4] Iniciando sesión en el SII...");
    await page.goto('https://misiir.sii.cl/cgi_misii/siihome.cgi', { waitUntil: 'networkidle2' });

    const rutElement = await page.waitForSelector('#rutcntr, #rut', { timeout: 15000 });
    const idCajaRut = await page.evaluate(el => el.id, rutElement);
    //rut inicio de sesion en sii
    const rutLimpio = `${process.env.DTE_RUT}${process.env.DTE_DV}`.replace(/[^0-9kK]/gi, ''); 
    await page.type(`#${idCajaRut}`, rutLimpio, { delay: 60 }); 
    await page.type('#clave', process.env.DTE_PASS); 
    
    await Promise.all([
        page.click('#bt_ingresar'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    // Manejo de pop-ups y cierres de sesión previos
    try {
        const btnSesion = await page.waitForSelector('input[value="Cerrar sesión anterior y continuar"]', { timeout: 5000 });
        if (btnSesion) {
            await Promise.all([
                page.click('input[value="Cerrar sesión anterior y continuar"]'),
                page.waitForNavigation({ waitUntil: 'networkidle2' })
            ]);
        }
    } catch (e) {}

    try {
        await page.waitForFunction(() => {
            const botones = Array.from(document.querySelectorAll('button, a, span'));
            const btn = botones.find(b => b.innerText && b.innerText.includes('ACTUALIZAR MÁS TARDE'));
            if (btn) { btn.click(); return true; }
            return false;
        }, { timeout: 4000 });
    } catch (e) {}
}
//aca el rut debe cambiar dependiendo de la empresa
export async function extraerTablaFolios(page) {
    console.log("📂 [2/4] Yendo a la tabla de documentos recibidos...");
    await page.goto('https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=1&TIPO=4', { waitUntil: 'networkidle2' });
    
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

    console.log("⏳ Extrayendo lista actualizada de folios...");
    await page.waitForSelector('table tbody tr', { timeout: 60000 });

    const urlTablaPrincipal = page.url();

    const facturasExtraidas = await page.evaluate(() => {
        const lista = [];
        const filas = document.querySelectorAll('table tbody tr'); 
        
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('td');
            if (celdas.length >= 8) { 
                const rutEmisor = celdas[1]?.innerText.trim();
                const razonSocial = celdas[2]?.innerText.trim();
                const documento = celdas[3]?.innerText.trim(); 
                const folio = celdas[4]?.innerText.trim();
                const fecha = celdas[5]?.innerText.trim();     
                const montoTotal = celdas[6]?.innerText.trim();
                const estado = celdas[7]?.innerText.trim();    

                if (rutEmisor && folio && !isNaN(folio)) {
                    lista.push({ 
                        rutEmisor, razonSocial, documento, folio, fecha, montoTotal, estado,
                        procesado: false 
                    });
                }
            }
        });
        return lista;
    });

    return { facturasExtraidas, urlTablaPrincipal };
}

export async function descargarPDF(browser, page, doc, urlTablaPrincipal, carpetaDescargas) {
    try {
        await page.bringToFront();
        await page.goto(urlTablaPrincipal, { waitUntil: 'networkidle2', timeout: 60000 });
        
        try {
            await page.waitForSelector('table tbody tr', { timeout: 10000 });
        } catch (e) {
            console.log("   🔄 Recargando menú (Sesión caducada temporalmente)...");
            await page.goto('https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=1&TIPO=4', { waitUntil: 'networkidle2' });
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                page.evaluate(() => {
                    const rutBuscado = '78306207'; 
                    const selects = document.querySelectorAll('select');
                    for (let s of selects) {
                        for (let j = 0; j < s.options.length; j++) {
                            if (s.options[j].text.includes(rutBuscado)) {
                                s.selectedIndex = j; 
                                document.querySelector('input[type="submit"], button[type="submit"]').click();
                                return;
                            }
                        }
                    }
                })
            ]);
            await page.waitForSelector('table tbody tr', { timeout: 30000 });
        }

        let clicExitoso = false;
        try {
            clicExitoso = await page.evaluate((folio, rut) => {
                const filas = document.querySelectorAll('table tbody tr');
                for (let fila of filas) {
                    const celdas = fila.querySelectorAll('td');
                    if (celdas.length >= 8) {
                        const rutFila = celdas[1]?.innerText.trim();
                        const folioFila = celdas[4]?.innerText.trim();
                        
                        if (folioFila === String(folio) && rutFila === String(rut)) {
                            const btnVer = celdas[0].querySelector('a, img, input');
                            if (btnVer) { 
                                const clickable = btnVer.closest('a') || btnVer;
                                clickable.click(); 
                                return true; 
                            }
                        }
                    }
                }
                return false;
            }, doc.folio, doc.rutEmisor);
        } catch (clickErr) {
            if (clickErr.message.includes('Execution context was destroyed')) {
                clicExitoso = true;
            } else {
                throw clickErr;
            }
        }

        if (!clicExitoso) {
            console.log(`   ⚠️ No se encontró el botón 'Ver'. (Documento sin PDF)`);
            return null;
        }

        console.log("   🔗 Buscando el enlace de descarga...");
        let codigoDocumento = null;
        let paginaDestino = null;

        for (let intentos = 0; intentos < 12; intentos++) {
            await new Promise(r => setTimeout(r, 1000));
            const allPages = await browser.pages();
            paginaDestino = allPages.find(p => p.url().includes('CODIGO='));
            
            if (paginaDestino) {
                const urlObj = new URL(paginaDestino.url());
                codigoDocumento = urlObj.searchParams.get('CODIGO');
                if (codigoDocumento) break;
            }
        }

        if (!codigoDocumento) {
            throw new Error("El portal no arrojó ningún PDF. Pasando al siguiente...");
        }

        console.log("   📥 Extrayendo PDF...");
        const urlPDF = `https://www1.sii.cl/cgi-bin/Portal001/mipeShowPdf.cgi?CODIGO=${codigoDocumento}`;
        const base64PDF = await paginaDestino.evaluate(async (url) => {
            const res = await fetch(url);
            const buffer = await res.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let j = 0; j < bytes.byteLength; j++) {
                binary += String.fromCharCode(bytes[j]);
            }
            return window.btoa(binary);
        }, urlPDF);

        if (paginaDestino !== page && !paginaDestino.isClosed()) {
            await paginaDestino.close().catch(()=>{});
        }

        const pdfBuffer = Buffer.from(base64PDF, 'base64');
        const rutaGuardado = path.join(carpetaDescargas, `Folio_${doc.folio}.pdf`);
        fs.writeFileSync(rutaGuardado, pdfBuffer);

        return rutaGuardado;

    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return null;
    }
}

export async function cerrarSesion(page) {
    console.log("\n🚪 [4/4] Tareas finalizadas. Cerrando sesión en el SII...");
    try {
        await page.bringToFront().catch(()=>{});
        await page.evaluate(() => {
            const botones = Array.from(document.querySelectorAll('a, button'));
            const btnCerrar = botones.find(el => el.innerText && el.innerText.toLowerCase().includes('cerrar sesi'));
            if (btnCerrar) btnCerrar.click();
            else window.location.href = 'https://misiir.sii.cl/cgi_misii/siihome.cgi?fin';
        });
        await new Promise(r => setTimeout(r, 3000));
        console.log("✅ Sesión cerrada correctamente.");
    } catch (e) {}
}