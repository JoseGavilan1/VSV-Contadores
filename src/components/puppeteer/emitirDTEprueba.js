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

const DEBUG_BROWSER_LOG = /^(1|true|yes|on|debug)$/i.test(String(process.env.DTE_BROWSER_LOG || ""));

const PUPPETEER_SESSION = {
  browser: null,
  page: null,
  initialized: false,
};

const SII_LOGOUT_URL = "https://zeusr.sii.cl/cgi_AUT2000/autTermino.cgi";
const SII_BASE_ORIGIN = "https://zeusr.sii.cl";

function createBrowserDebugLogger(page, options = {}) {
  const { enabled = false } = options;
  if (!enabled || !page) {
    return () => {};
  }

  const safeString = (value, max = 220) => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}…` : text;
  };

  const log = (event, message) => {
    const ts = new Date().toISOString();
    console.log(`[BrowserLog][${ts}][${event}] ${message}`);
  };

  const onRequest = (request) => {
    const url = request.url();
    const method = request.method();
    const resourceType = request.resourceType?.() || "other";
    const redirectChain = request.redirectChain?.() || [];

    if (redirectChain.length > 0) {
      const chain = redirectChain.map((item) => safeString(item.url())).join(" -> ");
      log("request", `${method} ${safeString(url)} (type=${resourceType}, redirects=${redirectChain.length}, chain=${chain})`);
      return;
    }

    log("request", `${method} ${safeString(url)} (type=${resourceType})`);
  };

  const onResponse = (response) => {
    const request = response.request();
    const status = response.status();
    const url = response.url();
    const method = request?.method?.() || "GET";
    const redirectHeader = response.headers?.().location;

    if (redirectHeader || status >= 300 && status < 400) {
      log("response", `${status} ${method} ${safeString(url)}${redirectHeader ? ` -> ${safeString(redirectHeader)}` : ""}`);
      return;
    }

    log("response", `${status} ${method} ${safeString(url)}`);
  };

  const onRequestFailed = (request) => {
    const failure = request.failure?.();
    const reason = safeString(failure?.errorText || "unknown");
    log("requestfailed", `${request.method()} ${safeString(request.url())} (reason=${reason})`);
  };

  const onFrameNavigated = (frame) => {
    if (frame !== page.mainFrame()) return;
    log("navigation", safeString(frame.url()));
  };

  const onConsole = (msg) => {
    const txt = safeString(msg.text(), 300);
    if (!txt) return;
    log(`console:${msg.type()}`, txt);
  };

  const onPageError = (error) => {
    log("pageerror", safeString(error?.message || error, 300));
  };

  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);
  page.on("framenavigated", onFrameNavigated);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  log("status", `Browser logging enabled for page ${safeString(page.url()) || "about:blank"}`);

  return () => {
    page.off("request", onRequest);
    page.off("response", onResponse);
    page.off("requestfailed", onRequestFailed);
    page.off("framenavigated", onFrameNavigated);
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    log("status", "Browser logging disabled");
  };
}

function extractFolioFromText(text) {
  const source = String(text || "");
  if (!source) return null;

  const patterns = [
    /folio\s*[:#-]?\s*(\d{1,12})/i,
    /n[°º]\s*[:#-]?\s*(\d{1,12})/i,
    /documento\s*[:#-]?\s*(\d{1,12})/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractFolioFromUrl(url) {
  const source = String(url || "");
  if (!source) return null;

  try {
    const parsed = new URL(source);
    const queryCandidates = ["FOLIO", "folio", "NRODOC", "nrodoc", "DOC", "doc"];
    for (const key of queryCandidates) {
      const value = parsed.searchParams.get(key);
      if (value && /^\d{1,12}$/.test(value)) return value;
    }
  } catch {}

  const pathMatch = source.match(/(?:folio|doc|nrodoc)[=:/-](\d{1,12})/i);
  if (pathMatch?.[1]) return pathMatch[1];

  return null;
}

async function extractFolioFromCurrentPage(page) {
  try {
    const candidates = await page.evaluate(() => {
      const selectors = [
        "#folio",
        "[id*='folio' i]",
        "[name*='folio' i]",
        ".folio",
        "td",
        "th",
        "span",
        "div",
      ];

      const values = [];
      for (const selector of selectors) {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach((node) => {
          const text = String(node?.textContent || "").trim();
          if (text) values.push(text);
        });
      }

      const bodyText = String(document.body?.innerText || "").trim();
      if (bodyText) values.push(bodyText);

      return values;
    });

    for (const candidate of candidates) {
      const folio = extractFolioFromText(candidate);
      if (folio) return folio;
    }
  } catch {}

  return null;
}

async function closePuppeteerSession() {
  try {
    const browser = PUPPETEER_SESSION.browser;
    if (browser && typeof browser.isConnected === "function" && browser.isConnected()) {
      await browser.close();
    }
  } catch {}

  PUPPETEER_SESSION.browser = null;
  PUPPETEER_SESSION.page = null;
  PUPPETEER_SESSION.initialized = false;
}

async function cerrarSesionSiiDesdePagina(page) {
  if (!page || page.isClosed?.()) return;

  try {
    const clickedLogout = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a"));
      const byText = anchors.find((anchor) =>
        /cerrar\s*sesi[oó]n/i.test(String(anchor.textContent || "").trim())
      );

      if (byText) {
        byText.click();
        return true;
      }

      const byHref = anchors.find((anchor) => /autTermino\.cgi/i.test(String(anchor.href || "")));
      if (byHref) {
        byHref.click();
        return true;
      }

      return false;
    });

    if (clickedLogout) {
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 12000 }).catch(() => {});
      return;
    }

    await page.goto(SII_LOGOUT_URL, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
  } catch {
    await page.goto(SII_LOGOUT_URL, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
  }
}

async function limpiarEstadoNavegadorSii(browser, page) {
  if (!browser || !page || page.isClosed?.()) return;

  try {
    const pages = await browser.pages();
    for (const browserPage of pages) {
      if (browserPage !== page) {
        try {
          await browserPage.close();
        } catch {}
      }
    }
  } catch {}

  try {
    const client = await page.target().createCDPSession();
    await client.send("Network.clearBrowserCookies");
    await client.send("Network.clearBrowserCache");
    await client.detach();
  } catch {}

  try {
    await page.goto(SII_BASE_ORIGIN, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
    await page.evaluate(async () => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      try {
        if (window.caches && typeof window.caches.keys === "function") {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
        }
      } catch {}
    });
  } catch {}
}

export async function cerrarSesionDtePuppeteer() {
  await closePuppeteerSession();
  return { ok: true, message: "Sesión de Puppeteer cerrada correctamente." };
}

async function getOrCreatePuppeteerSession(options = {}) {
  const { forceFreshPage = false } = options;

  const hasLiveBrowser =
    PUPPETEER_SESSION.browser &&
    typeof PUPPETEER_SESSION.browser.isConnected === "function" &&
    PUPPETEER_SESSION.browser.isConnected();

  if (!hasLiveBrowser || !PUPPETEER_SESSION.page) {
    const browser = await puppeteer.launch(BROWSER_OPTS);
    const page = await setupPage(browser);

    PUPPETEER_SESSION.browser = browser;
    PUPPETEER_SESSION.page = page;
    PUPPETEER_SESSION.initialized = false;
  }

  if (forceFreshPage && PUPPETEER_SESSION.browser) {
    const previousPage = PUPPETEER_SESSION.page;

    try {
      if (previousPage && !previousPage.isClosed()) {
        await previousPage.close();
      }
    } catch {}

    const freshPage = await setupPage(PUPPETEER_SESSION.browser);
    PUPPETEER_SESSION.page = freshPage;
  }

  return {
    browser: PUPPETEER_SESSION.browser,
    page: PUPPETEER_SESSION.page,
  };
}

export async function emitirDteConPuppeteer(dteJson) {
  const isBulkEmission = dteJson?.masivo === true;
  const shouldCloseSessionOnAtypicalError = dteJson?.masivo === true ? false : true;
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
  const CONTACTO_RECEPTOR = String(dteJson?.Encabezado?.Receptor?.Contacto || "")
    .trim()
    .slice(0, 80);
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

  const useFreshPageForBulk = dteJson?.masivo === true && PUPPETEER_SESSION.initialized === true;
  const { browser, page } = await getOrCreatePuppeteerSession({
    forceFreshPage: useFreshPageForBulk,
  });
  const siiRuntimeErrors = [];

  const onDialog = async (dialog) => {
    const message = String(dialog?.message?.() || "").trim();
    if (message) siiRuntimeErrors.push(message);
    try {
      await dialog.accept();
    } catch {}
  };

  const stopBrowserDebugLogging = createBrowserDebugLogger(page, {
    enabled: DEBUG_BROWSER_LOG,
  });

  page.on("dialog", onDialog);

  try {
    // Limpiar actual y dejar nuevo
    const clearAndType = async (selector, value, options = {}) => {
      if (value === undefined || value === null || String(value).trim() === "") return false;

      const { timeout = 5000, delay = 15 } = options;
      await page.waitForSelector(selector, { visible: true, timeout });
      await page.click(selector, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(selector, String(value), { delay });
      return true;
    };

    const hasInputValue = async (selector, expectedValue) => {
      const found = await page.$(selector);
      if (!found) return false;

      return await page.evaluate((sel, expected) => {
        const element = document.querySelector(sel);
        if (!element) return false;
        return String(element.value || "").trim() === String(expected || "").trim();
      }, selector, expectedValue);
    };

    const ensureChecked = async (selector) => {
      const found = await page.$(selector);
      if (!found) return false;

      await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return;
        if (!element.checked) element.click();
        element.dispatchEvent(new Event("change", { bubbles: true }));
      }, selector);

      return true;
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
          .map((element) => (element.textContent || "").trim())
          .filter(Boolean)
          .filter((text) => text.length > 3);

        return Array.from(new Set(candidates));
      });

      if (inlineErrors.length > 0) {
        throw new Error(inlineErrors[0]);
      }
    };

    // 1. Login y Selección de Empresa (solo una vez por sesión)
    if (!PUPPETEER_SESSION.initialized) {
      await loginSii(page, RUT, DV, PASS);
      PUPPETEER_SESSION.initialized = true;
    }

    await seleccionarEmpresa(page, "VOLLAIRE Y OLIVOS");
    
    // 2. Navegar al Formulario de Emisión
    await page.goto(DTE_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#EFXP_RUT_RECEP', { visible: true });

    // 3. DATOS RECEPTOR
    // 3.1 RUT receptor
    await page.type('#EFXP_RUT_RECEP', RUT_RECEPTOR, { delay: 20 });
    await page.keyboard.press('Tab');
    await page.keyboard.type(DV_RECEPTOR, { delay: 20 });
    await page.keyboard.press('Enter');

    await sleep(200);

    // 3.2 Fecha de emisión
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

        const persistedContacto = await hasInputValue(contactoSelector, CONTACTO_RECEPTOR);
        if (!persistedContacto) {
          throw new Error("No se pudo persistir el contacto receptor");
        }
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

    await sleep(100);

    // 4. TRANSPORTE
    if (RUT_TRANSPORTE || PATENTE_TRANSPORTE || RUT_CHOFER || NOMBRE_CHOFER) {
      try {
        await clearAndType('input[name="EFXP_RUT_TRANSPORTE"]', RUT_TRANSPORTE);
        await clearAndType('input[name="EFXP_DV_TRANSPORTE"]', DV_TRANSPORTE);
        await clearAndType('input[name="EFXP_PATENTE"]', PATENTE_TRANSPORTE);
        await clearAndType('input[name="EFXP_RUT_CHOFER"]', RUT_CHOFER);
        await clearAndType('input[name="EFXP_DV_CHOFER"]', DV_CHOFER);
        await clearAndType('input[name="EFXP_NOMBRE_CHOFER"]', NOMBRE_CHOFER);
      } catch (transporteErr) {
        console.warn(`⚠️ No se pudo completar transporte: ${transporteErr.message}`);
      }
    }

    await sleep(100);

    // 5. DETALLE DEL PRODUCTO
    await page.click('td[data-title="Nombre Prod"]');
    await page.keyboard.type(String(NmbItem), { delay: 15 });

    const descripcionItem = typeof DscItem === "string" ? DscItem.trim() : "";
    if (descripcionItem && descripcionItem !== "null") {
      try {
        await ensureChecked('input[name="DESCRIP_01"]');
        const wroteDescription = await clearAndType('textarea[name="EFXP_DSC_ITEM_01"]', descripcionItem);
        if (!wroteDescription) {
          throw new Error("No se encontró textarea de descripción");
        } 
      } catch (descErr) {
        console.warn(`⚠️ No se pudo completar descripción del producto: ${descErr.message}`);
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

    await sleep(100);

    // 6. FORMA DE PAGO
    await page.select('select[name="EFXP_FMA_PAGO"]', FORMA_PAGO);
    await sleep(500);
    await throwIfSiiErrors();

    //
    // Falta hacer las pruebas para validar que la 
    // optimización se hizo de manera correcta,
    // pero necesitamos rut para emitir facturas
    //

    await clickByExactText(page, 'Validar y visualizar');
    await sleep(5000);

    // 7. Proceso de Firma Electrónica
    await clickByExactText(page, 'Firmar');
    await sleep(5000);
    await clickByExactText(page, 'Firmar');
    await sleep(5000);
    await page.waitForSelector('input#myPass', { visible: true });
    await sleep(5000);
    await page.type('input#myPass', SII_PASS, { delay: 20 });

    console.log("🔐 Contraseña de firma ingresada, procediendo a firmar el DTE...");

    await sleep(5000);
    
    await clickByExactText(page, 'Firmar'); 

    console.log("⌛ Esperando a que el SII procese la firma del DTE...");
    
    await sleep(5000);
    

    // va a www1.sii.cl/cgi-bin/Portal001/mipeSendXML.cgi
    // luego de un milisegundo cambia a www1.sii.cl/factura_sii/factura_sii.htm
    const folioFromSignedPage = await extractFolioFromCurrentPage(page);

    console.log(`Folio extraído después de la firma: ${folioFromSignedPage || "No encontrado"}`);
    await sleep(5000);

    // 8. Captura Binaria del PDF
    const pdfPagePromise = waitForPdfPage(browser);
    await clickByExactText(page, 'Ver Documento');
    const pdfPage = await pdfPagePromise;

    let finalPath;
    let folio;

    console.log("📄 Página del PDF detectada, extrayendo contenido...");
    try {
      const folioFromPage = await pdfPage.evaluate(() => String(document.body?.innerText || ""));
      folio = folioFromSignedPage || extractFolioFromText(folioFromPage) || extractFolioFromUrl(pdfPage.url());

      const result = await pdfPage.evaluate(async () => {
        const response = await fetch(window.location.href, { credentials: "include" });
        if (!response.ok) {
          throw new Error(`No se pudo descargar el PDF (HTTP ${response.status})`);
        }

        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = String(reader.result || "").split(",")[1] || "";
            resolve({ base64, size: blob.size });
          };
          reader.readAsDataURL(blob);
        });
      });

      const finalBuffer = Buffer.from(result.base64, 'base64');
      if (finalBuffer.toString('utf8', 0, 4) !== '%PDF') {
        throw new Error("El archivo capturado no es un PDF válido.");
      }

      if (!fs.existsSync(MODULE_CONFIG.DOWNLOAD_PATH)) {
        await fs.promises.mkdir(MODULE_CONFIG.DOWNLOAD_PATH, { recursive: true });
      }

      const fileName = folio
        ? `FACTURA_FOLIO_${folio}.pdf`
        : `FACTURA_FOLIO_${Date.now()}.pdf`;
      finalPath = path.join(MODULE_CONFIG.DOWNLOAD_PATH, fileName);
      await fs.promises.writeFile(finalPath, finalBuffer);

      console.log(`✅ DTE emitido exitosamente. Folio: ${folio || "No encontrado"}`);
    } finally {
      try {
        if (!pdfPage.isClosed()) {
          await pdfPage.close();
        }
      } catch {}

      try {
        await page.bringToFront();
      } catch {}
    }

    return {
      ok: true,
      mensaje: "DTE validado exitosamente.",
      path: finalPath,
      folio: folio || undefined,
    };
  } catch (err) {
    console.error(`❌ Error en Emisión: ${err.message}`);
    const errorMessage = String(err?.message || "").toLowerCase();
    const isMaxAuthenticatedSessions =
      errorMessage.includes("maximo de sesiones autenticadas") ||
      errorMessage.includes("máximo de sesiones autenticadas");

    if (isMaxAuthenticatedSessions) {
      PUPPETEER_SESSION.initialized = false;
      return {
        ok: false,
        error: "Sesión bloqueada en SII por máximo de sesiones autenticadas. Cierra sesiones activas y vuelve a intentarlo.",
      };
    }

    if (shouldCloseSessionOnAtypicalError) {
      await closePuppeteerSession();
    }

    return {
      ok: false,
      error: "Ocurrió un problema inesperado al emitir el DTE. Vuelve a intentarlo.",
    };
  } finally {
    page.off("dialog", onDialog);
    stopBrowserDebugLogging();
  }
}
