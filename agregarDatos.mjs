import fs from "node:fs";
import { parse } from "csv-parse";
import puppeteer from "puppeteer";
import { encrypt, generateHash} from "./src/utils/crypto.js";
import { pool } from "./src/database/db.js";

const LOGIN_URL =
  "https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi";

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

/* =========================
   LECTURA CSV
========================= */

async function obtenerValidosDesdeCSV() {
  return new Promise((resolve, reject) => {
    const validos = [];
    const incompletos = [];

    fs.createReadStream("CONTABILIDAD-2026.csv")
      .pipe(parse({
        delimiter: ",",
        trim: true,
        from_line: 2
      }))
      .on("data", (row) => {
        const rawRut = row?.[10]?.trim() ?? "";
        const rawClave = row?.[11]?.trim() ?? "";
        const planContable = row?.[2]?.trim() ?? "";

        console.log(planContable);

        if (!rawRut && !rawClave) return;

        const rut = normalizarRut(rawRut);
        const claveEsValida = claveValida(rawClave);

        if (rut && claveEsValida) {
          validos.push({ rutCompleto: rut, pass: rawClave, planContable });
        } else {
          incompletos.push({
            rut: rut || null,
            clave: claveEsValida ? rawClave : null,
            rawRut: rawRut || null,
            rawClave: rawClave || null
          });
        }
      })
      .on("end", () => {
        fs.writeFileSync("incompletos.json", JSON.stringify(incompletos, null, 2));
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

async function limpiarSesion(page) {
  const client = await page.target().createCDPSession();
  await client.send("Network.clearBrowserCookies");
  await client.send("Network.clearBrowserCache");
}

async function login(page, cred) {
  const [rut, dv] = cred.rutCompleto.split("-");
  const planContable = "a";

  await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });
  await page.waitForSelector("#rutcntr");

  await page.evaluate(() => {
    document.querySelector("#rutcntr").value = "";
    document.querySelector("#clave").value = "";
  });

  await page.type("#rutcntr", rut);
  await page.keyboard.type(dv);
  await page.type("#clave", cred.pass);

  await Promise.all([
    page.click("#bt_ingresar"),
    page.waitForNavigation({ waitUntil: "networkidle2" }),
  ]);
}

async function extraerEmpresa(page) {
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
  const empresas = await obtenerValidosDesdeCSV();

  const browser = await puppeteer.launch({
    headless: false
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  const resultados = [];

  for (const cred of empresas) {
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
      console.log(empresa.id, 
            empresa.razon_social, 
            empresa.giro,
            empresa.regimen_tributario, 
            empresa.telefono_corporativo, 
            empresa.email_corporativo, 
            empresa.logo_url, 
            empresa.configuracion, 
            empresa.activo,
            empresa.nombre_rep,
            cred.planContable);

      await pool.query(
        `INSERT INTO empresa (
        id, razon_social, rut_encrypted, rut_hash, giro, regimen_tributario, 
        telefono_corporativo, email_corporativo, logo_url, configuracion, activo,
        nombre_rep, rut_rep_encrypted, rut_rep_hash, plan_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
            empresa.id, 
            empresa.razon_social, 
            encrypt(empresa.rut), 
            generateHash(empresa.rut), 
            empresa.giro, 
            empresa.regimen_tributario, 
            empresa.telefono_corporativo, 
            empresa.email_corporativo, 
            empresa.logo_url, 
            empresa.configuracion, 
            empresa.activo,
            empresa.nombre_rep,
            encrypt(empresa.rut_rep),
            generateHash(empresa.rut_rep),
            cred.planContable
            ]
        );

      console.log(`✓ Empresa ${empresa.razon_social} insertada en la base de datos.`);
      await new Promise(r => setTimeout(r, 3000));

    } catch (err) {
      resultados.push({
        input: cred.rutCompleto,
        ok: false,
        error: err.message,
      });

      console.log(`✖ Error con ${cred. rutCompleto}: ${err.message}`);
    }
  }

  fs.writeFileSync(
    "empresas_resultado.json",
    JSON.stringify(resultados, null, 2),
    "utf-8"
  );

  console.log("Proceso completo terminado.");
})();