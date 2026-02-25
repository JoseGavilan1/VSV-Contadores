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

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const {
  DTE_RUT: RUT,
  DTE_DV: DV,
  DTE_PASS: PASS, 
  SII_PFX_PASS: SII_PASS
} = process.env;

const MODULE_CONFIG = {
  CIUDAD_EMISOR: "SANTIAGO",
  DOWNLOAD_PATH: path.resolve(process.cwd(), "./tmp"),
};

export async function emitirDteConPuppeteer(dteJson) {
  const tipoDTE = String(dteJson?.TipoDTE);
  const DTE_URL = `https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=${tipoDTE}`;

  // Encabezado / Receptor
  const rutRecibido = String(dteJson?.Encabezado?.Receptor?.RUTRecep);
  const [RUT_RECEPTOR, DV_RECEPTOR]  = rutRecibido.split("-");
  const CIUDAD_RECEPTOR = dteJson?.Encabezado?.Receptor?.CdadRecep || "SANTIAGO";
  const CIUDAD_EMISOR = dteJson?.Encabezado?.Emisor?.CiudadOrigen || MODULE_CONFIG.CIUDAD_EMISOR;
  const TELEFONO_EMISOR = String(dteJson?.Encabezado?.Emisor?.Telefono || "")
    .replace(/\D/g, "")
    .slice(0, 14);
  const CONTACTO_RECEPTOR = String(dteJson?.Encabezado?.Receptor?.Contacto || "").trim();
  const rutSolicitaRaw = String(
    dteJson?.Encabezado?.Emisor?.RUTSolicita || dteJson?.Encabezado?.Receptor?.RUTSolicita || ""
  )
    .toUpperCase()
    .replace(/[^0-9K]/g, "");
  const RUT_SOLICITA = rutSolicitaRaw.length > 1 ? rutSolicitaRaw.slice(0, -1).slice(0, 8) : "";
  const DV_SOLICITA = rutSolicitaRaw.length > 1 ? rutSolicitaRaw.slice(-1) : "";
  const transporte = dteJson?.Detalle?.Transporte || {};
  const PATENTE_TRANSPORTE = String(transporte?.Patente || "").trim().toUpperCase();
  const NOMBRE_CHOFER = String(transporte?.Chofer || "").trim();
  const rutTransporteRaw = String(transporte?.RUTTrans || "")
    .toUpperCase()
    .replace(/[^0-9K]/g, "");
  const RUT_TRANSPORTE = rutTransporteRaw.length > 1 ? rutTransporteRaw.slice(0, -1).slice(0, 8) : "";
  const DV_TRANSPORTE = rutTransporteRaw.length > 1 ? rutTransporteRaw.slice(-1) : "";
  const rutChoferRaw = String(transporte?.RUTChofer || "")
    .toUpperCase()
    .replace(/[^0-9K]/g, "");
  const RUT_CHOFER = rutChoferRaw.length > 1 ? rutChoferRaw.slice(0, -1).slice(0, 8) : "";
  const DV_CHOFER = rutChoferRaw.length > 1 ? rutChoferRaw.slice(-1) : "";

  // Detalle
  const { NmbItem, QtyItem, UnmdItem, PrcItem, DescuentoPct, FchEmis, DscItem } = dteJson?.Detalle || {};
  if (!FchEmis || typeof FchEmis !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(FchEmis)) {
    return { ok: false, error: "Fecha de emisión inválida. Se espera formato YYYY-MM-DD" };
  }

  const fechaSiiIso = FchEmis;

  const FORMA_PAGO = String(dteJson?.Encabezado?.IdDoc?.FmaPago || "1");

  const browser = await puppeteer.launch(BROWSER_OPTS);
  const page = await setupPage(browser);
  const siiRuntimeErrors = [];

  const onDialog = async (dialog) => {
    const message = String(dialog?.message?.() || "").trim();
    if (message) siiRuntimeErrors.push(message);
    try {
      await dialog.accept();
    } catch {}
  };

  page.on("dialog", onDialog);

  try {
    const clearAndType = async (selector, value, options = {}) => {
      if (value === undefined || value === null || String(value).trim() === "") return false;

      const { timeout = 5000, delay = 15 } = options;
      await page.waitForSelector(selector, { visible: true, timeout });
      await page.click(selector, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(selector, String(value), { delay });
      return true;
    };

    const clearAndTypeFirstAvailable = async (selectors, value) => {
      if (value === undefined || value === null || String(value).trim() === "") return false;

      for (const selector of selectors) {
        const found = await page.$(selector);
        if (found) {
          await clearAndType(selector, value);
          return true;
        }
      }

      throw new Error(`No se encontró selector para: ${selectors.join(", ")}`);
    };

    const setTextareaValueFirstAvailable = async (selectors, value) => {
      if (value === undefined || value === null || String(value).trim() === "") return false;

      for (const selector of selectors) {
        const found = await page.$(selector);
        if (!found) continue;

        await page.evaluate((sel, val) => {
          const el = document.querySelector(sel);
          if (!el) return;
          el.focus();
          el.value = "";
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.value = String(val);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.blur();
        }, selector, String(value));

        return true;
      }

      return false;
    };

    const throwIfSiiErrors = async () => {
      if (siiRuntimeErrors.length > 0) {
        throw new Error(siiRuntimeErrors[0]);
      }

      const inlineErrors = await page.evaluate(() => {
        const candidates = Array.from(
          document.querySelectorAll(
            '.alert-danger, .alert-error, .text-danger, .has-error .help-block, .error, .mensajeError, .msgError, .help-inline'
          )
        )
          .map((el) => (el.textContent || "").trim())
          .filter(Boolean)
          .filter((text) => text.length > 3);

        return Array.from(new Set(candidates));
      });

      if (inlineErrors.length > 0) {
        throw new Error(inlineErrors[0]);
      }
    };

    const throwIfSiiQueue = async () => {
      const currentUrl = String(page.url() || "").toLowerCase();
      if (currentUrl.includes("salaespera.sii.cl") || currentUrl.includes("salaespera")) {
        throw new Error("SII está en sala de espera. Intenta nuevamente en unos minutos.");
      }

      const isQueuePage = await page.evaluate(() => {
        const bodyText = (document.body?.innerText || "").toLowerCase();
        return (
          bodyText.includes("pronto será tu turno") ||
          bodyText.includes("por favor, espera en línea") ||
          bodyText.includes("salaespera.sii.cl")
        );
      });

      if (isQueuePage) {
        throw new Error("SII está saturado (sala de espera). Intenta nuevamente más tarde.");
      }
    };

    const ensureCheckedFirstAvailable = async (selectors) => {
      for (const selector of selectors) {
        const found = await page.$(selector);
        if (!found) continue;

        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return;
          if (!el.checked) el.click();
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }, selector);

        return true;
      }

      return false;
    };

    const hasTextareaValue = async (selectors, expectedValue) => {
      for (const selector of selectors) {
        const found = await page.$(selector);
        if (!found) continue;

        const ok = await page.evaluate((sel, expected) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          return String(el.value || "").trim() === String(expected || "").trim();
        }, selector, expectedValue);

        if (ok) return true;
      }

      return false;
    };

    // 1. Login y Selección de Empresa
    await loginSii(page, RUT, DV, PASS);
    await throwIfSiiQueue();
    await seleccionarEmpresa(page, "VOLLAIRE Y OLIVOS");
    await throwIfSiiQueue();
    
    // 2. Navegar al Formulario de Emisión
    await page.goto(DTE_URL, { waitUntil: 'networkidle2' });
    await throwIfSiiQueue();
    await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true });

    // 3. DATOS RECEPTOR
    // 3.1 RUT receptor
    await page.type('#EFXP_RUT_RECEP', RUT_RECEPTOR, { delay: 20 });
    await page.keyboard.press('Tab');
    await page.keyboard.type(DV_RECEPTOR, { delay: 20 });
    await page.keyboard.press('Enter');

    await sleep(250);

    // 3.2 Fecha de emisión (input type="date" => formato ISO YYYY-MM-DD)
    const fechaSelector = 'input[name="EFXP_FCH_EMIS"]';
    await page.waitForSelector(fechaSelector, { visible: true });
    await page.evaluate((selector, value) => {
      const el = document.querySelector(selector);
      if (!el) return;
      el.focus();
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.blur();
    }, fechaSelector, fechaSiiIso);

    // 3.3 Ciudad emisor / ciudad receptor
    await page.waitForSelector('input[name="EFXP_CIUDAD_ORIGEN"]', { visible: true, delay: 10 });
    await page.type('input[name="EFXP_CIUDAD_ORIGEN"]', CIUDAD_EMISOR, { delay: 10 });
    
    await page.waitForSelector('input[name="EFXP_CIUDAD_RECEP"]', { visible: true });

    const estaVacio = await page.$eval(
      'input[name="EFXP_CIUDAD_RECEP"]',
      el => !el.value || el.value.trim() === ""
    );

    if (estaVacio) {
      await page.type('input[name="EFXP_CIUDAD_RECEP"]', CIUDAD_RECEPTOR, { delay: 20 });
    }

    // 3.4 Teléfono emisor
    if (TELEFONO_EMISOR) {
      const fonoSelector = 'input[name="EFXP_FONO_EMISOR"]';
      try {
        await clearAndType(fonoSelector, TELEFONO_EMISOR);
      } catch (fonoErr) {
        console.warn(`⚠️ No se pudo completar teléfono emisor: ${fonoErr.message}`);
      }
    }

    // 3.5 Contacto receptor
    if (CONTACTO_RECEPTOR) {
      const contactoSelector = 'input[name="EFXP_CONTACTO"]';
      try {
        await clearAndType(contactoSelector, CONTACTO_RECEPTOR);
      } catch (contactoErr) {
        console.warn(`⚠️ No se pudo completar contacto receptor: ${contactoErr.message}`);
      }
    }

    // 3.6 RUT solicita (cuerpo + dígito verificador)
    if (RUT_SOLICITA && DV_SOLICITA) {
      const rutSolicitaSelector = 'input[name="EFXP_RUT_SOLICITA"]';
      const dvSolicitaSelector = 'input[name="EFXP_DV_SOLICITA"]';
      try {
        await clearAndType(rutSolicitaSelector, RUT_SOLICITA);
        await clearAndType(dvSolicitaSelector, DV_SOLICITA);
        await page.keyboard.press('Tab');
      } catch (rutSolicitaErr) {
        console.warn(`⚠️ No se pudo completar RUT solicita: ${rutSolicitaErr.message}`);
      }
    }

    await sleep(150);
    await throwIfSiiErrors();

    // 4. TRANSPORTE
    if (RUT_TRANSPORTE || PATENTE_TRANSPORTE || RUT_CHOFER || NOMBRE_CHOFER) {
      try {
        await clearAndType('input[name="EFXP_RUT_TRANSPORTE"]', RUT_TRANSPORTE);
        await clearAndTypeFirstAvailable(
          ['input[name="EFXP_DV_TRANSPORTE"]', 'input[name="EFXP_DV_TRANS"]'],
          DV_TRANSPORTE
        );
        await clearAndType('input[name="EFXP_PATENTE"]', PATENTE_TRANSPORTE);

        await clearAndType('input[name="EFXP_RUT_CHOFER"]', RUT_CHOFER);
        await clearAndTypeFirstAvailable(
          ['input[name="EFXP_DV_CHOFER"]', 'input[name="EFXP_DV_RUT_CHOFER"]'],
          DV_CHOFER
        );
        await clearAndType('input[name="EFXP_NOMBRE_CHOFER"]', NOMBRE_CHOFER);
      } catch (transporteErr) {
        console.warn(`⚠️ No se pudo completar transporte: ${transporteErr.message}`);
      }
    }

    await sleep(150);
    await throwIfSiiErrors();

    // 5. DETALLE DEL PRODUCTO
    await page.click('td[data-title="Nombre Prod"]');
    await page.keyboard.type(String(NmbItem), { delay: 15 });

    const descripcionItem = typeof DscItem === "string" ? DscItem.trim() : "";
    if (descripcionItem && descripcionItem !== "null") {
      try {
        await ensureCheckedFirstAvailable([
          'input[name="EFXP_IND_DESCRIP_01"]',
          'input[name^="EFXP_IND_DESCRIP_"]',
          '#rowDetalle_01 td[data-title="Descrip"] input[type="checkbox"]',
          'td[data-title="Descrip"] input[type="checkbox"]',
        ]);

        const wroteDescription = await setTextareaValueFirstAvailable(
          [
            'textarea[name="EFXP_DSC_ITEM_01"]',
            'textarea[name^="EFXP_DSC_ITEM_"]',
            'textarea[name="EFXP_DSC_ITE_01"]',
            'textarea[name^="EFXP_DSC_ITE_"]',
            '#rowDescripcion_01 textarea',
          ],
          descripcionItem
        );

        const persistedDescription = wroteDescription
          ? await hasTextareaValue(
              [
                'textarea[name="EFXP_DSC_ITEM_01"]',
                'textarea[name^="EFXP_DSC_ITEM_"]',
                'textarea[name="EFXP_DSC_ITE_01"]',
                'textarea[name^="EFXP_DSC_ITE_"]',
                '#rowDescripcion_01 textarea',
              ],
              descripcionItem
            )
          : false;

        if (!wroteDescription || !persistedDescription) {
          throw new Error("No se encontró textarea de descripción");
        }
      } catch (descErr) {
        try {
          await page.click('td[data-title="Descrip"]');
          await page.keyboard.down('Control');
          await page.keyboard.press('A');
          await page.keyboard.up('Control');
          await page.keyboard.press('Backspace');
          await page.keyboard.type(descripcionItem, { delay: 10 });
        } catch {
          console.warn(`⚠️ No se pudo completar descripción del producto: ${descErr.message}`);
        }
      }
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

    await sleep(150);
    await throwIfSiiErrors();

    // 6. FORMA DE PAGO
    await page.select('select[name="EFXP_FMA_PAGO"]', FORMA_PAGO);
    await sleep(1000);
    await throwIfSiiErrors();

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

    return { ok: true, mensaje: "DTE validado exitosamente." };
  } catch (err) {
    console.error(`❌ Error en Emisión: ${err.message}`);
    return { ok: false, error: err.message };
  } finally {
    page.off("dialog", onDialog);
  }
}

