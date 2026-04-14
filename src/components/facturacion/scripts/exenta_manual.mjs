import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

// Helper para pausas exactas
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function navegarAEmisionExenta(page) {
    let exito = false;
    let intentos = 0;
    while (!exito && intentos < 5) {
        try {
            // URL ACTUALIZADA PARA FACTURA EXENTA (DTE 34)
            await page.goto('https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=34&TIPO=4', { 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });
            exito = true; 
        } catch (error) {
            intentos++;
            console.log(`⚠️ Intento ${intentos} de acceder a Emisión Exenta falló. Reintentando...`);
            await delay(3000);
        }
    }
    if (!exito) throw new Error('No se pudo acceder al portal del SII para Exentas.');
}

// Función auxiliar para escribir a velocidad humana
const limpiarYTipar = async (page, selector, texto) => {
    if (!texto) return; 
    await page.waitForSelector(selector, { visible: true });
    await page.click(selector, { clickCount: 3 }); 
    await page.keyboard.press('Backspace');        
    await page.type(selector, texto, { delay: 50 }); 
};

// 🚀 Exportamos la función para que el servidor pueda usarla
export async function emitirExentaPuppeteer(datos) {
    const browser = await puppeteer.launch({ 
    headless: false, // <--- ¡CAMBIA ESTO A FALSE! 👀
    defaultViewport: null, 
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--start-maximized', 
        '--disable-blink-features=AutomationControlled'
    ] 
});

    const page = await browser.newPage();
    
    try {
        console.log('>>> Iniciando proceso de facturación EXENTA...');
        await navegarAEmisionExenta(page);

        // ==============================================================
        // 1. LOGIN Y SELECCIÓN DE EMPRESA (IDÉNTICO A FACTURA NORMAL)
        // ==============================================================
        const inputRutExiste = await page.$('#rutcntr');
        if (inputRutExiste) {
            console.log(`🔑 Entrando al SII con RUT: ${process.env.DTE_RUT}`);
            
            await page.type('#rutcntr', `${process.env.DTE_RUT}-${process.env.DTE_DV}`, { delay: 50 });
            await page.type('#clave', process.env.DTE_PASS, { delay: 50 });
            await Promise.all([page.waitForNavigation(), page.click('#bt_ingresar')]);
            
            await delay(1500); 

            // PREGUNTA DEL SII: "¿A nombre de quién facturas?"
            const selectBox = await page.$('select[name="RUT_EMP"]');
            if (selectBox) {
                console.log('🏢 Selector de empresas detectado. Buscando...');
                await page.waitForSelector('select[name="RUT_EMP"]');
                
                // Extraemos dinámicamente el valor de la empresa (Ejemplo genérico, puedes ajustarlo si necesitas siempre la 2da)
                // Aquí dejé la lógica que busca la empresa por el RUT que viene en 'datos.empresaRut' si lo envías, 
                // o toma la segunda como tenías antes.
                const valueEmpresa = await page.evaluate((rutBuscado) => {
                    const selectElement = document.querySelector('select[name="RUT_EMP"]');
                    if (selectElement && selectElement.options.length > 0) {
                        
                        // Si nos pasaron un RUT, lo buscamos
                        if (rutBuscado) {
                             for (let i = 0; i < selectElement.options.length; i++) {
                                 if (selectElement.options[i].text.includes(rutBuscado)) {
                                     return selectElement.options[i].value;
                                 }
                             }
                        }

                        // Lógica original: Forzar la 2da empresa
                        let targetIndex = 1;
                        if (selectElement.options[0].text.toLowerCase().includes('seleccione')) {
                            if (selectElement.options.length > 2) targetIndex = 2;
                        } else {
                            if (selectElement.options.length > 1) targetIndex = 1;
                        }
                        return selectElement.options[targetIndex].value;
                    }
                    return null;
                }, datos.empresaRut); // Puedes pasar datos.empresaRut desde tu backend

                if (valueEmpresa) {
                    console.log(`✅ Seleccionando empresa (Value: ${valueEmpresa})...`);
                    await page.click('select[name="RUT_EMP"]');
                    await delay(500);
                    await page.select('select[name="RUT_EMP"]', valueEmpresa);
                    await delay(500);
                    
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2' }),
                        page.evaluate(() => {
                            const btnSubmit = document.querySelector('button[type="submit"], input[type="submit"]');
                            if (btnSubmit) btnSubmit.click();
                        })
                    ]);
                } else {
                    console.log('⚠️ No se encontró la empresa en la lista.');
                }
            }
        }

        // ==============================================================
        // 2. LLENADO DEL FORMULARIO DE EXENTA
        // ==============================================================
        console.log(`📝 Ingresando datos del cliente: ${datos.rutReceptor}-${datos.dvReceptor}`);
        
        // Nos aseguramos de estar en la URL de Exentas por si el login nos desvió
        await navegarAEmisionExenta(page);
        await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true, timeout: 45000 });
        await delay(1000); 

        // RUT Cliente
        await page.click('#EFXP_RUT_RECEP');
        await page.type('#EFXP_RUT_RECEP', datos.rutReceptor, { delay: 50 });
        await page.type('#EFXP_DV_RECEP', datos.dvReceptor, { delay: 50 });
        await page.keyboard.press('Tab');
        
        console.log('⏳ Esperando que el SII cargue la Razón Social automáticamente...');
        await delay(6000); 

        // Resto de datos del Cliente
        await limpiarYTipar(page, 'input[name="EFXP_CIUDAD_ORIGEN"]', datos.ciudadEmisor);
        await limpiarYTipar(page, 'input[name="EFXP_FONO_EMISOR"]', datos.telefonoEmisor);
        await limpiarYTipar(page, 'input[name="EFXP_CIUDAD_RECEP"]', datos.ciudadReceptor);
        await limpiarYTipar(page, 'input[name="EFXP_CONTACTO"]', datos.contactoReceptor);
        
        if (datos.rutSolicita && datos.dvSolicita) {
            await limpiarYTipar(page, 'input[name="EFXP_RUT_SOLICITA"]', datos.rutSolicita);
            await limpiarYTipar(page, 'input[name="EFXP_DV_SOLICITA"]', datos.dvSolicita);
        }

        // DATOS DEL SERVICIO EXENTO
        console.log('🛍️ Ingresando detalles del servicio exento...');
        await page.type('input[name="EFXP_NMB_01"]', datos.producto.nombre, { delay: 50 });
        await page.type('input[name="EFXP_QTY_01"]', datos.producto.cantidad, { delay: 50 });
        await page.type('input[name="EFXP_UNMD_01"]', datos.producto.unidad, { delay: 50 });
        
        // En exentas, EFXP_PRC_01 sigue siendo el precio unitario
        await limpiarYTipar(page, 'input[name="EFXP_PRC_01"]', String(datos.producto.precio));
        
        const checkbox = await page.waitForSelector('input[name="DESCRIP_01"]', { visible: true });
        await checkbox.click(); 
        
        try {
            await page.waitForSelector('textarea[name="EFXP_DSC_ITEM_01"]', { visible: true, timeout: 5000 });
        } catch (e) {
            console.log('⚠️ Reintentando abrir cuadro de descripción...');
            await checkbox.click(); 
            await page.waitForSelector('textarea[name="EFXP_DSC_ITEM_01"]', { visible: true, timeout: 5000 });
        }

        await page.type('textarea[name="EFXP_DSC_ITEM_01"]', datos.producto.descripcion, { delay: 50 });
        await page.select('select[name="EFXP_FMA_PAGO"]', '1'); 

        // ==============================================================
        // 3. FIRMA DEL DOCUMENTO
        // ==============================================================
        console.log('✅ Validando montos de Exenta en el SII...');
        await page.click('button[name="Button_Update"]');
        await delay(3500); 
        
        // Alertas Mipyme (por si acaso también saltan en exentas)
        console.log('👀 Revisando alertas...');
        try {
            const alertaAceptada = await page.evaluate(() => {
                const botones = Array.from(document.querySelectorAll('input[type="button"], button'));
                const btnAceptar = botones.find(b => b.value.includes('Aceptar') || b.innerText.includes('Aceptar'));
                if (btnAceptar && btnAceptar.offsetParent !== null) { 
                    btnAceptar.click();
                    return true;
                }
                return false;
            });
            if (alertaAceptada) await delay(2000); 
        } catch (e) {}
        
        console.log('✍️ Intentando abrir cuadro de firma...');
        let intentosFirma = 0;
        let cajaVisible = false;

        while (intentosFirma < 5 && !cajaVisible) {
            try {
                await page.evaluate(() => {
                    const btn = document.querySelector('input[name="btnSign"]');
                    if (btn && !btn.disabled) btn.click();
                });
                await page.waitForSelector('#myPass', { visible: true, timeout: 3500 });
                cajaVisible = true;
                console.log("🎯 ¡Cajita de firma digital cargada!");
            } catch (e) {
                intentosFirma++;
                console.log(`⚠️ Intento ${intentosFirma}/5 para firmar...`);
                await page.click('button[name="Button_Update"]').catch(()=> {}); 
                await delay(2000);
            }
        }

        if (!cajaVisible) throw new Error("No cargó la caja de firma.");

        console.log('🔒 Ingresando clave del certificado...');
        await page.focus('#myPass');
        await page.type('#myPass', process.env.SII_PFX_PASS, { delay: 50 });
        await delay(500); 
        
        console.log('🚀 Emitiendo Factura Exenta...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
            page.evaluate(() => {
                const btnEnviar = document.querySelector('#btnFirma');
                if (btnEnviar) btnEnviar.click();
            })
        ]);
        
        // ==============================================================
        // 4. CAPTURA DEL FOLIO Y CIERRE
        // ==============================================================
        console.log('🔍 Buscando el Folio Exento generado...');
        let folio = null;
        for (let j = 0; j < 30; j++) {
            const text = await page.evaluate(() => document.body.innerText).catch(() => "");
            const match = text.match(/N[°º]\s*(\d+)/i) || text.match(/Folio\s*(\d+)/i);
            if (match) { 
                folio = match[1]; 
                break; 
            }
            await delay(1000); 
        }
        
        if (!folio) throw new Error("No se pudo obtener el folio de la Exenta.");
        
        console.log(`🎉 ¡Exenta Emitida! Folio: ${folio}`);
        console.log('🧹 Cerrando sesión...');
        try { 
            await page.goto('https://misiir.sii.cl/cgi_misii/siu/cgi_misii_logout', { waitUntil: 'networkidle2', timeout: 10000 }); 
        } catch (e) {}

        return { ok: true, folio: folio, tipo: 'Exenta' };
        
    } catch (error) {
        console.error(`❌ Error fatal en Puppeteer (Exenta): ${error.message}`);
        throw new Error(error.message);
    } finally {
        await browser.close(); 
    }
}