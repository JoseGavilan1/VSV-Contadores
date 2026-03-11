import 'dotenv/config';

export async function iniciarSesion(page) {
    console.log("🔑 [1/4] Iniciando sesión en el SII...");
    await page.goto('https://misiir.sii.cl/cgi_misii/siihome.cgi', { waitUntil: 'networkidle2' });

    const rutElement = await page.waitForSelector('#rutcntr, #rut', { timeout: 15000 });
    const idCajaRut = await page.evaluate(el => el.id, rutElement);
    
    const rutLimpio = `${process.env.DTE_RUT}${process.env.DTE_DV}`.replace(/[^0-9kK]/gi, ''); 
    await page.type(`#${idCajaRut}`, rutLimpio, { delay: 60 }); 
    await page.type('#clave', process.env.DTE_PASS); 
    
    await Promise.all([
        page.click('#bt_ingresar'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

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
            const botones = Array.from(document.querySelectorAll('button'));
            const btn = botones.find(b => b.innerText && b.innerText.trim().toUpperCase() === 'ACTUALIZAR MÁS TARDE');
            if (btn) { btn.click(); return true; }
            return false;
        }, { timeout: 5000 });
        console.log("   ✔️ Pop-up 'Actualizar más tarde' cerrado.");
    } catch (e) {}
}

export async function prepararYConsultarRCV(page, anio, mes) {
    console.log(`📂 [2/4] Consultando RCV periodo: ${mes}/${anio}...`);
    await page.goto('https://www4.sii.cl/consdcvinternetui/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));

    const nombresMeses = ["Mes", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const mesTexto = nombresMeses[mes]; 

    await page.evaluate((anioSel, mesTxt) => {
        const selects = document.querySelectorAll('select');
        if (selects.length > 0) {
            const rutSelect = selects[0];
            rutSelect.selectedIndex = rutSelect.options.length - 1;
            rutSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (selects.length > 1) {
            for (let i = 0; i < selects[1].options.length; i++) {
                if (selects[1].options[i].text.trim() === mesTxt) {
                    selects[1].selectedIndex = i;
                    selects[1].dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }
        if (selects.length > 2) {
            for (let i = 0; i < selects[2].options.length; i++) {
                if (selects[2].options[i].text.trim() === String(anioSel)) {
                    selects[2].selectedIndex = i;
                    selects[2].dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }
    }, anio, mesTexto);

    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Consultar'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 5000));
}

async function extraerTablaDetalle(page) {
    let resultados = [];
    let hayMasPaginas = true;

    while (hayMasPaginas) {
        const numFilas = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);

        for (let i = 0; i < numFilas; i++) {
            const datosFila = await page.evaluate((index) => {
                const fila = document.querySelectorAll('table tbody tr')[index];
                const tds = Array.from(fila.querySelectorAll('td'));
                if (tds.length < 5) return null;

                return {
                    "Tipo Compra": tds[0]?.innerText.trim(),
                    "RUT Proveedor": tds[1]?.innerText.trim(),
                    "Folio": tds[2]?.innerText.trim(),
                    "Fecha Docto.": tds[3]?.innerText.trim(),
                    "Fecha Recepción": tds[4]?.innerText.trim(),
                    "Fecha Acuse Recibo": tds[5]?.innerText.trim(),
                    "Monto Exento": tds[7]?.innerText.trim() || "0",
                    "Monto Neto": tds[8]?.innerText.trim() || "0",
                    "Monto IVA Recuperable": tds[9]?.innerText.trim() || "0",
                    "Total Otros Impuestos": tds[10]?.innerText.trim() || "0",
                    "Monto Iva No Recuperable": tds[11]?.innerText.trim() || "0",
                    "Código Iva No Recuperable": tds[12]?.innerText.trim() || "0",
                    "Monto Total": tds[13]?.innerText.trim() || "0"
                };
            }, i);

            if (datosFila) {
                await page.evaluate((index) => {
                    const linkFolio = document.querySelectorAll('table tbody tr')[index].querySelector('a');
                    if (linkFolio) linkFolio.click();
                }, i);

                try {
                    await page.waitForSelector('.modal-content', { timeout: 5000 });
                    const datosModal = await page.evaluate(() => {
                        const modal = document.querySelector('.modal-content');
                        if (!modal) return {};
                        const lineas = modal.innerText.split('\n');
                        const info = {};
                        lineas.forEach(l => {
                            if (l.includes(':')) {
                                const partes = l.split(':');
                                const clave = partes[0].trim();
                                const valor = partes.slice(1).join(':').trim();
                                if (clave) info[clave] = valor;
                            }
                        });
                        return info;
                    });

                    resultados.push({ ...datosFila, "Detalle Modal": datosModal });

                    await page.evaluate(() => {
                        const btnClose = document.querySelector('.modal-header .close, button[ng-click=\"cerrar()\"]');
                        if (btnClose) btnClose.click();
                    });
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    resultados.push(datosFila);
                }
            }
        }

        hayMasPaginas = await page.evaluate(() => {
            const btnSig = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.includes('Página siguiente'));
            if (btnSig && !btnSig.closest('li')?.classList.contains('disabled')) {
                btnSig.click();
                return true;
            }
            return false;
        });
        if (hayMasPaginas) await new Promise(r => setTimeout(r, 3500));
    }
    return resultados;
}

export async function revisarSeccionesYExtraerDatos(page) {
    console.log("🔍 [3/4] Escaneando secciones y detalles profundos...");
    const dataFinal = { compras: {}, ventas: {} };

    const procesarSeccion = async (nombreTab) => {
        await page.evaluate(n => {
            const tab = Array.from(document.querySelectorAll('ul.nav li a, a.ng-binding')).find(a => a.innerText.toUpperCase().includes(n.toUpperCase()));
            if (tab) tab.click();
        }, nombreTab);
        await new Promise(r => setTimeout(r, 4500));

        // EXTRACCIÓN DE LA PRIMERA TABLA (RESUMEN) ACTUALIZADA
        const resumen = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length < 2) return null;
                // Extraemos las 8 columnas solicitadas
                return {
                    "Tipo Documento": tds[0]?.innerText.trim(),
                    "Total Documentos": tds[1]?.innerText.trim(),
                    "Monto Exento": tds[2]?.innerText.trim(),
                    "Monto Neto": tds[3]?.innerText.trim(),
                    "IVA Recuperable": tds[4]?.innerText.trim(),
                    "IVA Uso Común": tds[5]?.innerText.trim(),
                    "IVA No Recuperable": tds[6]?.innerText.trim(),
                    "Monto Total": tds[7]?.innerText.trim()
                };
            }).filter(r => r && r["Tipo Documento"] !== "" && parseInt(r["Total Documentos"]) > 0);
        });

        const detalles = {};
        for (const item of resumen) {
            console.log(`   📄 Extrayendo folios de: ${item["Tipo Documento"]} (${item["Total Documentos"]} docs)`);
            await page.evaluate(t => {
                const link = Array.from(document.querySelectorAll('td a')).find(a => a.innerText.includes(t));
                if (link) link.click();
            }, item["Tipo Documento"]);
            await new Promise(r => setTimeout(r, 4000));
            
            detalles[item["Tipo Documento"]] = await extraerTablaDetalle(page);

            await page.evaluate(() => {
                const btnVolver = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Volver'));
                if (btnVolver) btnVolver.click();
            });
            await new Promise(r => setTimeout(r, 3000));
        }
        return { resumen, detalles };
    };

    console.log("--- SECCIÓN: COMPRAS ---");
    dataFinal.compras = await procesarSeccion('COMPRA');
    console.log("\n--- SECCIÓN: VENTAS ---");
    dataFinal.ventas = await procesarSeccion('VENTA');

    return dataFinal;
}

export async function cerrarSesion(page) {
    console.log("\n🚪 [4/4] Tareas finalizadas. Cerrando sesión...");
    try {
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.toLowerCase().includes('cerrar sesi'));
            if (btn) btn.click();
            else window.location.href = 'https://misiir.sii.cl/cgi_misii/siihome.cgi?fin';
        });
        await new Promise(r => setTimeout(r, 3000));
    } catch (e) {}
}