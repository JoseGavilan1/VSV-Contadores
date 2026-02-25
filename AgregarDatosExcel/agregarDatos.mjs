import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { fileURLToPath } from "node:url";

// Librerías de Puppeteer Stealth
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const LOGIN_URL = "https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CSV_INPUT_PATH = path.join(SCRIPT_DIR, "input", "CONTABILIDAD-2026.csv");
const VALIDOS_OUTPUT_PATH = path.join(SCRIPT_DIR, "output", "validos.json");
const INCOMPLETOS_OUTPUT_PATH = path.join(SCRIPT_DIR, "output", "incompletos.json");
const RESULTADOS_OUTPUT_PATH = path.join(SCRIPT_DIR, "output", "empresas_resultado.json");
const INCORRECTOS_OUTPUT_PATH = path.join(SCRIPT_DIR, "output", "incorrectos.json");
const ERRORES_LOGIN_OUTPUT_PATH = path.join(SCRIPT_DIR, "output", "errores_login.json");
const MAX_REINTENTOS_TEMPORALES = 2;

/* =========================
   VALIDACIONES CSV
========================= */

const normalizarRut = (rut) => {
  if (!rut) return null;

  let clean = rut.trim();
  if (!clean) return null;
  if (clean.startsWith("#")) return null;

  clean = clean.replace(/\./g, "").replace(/-/g, "");
  if (clean.length < 2) return null;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();

  if (!/^\d+$/.test(cuerpo)) return null;
  if (!/^[0-9K]$/.test(dv)) return null;

  return `${cuerpo}-${dv}`;
};

const claveValida = (clave) => {
  if (!clave) return false;
  const clean = clave.trim();
  if (!clean) return false;
  return /\d/.test(clean);
};

const obtenerMotivoIncompleto = (rut, claveEsValida, rawRut, rawClave) => {
  const sinRut = !rawRut;
  const sinClave = !rawClave;

  if (sinRut && sinClave) return "ambos_vacios";
  if (!rut && !claveEsValida) return "rut_y_clave_invalidos";
  if (!rut) return "rut_invalido";
  return "clave_invalida";
};

/* =========================
   LECTURA CSV
========================= */

// Obtener solo las credenciales válidas para el proceso de extracción, y clasificar los registros incompletos o inválidos para revisión posterior
async function obtenerValidosDesdeCSV() {
  return new Promise((resolve, reject) => {
    const validos = [];
    const incompletos = [];

    fs.createReadStream(CSV_INPUT_PATH)
      .pipe(parse({
        delimiter: ",",
        trim: true,
        from_line: 2
      }))
      .on("data", (row) => {
        const rawRut = row?.[10]?.trim() ?? "";
        const rawClave = row?.[11]?.trim() ?? "";
        const planContable = row?.[2]?.trim() ?? "";

        const rut = normalizarRut(rawRut);
        const claveEsValida = claveValida(rawClave);

        if (rut && claveEsValida) {
          validos.push({ rutCompleto: rut, pass: rawClave, planContable });
        } else {
          incompletos.push({
            planContable,
            motivo: obtenerMotivoIncompleto(rut, claveEsValida, rawRut, rawClave),
            rut: rut || null,
            clave: claveEsValida ? rawClave : null,
            rawRut: rawRut || null,
            rawClave: rawClave || null
          });
        }
      })
      .on("end", () => {
        fs.writeFileSync(VALIDOS_OUTPUT_PATH, JSON.stringify(validos, null, 2));
        fs.writeFileSync(INCOMPLETOS_OUTPUT_PATH, JSON.stringify(incompletos, null, 2));
        console.log("Validos:", validos.length);
        console.log("Incompletos:", incompletos.length);
        resolve(validos);
      })
      .on("error", reject);
  });
}

/* =========================
   PUPPETEER
========================= */

// Limpiar sesión entre intentos para evitar problemas de cache o cookies
async function limpiarSesion(page) {
  try {
    const client = await page.target().createCDPSession();
    await client.send("Network.clearBrowserCookies");
    await client.send("Network.clearBrowserCache");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    console.warn(`No se pudo limpiar completamente la sesión: ${error.message}`);
  }
}

// Manejo de errores específicos de login para diferenciar entre credenciales inválidas y problemas temporales del SII
class LoginError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "LoginError";
  }
}

// Funciones para detectar mensajes comunes de error en el SII y clasificarlos adecuadamente
const credencialesInvalidas = (texto) => {
  const patrones = [
    "clave incorrect",
    "rut o clave incorrect",
    "datos ingresados no son correct",
    "autenticaci",
    "credenciales"
  ];

  return patrones.some((patron) => texto.includes(patron));
};

const errorTemporal = (texto) => {
  const patrones = [
    "muchas solicitudes",
    "demasiados intentos",
    "intente nuevamente",
    "temporalmente",
    "servicio no disponible",
    "error interno",
    "timeout",
    "429"
  ];

  return patrones.some((patron) => texto.includes(patron));
};

// Función principal de login que lanza errores específicos para manejar cada caso en el flujo principal
async function login(page, cred) {
  if (!cred?.rutCompleto || !cred?.pass) {
    throw new LoginError("Credenciales incompletas", "CREDENTIALS_MISSING");
  }

  const [rut, dv] = cred.rutCompleto.split("-");

  if (!rut || !dv) {
    throw new LoginError(`RUT inválido para login: ${cred.rutCompleto}`, "RUT_FORMAT_ERROR");
  }

  await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });
  await page.waitForSelector("#rutcntr", { timeout: 15000 });

  await page.evaluate(() => {
    document.querySelector("#rutcntr").value = "";
    document.querySelector("#clave").value = "";
  });

  await page.type("#rutcntr", rut, { delay: 80 });
  await page.keyboard.type(dv, { delay: 80 });
  await page.type("#clave", cred.pass, { delay: 80 });

  // Reemplaza desde el await Promise.all(...) hacia abajo dentro de tu función login:
  
  await Promise.all([
    page.click("#bt_ingresar"),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }).catch(() => null),
  ]);

  // ---> AGREGAR ESTA PAUSA PARA DEJAR QUE EL SII TERMINE DE CARGAR <---
  await new Promise(r => setTimeout(r, 4000));

  const textoPagina = await page.evaluate(() => document.body?.innerText?.toLowerCase() ?? "");
  const sigueEnLogin = (await page.$("#rutcntr")) !== null;

  if (errorTemporal(textoPagina)) {
    throw new LoginError("Error temporal del SII", "TRANSIENT_SII_ERROR");
  }

  if (credencialesInvalidas(textoPagina) || sigueEnLogin) {
    throw new LoginError("Credenciales inválidas en SII", "INVALID_CREDENTIALS");
  }
}

const esErrorReintentable = (error) => {
  if (!error) return false;
  return ["TRANSIENT_SII_ERROR", "TimeoutError"].includes(error.code) || error.name === "TimeoutError";
};

async function extraerEmpresa(page) {
  // ---> ESPERAR EXPLÍCITAMENTE A QUE EL ELEMENTO CARGUE <---
  try {
    await page.waitForSelector("#nameCntr", { timeout: 15000 });
  } catch (error) {
    console.warn("⚠️ No se encontró el #nameCntr a tiempo. Puede que la página no cargó bien o está en un iframe.");
    // Si quieres ver qué vio Puppeteer, puedes guardar un pantallazo:
    // await page.screenshot({ path: 'error_sii.png' });
  }

  // Ahora sí, ejecutamos el código del navegador
  return await page.evaluate(() => {
    const domi = document.querySelector("#domiCntr")?.textContent?.trim() ?? null;

    const domicilio = domi?.includes("COMUNA")
      ? domi.split("COMUNA")[0].trim()
      : null;

    const comuna = domi?.includes("COMUNA")
      ? domi.split("COMUNA")[1].split("CIUDAD")[0].trim()
      : null;

    const ciudad = domi?.includes("CIUDAD")
      ? domi.split("CIUDAD")[1].trim()
      : "SANTIAGO";

    const tds = Array.from(document.querySelectorAll("#tablaDatosTelefonos td"));
    const cell = tds.find(td => /^\d{7,15}$/.test(td.textContent.trim()));
    const telefono_movil = cell?.textContent.trim() ?? null;

    const representantes_legales = Array.from(
      document.querySelectorAll("#tablaRepresentantes tr")
    )
      .map(tr => ({
        nombre: tr.querySelector('td[data-title="Nombre"]')?.textContent?.trim() ?? null,
        rut: tr.querySelector('td[data-title="Rut"]')?.textContent?.trim() ?? null,
      }))
      .filter(r => r.nombre || r.rut);

    return {
      id: crypto.randomUUID(),  
      razon_social: document.querySelector("#nameCntr")?.textContent?.trim() ?? null,
      rut: document.querySelector("#rutCntr")?.textContent?.trim() ?? null,
      giro: document.querySelector("#glosaActividad")?.textContent?.trim() ?? null,
      domicilio,
      comuna,
      ciudad,
      regimen_tributario: document.querySelector("#attr14D1")?.textContent?.trim() ?? null,
      telefono_corporativo: telefono_movil,
      email_corporativo: document.querySelector("#mailCntr")?.textContent?.trim() ?? null,
      logo_url: "https://placehold.co/200?text=Co",
      configuracion: {
                moneda: "CLP",
                notificaciones: false
            },
      nombre_rep: representantes_legales[0]?.nombre,
      rut_rep: representantes_legales[0]?.rut,
      activo: true
    };
  });
}

/* =========================
   FLUJO PRINCIPAL
========================= */

(async () => {
  let browser;

  try {
    const empresas = await obtenerValidosDesdeCSV();

    browser = await puppeteer.launch({
      headless: false,
      executablePath: 'C://Program Files//Google//Chrome//Application//chrome.exe',
      args: ['--start-maximized'], // Abre la ventana en grande, ayuda a parecer humano
      ignoreDefaultArgs: ['--enable-automation'] // <--- ESTA LÍNEA OCULTA EL CARTEL
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    page.setDefaultTimeout(60000);
    
    // --- EVASIÓN AVANZADA PARA FIREWALL F5 DEL SII ---
    // 1. Tamaño de pantalla de un notebook normal (Puppeteer usa 800x600 por defecto, lo cual bloquean)
    await page.setViewport({ width: 1366, height: 768 });

    // 2. User-Agent y Headers de un usuario real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8'
    });

    // 3. Inyectar propiedades de navegador real antes de que cargue la página
    await page.evaluateOnNewDocument(() => {
      // Borrar rastro de bot
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // Simular que tenemos plugins instalados (Puppeteer viene vacío por defecto)
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      // Simular idioma del sistema operativo
      Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es', 'en'] });
      // Simular variables internas de Chrome
      window.chrome = { runtime: {} };
    });
    // --- FIN EVASIÓN ---

    page.setDefaultTimeout(60000);

    const resultados = [];
    const incorrectos = [];
    const erroresLogin = [];

    for (const cred of empresas) {
      let intento = 0;
      let procesado = false;

      while (!procesado) {
        try {
          await limpiarSesion(page);
          await login(page, cred);

          const empresa = await extraerEmpresa(page);

          resultados.push({
            input: cred.rutCompleto,
            planContable: cred.planContable,
            empresa,
            ok: true,
          });

          console.log(`✓ Datos extraídos para ${cred.planContable} - ${cred.rutCompleto}:`);

          console.log(JSON.stringify(empresa, null, 2));
          console.log(
            empresa.id,
            empresa.razon_social,
            empresa.giro,
            empresa.regimen_tributario,
            empresa.telefono_corporativo,
            empresa.email_corporativo,
            empresa.logo_url,
            empresa.configuracion,
            empresa.activo,
            empresa.nombre_rep,
            cred.planContable
          );
          procesado = true;
        } catch (err) {
          if (err?.code === "INVALID_CREDENTIALS") {
            incorrectos.push({
              input: cred.rutCompleto,
              planContable: cred.planContable,
              motivo: "clave_o_rut_incorrecto",
              error: err.message,
            });

            resultados.push({
              input: cred.rutCompleto,
              planContable: cred.planContable,
              ok: false,
              tipo: "incorrecto",
              error: err.message,
            });

            console.log(`✖ Credenciales inválidas para ${cred.rutCompleto}`);
            procesado = true;
            continue;
          }

          if (esErrorReintentable(err) && intento < MAX_REINTENTOS_TEMPORALES) {
            intento += 1;
            const esperaMs = 2000 * intento;
            console.log(
              `⚠ Error temporal con ${cred.rutCompleto}. Reintento ${intento}/${MAX_REINTENTOS_TEMPORALES} en ${esperaMs}ms.`
            );
            await new Promise(r => setTimeout(r, esperaMs));
            continue;
          }

          erroresLogin.push({
            input: cred.rutCompleto,
            planContable: cred.planContable,
            intento,
            code: err?.code ?? err?.name ?? "UNKNOWN",
            error: err?.message ?? "Error desconocido",
          });

          resultados.push({
            input: cred.rutCompleto,
            planContable: cred.planContable,
            ok: false,
            tipo: "error",
            error: err?.message ?? "Error desconocido",
          });

          console.log(`✖ Error con ${cred.rutCompleto}: ${err?.message ?? "Error desconocido"}`);
          procesado = true;
        }
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    fs.writeFileSync(
      RESULTADOS_OUTPUT_PATH,
      JSON.stringify(resultados, null, 2),
      "utf-8"
    );

    fs.writeFileSync(
      INCORRECTOS_OUTPUT_PATH,
      JSON.stringify(incorrectos, null, 2),
      "utf-8"
    );

    fs.writeFileSync(
      ERRORES_LOGIN_OUTPUT_PATH,
      JSON.stringify(erroresLogin, null, 2),
      "utf-8"
    );

    console.log("Proceso completo terminado.");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();