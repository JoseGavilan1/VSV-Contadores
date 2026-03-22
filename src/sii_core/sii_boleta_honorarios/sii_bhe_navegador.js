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

    await matarPopups(page);
}

export async function navegarABoletas(page, tipo = 'EMITIDAS') {
    console.log(`📂 [2/4] Navegando a la sección de Boletas de Honorarios ${tipo}...`);
    
    // URL exacta proporcionada
    await page.goto('https://www.sii.cl/servicios_online/1040-1287.html', { waitUntil: 'networkidle2' });
    
    await page.evaluate((tipoConsulta) => {
        const enlaces = Array.from(document.querySelectorAll('a'));
        let targetText = tipoConsulta === 'RECIBIDAS' 
            ? 'Consultar boletas recibidas' 
            : 'Consultar boletas emitidas';
            
        const link = enlaces.find(a => a.innerText.trim().toLowerCase() === targetText.toLowerCase());
        if (link) link.click();
    }, tipo);

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await matarPopups(page);
}

export async function extraerResumenAnual(page, anio) {
    console.log(`🔍 [3/4] Consultando el año ${anio} en el informe Anual...`);
    
    // 1. Llenar el formulario "Anual" y hacer clic en SU botón Consultar
    await page.evaluate((anioSeleccion) => {
        const filas = document.querySelectorAll('tr');
        for (const fila of filas) {
            // Buscamos la fila que dice "Anual"
            if (fila.innerText.includes('Anual') && fila.innerText.includes('Informe Anual')) {
                const selectAnio = fila.querySelector('select');
                if (selectAnio) {
                    for (let i = 0; i < selectAnio.options.length; i++) {
                        if (selectAnio.options[i].text.trim() === String(anioSeleccion)) {
                            selectAnio.selectedIndex = i;
                            selectAnio.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        }
                    }
                }
                
                // Buscar el botón consultar dentro de esta misma fila
                const btnConsultar = fila.querySelector('input[type="button"], input[type="submit"], button');
                if (btnConsultar) {
                    btnConsultar.click();
                }
                break; // Terminamos de buscar
            }
        }
    }, anio);

    // Esperar a que cargue la tabla resumen de la última imagen
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log(`      📑 Extrayendo tabla de INFORME ANUAL DE BOLETAS...`);

    // 2. Extraer exactamente los datos de la tabla solicitada
    const tablaExtraida = await page.evaluate(() => {
        const filas = document.querySelectorAll('table tr');
        const datos = [];
        
        // Palabras clave para identificar las filas que nos interesan
        const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'TOTALES:'];

        filas.forEach(fila => {
            const celdas = Array.from(fila.querySelectorAll('td, th')).map(c => c.innerText.trim());
            
            // La tabla de la imagen tiene 9 columnas en total para los meses
            // Validamos que la fila tenga suficientes columnas y que la primera celda sea un mes o la palabra Totales
            if (celdas.length >= 8 && meses.some(m => celdas[0].toUpperCase().includes(m))) {
                
                // Dependiendo de cómo el SII dibuje la tabla vacía (a veces une celdas), 
                // mapeamos las columnas en el orden de la imagen
                datos.push({
                    periodo: celdas[0] || "",
                    foliosInicial: celdas[1] || "",
                    foliosFinal: celdas[2] || "",
                    emisionesVigentes: celdas[3] || "0",
                    emisionesAnuladas: celdas[4] || "0",
                    honorarioBruto: celdas[5] || "0",
                    retencionTerceros: celdas[6] || "0",
                    retencionContribuyente: celdas[7] || "0",
                    totalLiquido: celdas[8] || "0"
                });
            }
        });
        return datos;
    });

    if (tablaExtraida.length === 0) {
        console.log("   ❌ No se encontró la tabla de informe anual en el DOM.");
    } else {
        console.log(`   ✔️ Se extrajeron ${tablaExtraida.length} filas (Meses + Totales).`);
    }

    return tablaExtraida;
}

export async function cerrarSesion(page) {
    console.log("\n🚪 [4/4] Tareas finalizadas. Cerrando sesión...");
    try {
        await page.goto('https://misiir.sii.cl/cgi_misii/siihome.cgi?fin', { waitUntil: 'networkidle2' });
    } catch (e) {}
}