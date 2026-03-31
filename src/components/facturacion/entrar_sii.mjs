import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

// Función auxiliar para manejar las caídas del SII y recargar la página
async function navegarAEmision(page) {
    let exito = false;
    let intentos = 0;
    
    while (!exito && intentos < 5) {
        try {
            console.log(`Intentando acceder al formulario (Intento ${intentos + 1})...`);
            await page.goto('https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=33&TIPO=4', { 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });
            
            // Verificar si Chrome arrojó la pantalla de error de privacidad/SSL
            const btnReload = await page.$('#reload-button');
            if (btnReload) {
                console.log('Detectado error de red de Chrome. Refrescando...');
                await page.click('#reload-button');
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
            }
            
            exito = true; 
        } catch (error) {
            console.log(`Error de conexión detectado: ${error.message}. Reintentando en 3 segundos...`);
            intentos++;
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    if (!exito) {
        throw new Error('No se pudo acceder al portal del SII después de varios reintentos.');
    }
}

// Configuración del navegador
const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized', '--ignore-certificate-errors'] 
});

const page = await browser.newPage();
const reporteResultados = [];

// ==========================================
// LISTA DE FACTURAS A EMITIR
// ==========================================
const facturasAProcesar = [
    {
        rutReceptor: '77871935',
        dvReceptor: '5',
        ciudadEmisor: 'Santiago',   
        telefonoEmisor: '56978278733', 
        ciudadReceptor: 'Santiago', 
        contactoReceptor: 'mcorvalan@mcbconsultores.cl', 
        rutSolicita: '14143766',    
        dvSolicita: '6',
        producto: {
            nombre: 'Plan EXECUTIVE',      
            cantidad: '1',
            unidad: '1',
            precio: '50000',
            descripcion: 'Marzo'
        }
    }
];

try {
  // 1. INGRESO Y SELECCIÓN DE EMPRESA
  console.log('>>> INICIANDO SESIÓN EN EL SII...');
  await navegarAEmision(page);

  const inputRutExiste = await page.$('#rutcntr');
  if (inputRutExiste) {
      const rutCompleto = `${process.env.DTE_RUT}-${process.env.DTE_DV}`;
      await page.type('#rutcntr', rutCompleto);
      await page.type('#clave', process.env.DTE_PASS);

      await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click('#bt_ingresar')
      ]);

      const selectEmpresa = 'select[name="RUT_EMP"]';
      await page.waitForSelector(selectEmpresa, { visible: true });
      await page.select(selectEmpresa, '78306207-0');

      const btnSubmitFormulario = 'button[type="submit"], input[type="submit"]'; 
      const btnExiste = await page.$(btnSubmitFormulario);
      if (btnExiste) {
          await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2' }),
              page.click(btnSubmitFormulario)
          ]);
      }
  }

  // 2. CICLO MASIVO DE EMISIÓN
  for (let i = 0; i < facturasAProcesar.length; i++) {
      const datos = facturasAProcesar[i];
      console.log(`\nProcesando Factura ${i + 1} de ${facturasAProcesar.length}...`);

      await navegarAEmision(page);
      await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true });

      // Llenado de datos (RUT, Ciudad, Contacto, etc.)
      await page.type('#EFXP_RUT_RECEP', datos.rutReceptor);
      await page.type('#EFXP_DV_RECEP', datos.dvReceptor);
      await page.keyboard.press('Tab');
      await new Promise(resolve => setTimeout(resolve, 2500));

      await page.evaluate(() => document.querySelector('input[name="EFXP_CIUDAD_ORIGEN"]').value = '');
      await page.type('input[name="EFXP_CIUDAD_ORIGEN"]', datos.ciudadEmisor);
      await page.type('input[name="EFXP_FONO_EMISOR"]', datos.telefonoEmisor);
      await page.type('input[name="EFXP_CIUDAD_RECEP"]', datos.ciudadReceptor);
      await page.type('input[name="EFXP_CONTACTO"]', datos.contactoReceptor);
      await page.type('input[name="EFXP_RUT_SOLICITA"]', datos.rutSolicita);
      await page.type('input[name="EFXP_DV_SOLICITA"]', datos.dvSolicita);

      // Llenado de producto
      await page.type('input[name="EFXP_NMB_01"]', datos.producto.nombre);
      await page.type('input[name="EFXP_QTY_01"]', datos.producto.cantidad);
      await page.type('input[name="EFXP_UNMD_01"]', datos.producto.unidad);
      await page.type('input[name="EFXP_PRC_01"]', datos.producto.precio);
      
      await page.keyboard.press('Tab'); 
      await page.click('input[name="DESCRIP_01"]');
      await new Promise(resolve => setTimeout(resolve, 500)); 

      const textareaDesc = 'textarea[name="EFXP_DSC_ITEM_01"]';
      await page.type(textareaDesc, datos.producto.descripcion);
      await page.select('select[name="EFXP_FMA_PAGO"]', '1');

      // Visualizar y Firmar
      await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click('button[name="Button_Update"]')
      ]);

      await page.waitForSelector('input[name="btnSign"]', { visible: true });
      await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click('input[name="btnSign"]')
      ]);

      // Password de Firma
      await page.waitForSelector('#myPass', { visible: true });
      await page.type('#myPass', process.env.SII_PFX_PASS);
      await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click('#btnFirma')
      ]);

      // Captura de Folio
      await new Promise(resolve => setTimeout(resolve, 2000));
      const textoFactura = await page.evaluate(() => {
          const elementosB = Array.from(document.querySelectorAll('b'));
          const objetivo = elementosB.find(el => el.textContent.includes('FACTURA ELECTRÓNICA') && el.textContent.includes('N°'));
          return objetivo ? objetivo.innerText : '';
      });
      const match = textoFactura.match(/N°\s*(\d+)/);
      let folio = match ? match[1] : "No obtenido";
      
      reporteResultados.push({ Rut: datos.rutReceptor, Folio: folio });
      console.log(`✅ Folio obtenido: ${folio}`);

      // Acción de volver (Solo si quedan más facturas o para cumplir el flujo)
      const btnVolver = 'input[value="Volver"]';
      if (await page.$(btnVolver)) {
          await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
              page.click(btnVolver)
          ]);
      }
  }

  // ==========================================
  // 3. REPETICIÓN FINAL Y PAUSA (Tu requerimiento)
  // ==========================================
  console.log('\n>>> Iniciando retorno final para salida manual...');
  
  // Seleccionamos "Factura Electrónica" nuevamente (vía URL de emisión)
  await navegarAEmision(page); 
  
  // Esperamos a que cargue el formulario de "Nueva Factura"
  await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true });

  console.log('----------------------------------------------------');
  console.log('PROCESO COMPLETADO: El sistema entró a "Nueva Factura".');
  console.log('IDLE: No se realizarán más acciones.');
  console.log('Ahora puedes salir del SII manualmente.');
  console.log('----------------------------------------------------');
  console.table(reporteResultados);

} catch (error) {
  console.error('Error crítico:', error);
} finally {
  // Mantenemos el navegador abierto
  // await browser.close();
}