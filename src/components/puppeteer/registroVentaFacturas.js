import puppeteer from "puppeteer";
import fs from 'node:fs';
import path from 'node:path';
import { RUT_EMPRESA_LOCAL } from "../../../config.js";
import { obtenerClaveSii } from "../../controllers/claveSII.js";
import { 
  loginSii, 
  seleccionarEmpresa, 
  setupPage, 
  BROWSER_OPTS, 
  clickByExactText, 
  sleep 
} from "../../lib/siiBase.js";

const MODULE_CONFIG = {
  REGISTRO_URL: "https://www4.sii.cl/consdcvinternetui/#/index",
  DESCARGA_FOLIO_URL_VENTA: "https://www1.sii.cl/cgi-bin/Portal001/mipeAdminDocsEmi.cgi?RUT_RECP=&FOLIO=&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=&ESTADO=&ORDEN=&NUM_PAG=1",
  DESCARGA_FOLIO_URL_COMPRA: "https://www1.sii.cl/cgi-bin/Portal001/mipeAdminDocsRcp.cgi?RUT_EMI=&FOLIO=&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=&ESTADO=&ORDEN=&NUM_PAG=1",
};

let rutEmpresaGlobal = null;
let dvEmpresaGlobal = null;
let passEmpresaGlobal = null;

export async function consultarDtesConPuppeteer({ mes, anio, rutEmpresa, tipoDoc }) {
  const browser = await puppeteer.launch(BROWSER_OPTS); 
  const page = await setupPage(browser);
  const RUT = "78300694"; 
  const DV = "4";
  const PASS = "Blink182.";
  rutEmpresaGlobal = rutEmpresa;
  console.log("Rut empresa global: ", rutEmpresaGlobal);
  dvEmpresaGlobal = DV;
  passEmpresaGlobal = PASS;
  // const [RUT, DV] = rutEmpresa.split("-");
  // const PASS = await obtenerClaveSii(rutEmpresa);
  let tipoDeDocABuscar = null;

  console.log("Parámetros recibidos en el servicio:", { mes, anio, rutEmpresa, tipoDoc , PASS});

  switch (tipoDoc) {
    case "33":
      tipoDeDocABuscar = "Factura Electrónica (33)";
      break;
    case "34":
      tipoDeDocABuscar = "Exenta Electrónica (34)";
      break;
    case "52":
      tipoDeDocABuscar = "Guía de Despacho Electrónica (52)";
      break;
    case "56":
      tipoDeDocABuscar = "Nota de Débito Electrónica (56)";
      break;
    case "61":
      tipoDeDocABuscar = "Nota de Crédito Electrónica (61)";
      break;
    default:
      return { ok: false, error: "Tipo de documento no soportado", registros: [] };
  }

  try {
    await loginSii(page, String(RUT), String(DV), String(PASS));
    
    await page.goto(MODULE_CONFIG.REGISTRO_URL, { waitUntil: "networkidle2" });

    await page.waitForFunction(() => {
      const select = document.querySelector('select[name="rut"]');
      return select && select.options.length > 1;
    }, { timeout: 15000 });

    await page.evaluate((rut) => {
      const select = document.querySelector('select[name="rut"]');
      const option = Array.from(select.options).find(opt => opt.value.includes(rut) || opt.text.includes(rut));
      
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        throw new Error(`No se encontró el RUT ${rut} en la lista de empresas.`);
      }
    }, RUT);
    
    await page.select("#periodoMes", String(mes));
    await page.select('select[ng-model="periodoAnho"]', String(anio));

    await clickByExactText(page, "Consultar");

    const registros = [];

    // Compras
    await clickByExactText(page, tipoDeDocABuscar);

    const compras = await page.evaluate((rQuery) => {
      return Array.from(document.querySelectorAll("#tableCompra tbody tr")).map((tr) => {
        const tds = tr.querySelectorAll("td");
        return {
          tipo_registro: "Compra",
          rut_emisor: tds[1]?.innerText.trim() ?? null,
          rut_receptor: rQuery,
          folio: tds[2]?.innerText.trim() ?? null,
          fecha_emision: tds[3]?.innerText.trim() ?? null,
          monto_total: tds[12] ? Number(tds[12].innerText.replace(/[^0-9-]/g, "")) : null,
        };
      });
    }, rutEmpresa);
    registros.push(...compras.filter(r => r.folio));

    // Ventas
    await clickByExactText(page, "VENTA");
    await clickByExactText(page, tipoDeDocABuscar);

    const ventas = await page.evaluate((rQuery) => {
      return Array.from(document.querySelectorAll("#tableVenta tbody tr")).map((tr) => {
        const tds = tr.querySelectorAll("td");
        return {
          tipo_registro: "Venta",
          rut_emisor: rQuery,
          rut_receptor: tds[1]?.innerText.trim() ?? null,
          folio: tds[2]?.innerText.trim() ?? null,
          fecha_emision: tds[3]?.innerText.trim() ?? null,
          monto_total: tds[11] ? Number(tds[11].innerText.replace(/[^0-9-]/g, "")) : null,
        };
      });
    }, rutEmpresa);
    registros.push(...ventas.filter(r => r.folio));

    return { ok: true, registros };
  } catch (err) {
    return { ok: false, error: err.message, registros: [] };
  } finally {
    await browser.close();
  }
}

export async function descargarPdfPorFolio({ rutEmisor, rutReceptor, folio, tipoDTE = "33", tipoRegistro }) {
  const finalFileName = `${(tipoRegistro || "Documento").replace(/\s+/g, '_')}_${tipoDTE}_Folio_${folio}.pdf`;
  const downloadPath = path.resolve('./tmp');
  const finalPath = path.join(downloadPath, finalFileName);

  if (fs.existsSync(finalPath)) {
    console.log(`⚡ [CACHÉ] El archivo ${finalFileName} ya existe.`);
    return { ok: true, fileName: finalFileName, fromCache: true };
  }
  
  const browser = await puppeteer.launch(BROWSER_OPTS);
  const page = await setupPage(browser);
  
  try {
    await loginSii(page, String(rutEmpresaGlobal), String(dvEmpresaGlobal), String(passEmpresaGlobal));

    const esVenta = tipoRegistro?.toLowerCase().includes("venta");
    const baseUrl = esVenta ? MODULE_CONFIG.DESCARGA_FOLIO_URL_VENTA : MODULE_CONFIG.DESCARGA_FOLIO_URL_COMPRA;

    const targetUrl = baseUrl.replace('FOLIO=', `FOLIO=${folio}`);
    
    console.log(`🚀 Buscando específicamente Folio: ${folio} en ${esVenta ? 'Ventas' : 'Compras'}`);
    await page.goto(targetUrl, { waitUntil: "networkidle2" });

    const rutBuscado = esVenta ? rutEmpresaGlobal : rutReceptor;
    console.log(`🔍 Buscando en la tabla el RUT: ${rutBuscado} y Folio: ${folio}`);
    await page.waitForSelector('table', { visible: true });

    const targetHref = await page.evaluate(({ rutTarget, folioBuscado }) => {
      const rows = Array.from(document.querySelectorAll('table tr'));
      const cleanTarget = rutTarget.replace(/[^0-9K]/g, '').toUpperCase();
      const folioBuscadoLimpio = String(folioBuscado).replace(/^0+/, '');

      for (const row of rows) {
        const tds = row.querySelectorAll('td');
        if (tds.length < 5) continue;

        const rutTabla = tds[1].innerText.trim().replace(/[^0-9K]/g, '').toUpperCase();
        const folioTabla = tds[4].innerText.trim().replace(/^0+/, ''); 

        if (rutTabla.includes(cleanTarget) && folioTabla === folioBuscadoLimpio) {
          const anchor = tds[0].querySelector('a');
          return anchor ? anchor.getAttribute('href') : null;
        }
      }
      return null;
    }, { rutTarget: rutBuscado, folioBuscado: folio });

    if (!targetHref) {
      throw new Error(`Búnker Error: No se encontró el Folio ${folio} para el RUT ${rutBuscado} en la tabla.`);
    }

    await page.goto(`https://www1.sii.cl${targetHref}`, { waitUntil: 'networkidle2' });

    if (!esVenta) {
      await page.waitForSelector('a[href="#collapseOtros"]', { visible: true });
      await page.click('a[href="#collapseOtros"]');
      await sleep(500);
    }

    const pdfUrl = await page.evaluate((esV) => {
      if (!esV) return document.querySelector('a[href*="mipeShowPdf.cgi"]')?.href;
      const embed = document.querySelector('embed[type="application/pdf"], iframe[src*="pdf"], iframe[src*="cgi"]');
      return embed?.src || window.location.href;
    }, esVenta);

    if (!pdfUrl || pdfUrl === 'about:blank') {
      throw new Error("Búnker Error: No se pudo localizar la URL del recurso PDF.");
    }

    const result = await page.evaluate(async (url) => {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ base64: reader.result.split(',')[1] });
        reader.readAsDataURL(blob);
      });
    }, pdfUrl);

    const finalBuffer = Buffer.from(result.base64, 'base64');

    if (finalBuffer.toString('utf8', 0, 4) !== '%PDF') {
      throw new Error("El archivo capturado no es un PDF válido (posible error del portal).");
    }

    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });
    fs.writeFileSync(finalPath, finalBuffer);

    console.log(`✅ Archivo guardado: ${finalFileName}`);
    return { ok: true, fileName: finalFileName }; 

  } catch (err) {
    console.error(`❌ Error en el búnker de descarga: ${err.message}`);
    return { ok: false, error: err.message };
  } finally {
    await browser.close();
  }
}