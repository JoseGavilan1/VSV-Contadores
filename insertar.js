import fs from "node:fs";
import { parse } from "csv-parse";

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

  // Debe contener al menos un número
  return /\d/.test(clean);
};

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

    if (!rawRut && !rawClave) return;

    const rut = normalizarRut(rawRut);
    const claveEsValida = claveValida(rawClave);

    if (rut && claveEsValida) {
      validos.push({ rut, clave: rawClave });
    } else {
      incompletos.push({
        rawRut: rawRut || null,
        rawClave: rawClave || null
      });
    }
  })
  .on("end", () => {
    fs.writeFileSync("validos.json", JSON.stringify(validos, null, 2));
    fs.writeFileSync("incompletos.json", JSON.stringify(incompletos, null, 2));

    console.log("Proceso terminado.");
    console.log("Validos:", validos.length);
    console.log("Incompletos:", incompletos.length);
  });