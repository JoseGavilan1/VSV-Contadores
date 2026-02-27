import puppeteer from "puppeteer";

export const BROWSER_OPTS = {
  headless: false, // Cambiar a "new" para producción
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
    "--no-first-run",
    "--disable-extensions",
    "--hide-scrollbars",
    "--mute-audio",
  ]
};

export const CONFIG_BASE = {
  LOGIN_URL: "https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi",
  SELECCION_URL: "https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi",
  TIMEOUT: 45000
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function setupPage(browser) {
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 720 });
  page.setDefaultTimeout(CONFIG_BASE.TIMEOUT);

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
    else req.continue();
  });

  return page;
}

export async function findLoginContext(page, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.$("#rutcntr")) return page;
    for (const frame of page.frames()) {
      try {
        if (await frame.$("#rutcntr")) return frame;
      } catch (err) { /* Frame inaccesible */ }
    }
  }
  return null;
}

export async function loginSii(page, rut, dv, password) {
  await page.goto(CONFIG_BASE.LOGIN_URL, { waitUntil: "networkidle2" });
  
  const loginCtx = await findLoginContext(page);
  if (!loginCtx) throw new Error("Búnker Error: El portal de autenticación no cargó a tiempo.");

  await loginCtx.type("#rutcntr", String(rut), { delay: 20 });
  await page.keyboard.type(String(dv));
  await loginCtx.type("#clave", String(password), { delay: 20 });
  
  await Promise.all([
    loginCtx.click("#bt_ingresar"),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
}

export async function seleccionarEmpresa(page, nombreEmpresa) {
  await page.goto(CONFIG_BASE.SELECCION_URL, { waitUntil: "networkidle2" });

  const selector = 'select[name="RUT_EMP"]';
  await page.waitForSelector(selector, { visible: true });

  const valueToSelect = await page.evaluate((nombre) => {
    const select = document.querySelector('select[name="RUT_EMP"]');
    const opciones = Array.from(select.options);
    const target = opciones.find(opt => opt.text.includes(nombre));
    return target ? target.value : null;
  }, nombreEmpresa);

  if (!valueToSelect) {
    throw new Error(`Búnker Error: No se encontró la empresa "${nombreEmpresa}" en la lista.`);
  }

  await page.select(selector, valueToSelect);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }), 
    page.click('button[type="submit"]')
  ]);
}

export async function clickByExactText(page, text, timeout = 20000) {
  const xpathSelector = `xpath///button[normalize-space()='${text}'] | 
                         //a[normalize-space()='${text}'] | 
                         //span[normalize-space()='${text}'] | 
                         //input[@value='${text}']`;
  try {
    await page.waitForSelector(xpathSelector, { visible: true, timeout });
    const element = await page.$(xpathSelector);
    await sleep(500);
    await element.click();
    await sleep(500);
    return true;
  } catch (error) {
    throw new Error(`Búnker Error: No se pudo clickear el elemento "${text}".`);
  }
}

export async function waitForPdfPage(browser, timeoutMs = 30000) {
  const isPdfLikeTarget = (target) => {
    if (!target || target.type() !== "page") return false;
    const url = String(target.url() || "").toLowerCase();
    return url.includes("mipedisplaypdf") || url.includes(".pdf");
  };

  const existingTarget = browser.targets().find(isPdfLikeTarget);
  if (existingTarget) {
    const page = await existingTarget.page();
    if (page) return page;
  }

  const target = await browser.waitForTarget(isPdfLikeTarget, { timeout: timeoutMs });
  const page = await target.page();

  if (!page) {
    throw new Error("Búnker Error: El PDF se abrió, pero no se pudo obtener la página.");
  }

  return page;
}