export async function extraerTablaFoliosEmitidos(page) {
    console.log("📂 [2/2] Yendo a la tabla de documentos EMITIDOS...");
    
    console.log("🏢 Seleccionando la empresa...");
    await page.goto('https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=2&TIPO=4', { waitUntil: 'networkidle2' });
    
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
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

    let facturasExtraidas = [];
    let paginaActual = 1;
    let hayMasDatos = true;
    let primerFolioAnterior = null; 

    while (hayMasDatos) {
        console.log(`⏳ Consultando página ${paginaActual}...`);
        const urlPaginada = `https://www1.sii.cl/cgi-bin/Portal001/mipeAdminDocsEmi.cgi?RUT_RECP=&FOLIO=&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=&ESTADO=&ORDEN=&NUM_PAG=${paginaActual}`;
        await page.goto(urlPaginada, { waitUntil: 'networkidle2', timeout: 60000 });

        try {
            await page.waitForSelector('table tbody tr', { timeout: 15000 });
        } catch (e) {
            break; 
        }

        const datosPagina = await page.evaluate(() => {
            const lista = [];
            const filas = document.querySelectorAll('table tbody tr'); 
            filas.forEach(fila => {
                const celdas = fila.querySelectorAll('td');
                if (celdas.length >= 8) { 
                    const rutReceptor = celdas[1]?.innerText.trim();
                    const razonSocial = celdas[2]?.innerText.trim();
                    const documento = celdas[3]?.innerText.trim(); 
                    const folio = celdas[4]?.innerText.trim();
                    const fecha = celdas[5]?.innerText.trim();     
                    const montoTotal = celdas[6]?.innerText.trim();
                    const estado = celdas[7]?.innerText.trim();    

                    if (rutReceptor && folio && !isNaN(folio)) {
                        lista.push({ rutReceptor, razonSocial, documento, folio, fecha, montoTotal, estado, procesado: false });
                    }
                }
            });
            return lista;
        });

        if (datosPagina.length === 0) {
            hayMasDatos = false; 
        } else {
            const primerFolioActual = datosPagina[0].folio;
            if (primerFolioAnterior === primerFolioActual) break; 
            primerFolioAnterior = primerFolioActual; 

            facturasExtraidas = facturasExtraidas.concat(datosPagina);
            paginaActual++;
            await new Promise(r => setTimeout(r, 1000)); 
        }
    }
    
    console.log(`\n✅ ¡Extracción de tabla completa! Total folios capturados: ${facturasExtraidas.length}`);
    return facturasExtraidas;
}