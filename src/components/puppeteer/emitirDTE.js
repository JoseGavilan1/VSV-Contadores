import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { 
  loginSii, 
  seleccionarEmpresa, 
  setupPage, 
  BROWSER_OPTS, 
  clickByExactText, 
  sleep,
  waitForPdfPage
} from "../../lib/siiBase.js";
import { delay } from "framer-motion";

const {
  DTE_RUT: RUT,
  DTE_DV: DV,
  DTE_PASS: PASS, 
  SII_PFX_PASS: SII_PASS
} = process.env;

const MODULE_CONFIG = {
  CIUDAD_EMISOR: "SANTIAGO",
  DOWNLOAD_PATH: path.resolve(process.cwd(), "./tmp")
};

export async function emitirDteConPuppeteer(dteJson) {
  const tipoDTE = String(dteJson?.TipoDTE);
  const DTE_URL = `https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=${tipoDTE}`;

  // Encabezado / Receptor
  const rutRecibido = String(dteJson?.Encabezado?.Receptor?.RUTRecep);
  const [RUT_RECEPTOR, DV_RECEPTOR]  = rutRecibido.split("-");
  const CIUDAD_RECEPTOR = dteJson?.Encabezado?.Receptor?.CdadRecep;

  // Detalle
  const { NmbItem, QtyItem, UnmdItem, PrcItem, DescuentoPct, FchEmis, DscItem } = dteJson?.Detalle || {};

  const partes = FchEmis.split("-");
  const fechaInvertida = `${partes[2]}-${partes[1]}-${partes[0]}`;

  const FORMA_PAGO = String(dteJson?.Encabezado?.IdDoc?.FmaPago || "1");

  const browser = await puppeteer.launch(BROWSER_OPTS);
  const page = await setupPage(browser);

  try {
    // 1. Login y Selección de Empresa
    await loginSii(page, RUT, DV, PASS);
    await seleccionarEmpresa(page, "VOLLAIRE Y OLIVOS");
    
    // 2. Navegar al Formulario de Emisión
    await page.goto(DTE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true });

    // 3. Identificación del Receptor
    await page.type('#EFXP_RUT_RECEP', RUT_RECEPTOR, { delay: 20 });
    await page.keyboard.press('Tab');
    await page.keyboard.type(DV_RECEPTOR, { delay: 20 });
    await page.keyboard.press('Enter');

    await sleep(250);

    // 4. Fecha de Emisión
    await page.waitForSelector('input[name="EFXP_FCH_EMIS"]', { visible: true });
    await page.type('input[name="EFXP_FCH_EMIS"]', fechaInvertida, { delay: 10 });

    // 5. Ciudades y Origen
    await page.waitForSelector('input[name="EFXP_CIUDAD_ORIGEN"]', { visible: true, delay: 10 });
    await page.type('input[name="EFXP_CIUDAD_ORIGEN"]', MODULE_CONFIG.CIUDAD_EMISOR, { delay: 10 });
    
    await page.waitForSelector('input[name="EFXP_CIUDAD_RECEP"]', { visible: true });

    const estaVacio = await page.$eval(
      'input[name="EFXP_CIUDAD_RECEP"]',
      el => !el.value || el.value.trim() === ""
    );

    if (estaVacio) {
      await page.type('input[name="EFXP_CIUDAD_RECEP"]', CIUDAD_RECEPTOR, { delay: 20 });
    }

    // 6. Detalle del Producto (Interactuando con la tabla dinámica)
    await page.click('td[data-title="Nombre Prod"]');
    await page.keyboard.type(String(NmbItem), { delay: 15 });

    if (DscItem && DscItem !== "null") {
      await page.click('td[data-title="Descrip"]');
      await page.keyboard.type(String(DscItem), { delay: 10 });
    }

    await page.click('td[data-title="Cantidad"]');
    await page.keyboard.type(String(QtyItem));

    await page.click('td[data-title="Unidad"]');
    await page.keyboard.type(String(UnmdItem));

    await page.click('td[data-title="Precio"]');
    await page.keyboard.type(String(PrcItem));

    if (DescuentoPct && DescuentoPct !== "0") {
      await page.click('td[data-title="% Desc."]'); 
      await page.type('input[name="EFXP_PCTD_01"]', String(DescuentoPct));
      await page.keyboard.press('Tab');
    }

    // 6. Forma de Pago y Validación
    await page.select('select[name="EFXP_FMA_PAGO"]', FORMA_PAGO);
    await sleep(1000);

    //
    // Falta hacer las pruebas para validar que la 
    // optimización se hizo de manera correcta,
    // pero necesitamos rut para emitir facturas
    //

    await clickByExactText(page, 'Validar y visualizar');

    /*
    // 7. Proceso de Firma Electrónica
    await clickByExactText(page, 'Firmar');
    await clickByExactText(page, 'Firmar');
    await page.waitForSelector('input#myPass', { visible: true });
    await page.type('input#myPass', SII_PASS, { delay: 20 });
    
    await clickByExactText(page, 'Firmar'); 

    // 8. Captura Binaria del PDF
    const pdfPagePromise = waitForPdfPage(browser);
    await clickByExactText(page, 'Ver Documento');
    const pdfPage = await pdfPagePromise;

    // Extraemos el PDF usando la sesión activa del navegador
    const result = await pdfPage.evaluate(async () => {
      const response = await fetch(window.location.href);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ base64: reader.result.split(',')[1], size: blob.size });
        reader.readAsDataURL(blob);
      });
    });

    const finalBuffer = Buffer.from(result.base64, 'base64');

    // Validación de integridad (Magic Bytes)
    if (finalBuffer.toString('utf8', 0, 4) !== '%PDF') {
      throw new Error("El archivo capturado no es un PDF válido.");
    }

    // 9. Guardado Final
    if (!fs.existsSync(MODULE_CONFIG.DOWNLOAD_PATH)) {
      await fs.promises.mkdir(MODULE_CONFIG.DOWNLOAD_PATH, { recursive: true });
    }

    const fileName = `FACTURA_FOLIO_${Date.now()}.pdf`;
    const finalPath = path.join(MODULE_CONFIG.DOWNLOAD_PATH, fileName);
    await fs.promises.writeFile(finalPath, finalBuffer);
    */

    return { ok: true, mensaje: "DTE emitido exitosamente.", path: finalPath };
  } catch (err) {
    console.error(`❌ Error en Emisión: ${err.message}`);
    return { ok: false, error: err.message };
  } /* finally {
    if (browser) await browser.close();
  } */
}

