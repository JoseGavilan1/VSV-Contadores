import 'dotenv/config';

// 🛡️ Destructor de Pop-ups intrusivos
async function matarPopups(page) {
    try {
        await page.evaluate(() => {
            const modales = document.querySelectorAll('.modal-content, .modal-dialog, .ui-dialog');
            for (const m of modales) {
                if (m.innerText.includes('IMPORTANTE') || m.innerText.includes('modelo de emisión')) {
                    const btnCerrar = Array.from(m.querySelectorAll('button')).find(b => b.innerText.toUpperCase().includes('CERRAR'));
                    if (btnCerrar) btnCerrar.click();
                }
                if (m.innerText.toUpperCase().includes('ACTUALIZAR MÁS TARDE')) {
                    const btnAct = Array.from(m.querySelectorAll('button')).find(b => b.innerText.toUpperCase().includes('ACTUALIZAR MÁS TARDE'));
                    if (btnAct) btnAct.click();
                }
            }
        });
        await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}
}

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

    await matarPopups(page);
}

export async function prepararYConsultarRCV(page, anio, mes) {
    console.log(`📂 [2/4] Consultando RCV periodo: ${mes}/${anio}...`);
    await page.goto('https://www4.sii.cl/consdcvinternetui/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));

    await matarPopups(page);

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

// 🚀 EXTRACCIÓN MAESTRA SIN LÍMITES: Extrae todo el interior del modal para Compras y Ventas
async function extraerTablaDetalle(page) {
    let resultados = [];
    let hayMasPaginas = true;
    let numeroPagina = 1;

    while (hayMasPaginas) {
        console.log(`         📑 Escaneando Página ${numeroPagina}...`);
        await new Promise(r => setTimeout(r, 1000));

        // Contar solo las filas visibles que contengan un enlace puramente numérico (el Folio)
        const cantidadFolios = await page.evaluate(() => {
            const trsVisibles = Array.from(document.querySelectorAll('table tbody tr')).filter(tr => tr.offsetParent !== null);
            return trsVisibles.filter(tr => Array.from(tr.querySelectorAll('a')).some(a => /^[\d.]+$/.test(a.innerText.trim()))).length;
        });

        for (let i = 0; i < cantidadFolios; i++) {
            // 1. Clic infalible (Francotirador de Folios)
            const folioClickeado = await page.evaluate((idx) => {
                const trsVisibles = Array.from(document.querySelectorAll('table tbody tr')).filter(tr => tr.offsetParent !== null);
                const filasConFolio = trsVisibles.filter(tr => Array.from(tr.querySelectorAll('a')).some(a => /^[\d.]+$/.test(a.innerText.trim())));
                
                if (filasConFolio[idx]) {
                    const links = Array.from(filasConFolio[idx].querySelectorAll('a'));
                    const folioLink = links.find(a => /^[\d.]+$/.test(a.innerText.trim()));
                    
                    if (folioLink) {
                        folioLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        folioLink.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
                        return folioLink.innerText.trim();
                    }
                }
                return null;
            }, i);

            if (!folioClickeado) continue; 

            console.log(`            🔍 👉 Extrayendo Modal del Folio [${folioClickeado}] (${i+1}/${cantidadFolios})...`);

            try {
                // 2. Esperar modal y la inyección de datos del SII
                await page.waitForSelector('.modal-content', { visible: true, timeout: 8000 });
                await new Promise(r => setTimeout(r, 2500)); 
                
                // 3. Extraer la tabla pura
                const datosDocumento = await page.evaluate(() => {
                    const modal = document.querySelector('.modal-content');
                    if (!modal) return {};
                    const info = {};
                    
                    const filasTabla = Array.from(modal.querySelectorAll('tr, .row'));
                    filasTabla.forEach(fila => {
                        const tds = Array.from(fila.querySelectorAll('td, th, div.ng-binding')).map(el => el.innerText.trim());
                        if (tds.length >= 2) {
                            const clave = tds[0].replace(/:/g, '').trim();
                            const valor = tds[1].replace(/^:\s*/, '').trim();
                            if (clave && clave !== "") info[clave] = valor;
                        }
                    });

                    if (Object.keys(info).length === 0) {
                        const lineas = modal.innerText.split('\n');
                        lineas.forEach(linea => {
                            if (linea.includes(':')) {
                                const partes = linea.split(':');
                                const clave = partes[0].trim();
                                const valor = partes.slice(1).join(':').trim();
                                if (clave && clave !== "") info[clave] = valor;
                            }
                        });
                    }
                    return info;
                });

                resultados.push(datosDocumento);

                // 4. Cerrar modal
                await page.evaluate(() => {
                    const btnClose = document.querySelector('.modal-header .close, button[ng-click="cerrar()"], .close');
                    if (btnClose) btnClose.click();
                });
                await new Promise(r => setTimeout(r, 800));

            } catch (e) {
                console.log(`            ⚠️ Omitiendo Folio [${folioClickeado}]: El SII no respondió a tiempo.`);
                await page.evaluate(() => {
                    const btnClose = document.querySelector('.modal-header .close, button[ng-click="cerrar()"], .close');
                    if (btnClose) btnClose.click();
                }).catch(() => {});
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // 5. Paginación Infinita
        hayMasPaginas = await page.evaluate(() => {
            const btnSig = Array.from(document.querySelectorAll('a, button')).find(el => el.innerText.includes('Página siguiente') && el.offsetParent !== null);
            if (btnSig && !btnSig.closest('li')?.classList.contains('disabled')) {
                btnSig.click();
                return true;
            }
            return false;
        });
        
        if (hayMasPaginas) {
            console.log(`         ➡️ Pasando a la siguiente página...`);
            numeroPagina++;
            await new Promise(r => setTimeout(r, 3500)); 
        }
    }
    
    console.log(`         ✅ Extracción completada para todos los folios de este documento.`);
    return resultados;
}

export async function escanearTodoElPortal(page) {
    console.log("🔍 [3/4] Escaneando TODO EL PORTAL (Compras, Ventas y Descargas)...");
    const dataFinal = { compras: {}, ventas: {}, descargasDiferidas: {} };

    // ==========================================
    // 1. SECCIÓN COMPRAS
    // ==========================================
    console.log("\n🛒 --- SECCIÓN COMPRAS ---");
    await matarPopups(page);
    await page.evaluate(() => {
        const tabCompra = Array.from(document.querySelectorAll('ul.nav li a')).find(a => a.innerText.trim().toUpperCase() === 'COMPRA');
        if (tabCompra) tabCompra.click();
    });
    await new Promise(r => setTimeout(r, 4000));

    const subPestanasCompras = ['Registro', 'Pendientes', 'No Incluir', 'Reclamados'];
    for (const sub of subPestanasCompras) {
        console.log(`\n   📂 Revisando sub-pestaña Compras: ${sub}...`);
        await page.evaluate(s => {
            const subTab = Array.from(document.querySelectorAll('ul.nav-pills li a, a.ng-binding')).find(a => a.innerText.trim() === s);
            if (subTab) subTab.click();
        }, sub);
        await new Promise(r => setTimeout(r, 4000));

        const sinInfo = await page.evaluate(s => document.body.innerText.includes(`No hay información de ${s}`) || document.body.innerText.includes('Sin información'), sub);

        if (sinInfo) {
            dataFinal.compras[sub] = "Sin información";
            console.log(`      ❌ [${sub}]: Sin información.`);
            continue;
        }

        const resumen = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length < 2) return null;
                return {
                    "Tipo Documento": tds[0]?.innerText.trim(),
                    "Total Documentos": tds[1]?.innerText.trim(),
                    "Monto Exento": tds[2]?.innerText.trim(),
                    "Monto Neto": tds[3]?.innerText.trim(),
                    "Monto IVA": tds[4]?.innerText.trim() || "0",
                    "Monto Total": tds[5]?.innerText.trim() || tds[tds.length-1]?.innerText.trim() || "0"
                };
            }).filter(r => r && r["Tipo Documento"] !== "" && parseInt(r["Total Documentos"]) > 0);
        });

        dataFinal.compras[sub] = { resumen, detalles: {} };

        for (const item of resumen) {
            console.log(`      📄 INICIANDO TIPO DE COMPRA: ${item["Tipo Documento"]} (${item["Total Documentos"]} docs)`);
            await page.evaluate(t => {
                const link = Array.from(document.querySelectorAll('td a')).find(a => a.innerText.includes(t));
                if (link) link.click();
            }, item["Tipo Documento"]);
            await new Promise(r => setTimeout(r, 4000));

            const alertaModal = await page.evaluate(() => {
                const modal = document.querySelector('.modal-dialog, .modal-content');
                if (modal && modal.innerText.includes('No se encontraron documentos para descargar')) {
                    const btn = modal.querySelector('button.btn-danger, button.close, button');
                    if (btn) btn.click();
                    return true;
                }
                return false;
            });

            if (alertaModal) {
                console.log(`         ⚠️ Alerta detectada. Omitiendo ${item["Tipo Documento"]}.`);
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }
            
            dataFinal.compras[sub].detalles[item["Tipo Documento"]] = await extraerTablaDetalle(page);

            await page.evaluate(() => {
                const btnVolver = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Volver'));
                if (btnVolver) btnVolver.click();
            });
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    // ==========================================
    // 2. SECCIÓN VENTAS
    // ==========================================
    console.log("\n📈 --- SECCIÓN VENTAS ---");
    await matarPopups(page);
    await page.evaluate(() => {
        const tabVenta = Array.from(document.querySelectorAll('ul.nav li a')).find(a => a.innerText.trim().toUpperCase() === 'VENTA');
        if (tabVenta) tabVenta.click();
    });
    await new Promise(r => setTimeout(r, 4500)); 

    const sinInfoVentas = await page.evaluate(() => document.body.innerText.includes('Sin información') || document.body.innerText.includes('No hay información'));

    if (sinInfoVentas) {
        dataFinal.ventas = "Sin información";
        console.log(`   ❌ [VENTA]: Sin información.`);
    } else {
        const resumenVentas = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length < 2) return null;
                return {
                    "Tipo Documento": tds[0]?.innerText.trim(),
                    "Total Documentos": tds[1]?.innerText.trim(),
                    "Monto Exento": tds[2]?.innerText.trim(),
                    "Monto Neto": tds[3]?.innerText.trim(),
                    "Monto IVA": tds[4]?.innerText.trim() || "0",
                    "Monto Total": tds[5]?.innerText.trim() || tds[tds.length-1]?.innerText.trim() || "0"
                };
            }).filter(r => r && r["Tipo Documento"] !== "" && parseInt(r["Total Documentos"]) > 0);
        });

        dataFinal.ventas = { resumen: resumenVentas, detalles: {} };

        for (const item of resumenVentas) {
            console.log(`      📄 INICIANDO TIPO DE VENTA: ${item["Tipo Documento"]} (${item["Total Documentos"]} docs)`);
            await page.evaluate(t => {
                const link = Array.from(document.querySelectorAll('td a')).find(a => a.innerText.includes(t));
                if (link) link.click();
            }, item["Tipo Documento"]);
            await new Promise(r => setTimeout(r, 4000));

            const alertaModal = await page.evaluate(() => {
                const modal = document.querySelector('.modal-dialog, .modal-content');
                if (modal && modal.innerText.includes('No se encontraron documentos para descargar')) {
                    const btn = modal.querySelector('button.btn-danger, button.close, button');
                    if (btn) btn.click();
                    return true;
                }
                return false;
            });

            if (alertaModal) {
                console.log(`         ⚠️ Alerta detectada. Omitiendo ${item["Tipo Documento"]}.`);
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }
            
            dataFinal.ventas.detalles[item["Tipo Documento"]] = await extraerTablaDetalle(page);

            await page.evaluate(() => {
                const btnVolver = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Volver'));
                if (btnVolver) btnVolver.click();
            });
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    // ==========================================
    // 3. DESCARGAS DIFERIDAS
    // ==========================================
    console.log("\n📥 --- SECCIÓN DESCARGAS DIFERIDAS ---");
    await matarPopups(page);
    await page.evaluate(() => {
        const tab = Array.from(document.querySelectorAll('ul.nav li a')).find(a => a.innerText.includes('Descargas Diferidas'));
        if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 4000));

    dataFinal.descargasDiferidas = await page.evaluate(() => {
        let estado = "Revisado";
        if (document.body.innerText.includes('Sin Consultas')) {
            estado = "Sin Consultas";
        }
        return { estadoGeneral: estado };
    });
    console.log(`   ✔️ Estado Descargas: ${dataFinal.descargasDiferidas.estadoGeneral}`);

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

//funciona