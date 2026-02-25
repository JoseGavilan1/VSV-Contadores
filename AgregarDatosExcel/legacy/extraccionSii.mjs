import fs from "fs";
import puppeteer from "puppeteer";

const LOGIN_URL =
  "https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://misiir.sii.cl/cgi_misii/siihome.cgi";

// 🔹 Empresas de prueba
const empresas = [
  {
    rutCompleto: "77931711-0",
    pass: "DANIEL2024"
  },
  {
    rutCompleto:"78064268-8",
    pass: "Naty2024@"
  }
];

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  const resultados = [];

  for (const cred of empresas) {
    try {
      const [rut, dv] = cred.rutCompleto.split("-");

      // 🔹 Limpiar sesión antes de cada login
      const client = await page.target().createCDPSession();
      await client.send("Network.clearBrowserCookies");
      await client.send("Network.clearBrowserCache");

      // 🔹 Ir al login
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

      // 🔹 Extraer datos empresa
      const empresa = await page.evaluate(() => {
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
          razon_social: document.querySelector("#nameCntr")?.textContent?.trim() ?? null,
          rut: document.querySelector("#rutCntr")?.textContent?.trim() ?? null,
          domicilio,
          comuna,
          ciudad,
          correo: document.querySelector("#mailCntr")?.textContent?.trim() ?? null,
          telefono_movil,
          representantes_legales,
        };
      });

      resultados.push({
        input: cred.rutCompleto,
        empresa,
        ok: true,
      });

      console.log(`✔ Empresa procesada: ${cred.rutCompleto}`);

      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      resultados.push({
        input: cred.rutCompleto,
        ok: false,
        error: err.message,
      });

      console.log(`✖ Error con ${cred.rutCompleto}: ${err.message}`);
    }
  }

  fs.writeFileSync(
    "empresas_resultado.json",
    JSON.stringify(resultados, null, 2),
    "utf-8"
  );

  console.log("Proceso terminado");

  console.log("Resultados:", resultados);

  await browser.close();
})();