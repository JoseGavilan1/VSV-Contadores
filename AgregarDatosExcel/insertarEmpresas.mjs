import fs from "node:fs";
import path from "node:path";
import { encrypt, generateHash } from "../src/utils/crypto.js";
import { pool } from "../src/database/db.js";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RESULTADOS_INPUT_PATH = path.join(SCRIPT_DIR, "output", "empresas_resultado.json");
const INSERCION_OUTPUT_PATH = path.join(SCRIPT_DIR, "output", "insercion_resultado.json");

const leerResultados = () => {
  if (!fs.existsSync(RESULTADOS_INPUT_PATH)) {
    throw new Error(`No existe ${RESULTADOS_INPUT_PATH}. Ejecuta primero agregarDatos.mjs`);
  }

  const raw = fs.readFileSync(RESULTADOS_INPUT_PATH, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("empresas_resultado.json no tiene un arreglo válido");
  }

  return parsed;
};

(async () => {
  const resultados = leerResultados();
  const insercionResultado = [];

  for (const item of resultados) {
    try {
      if (!item?.ok || !item?.empresa) {
        insercionResultado.push({
          input: item?.input ?? null,
          planContable: item?.planContable ?? null,
          inserted: false,
          skipped: true,
          reason: "Registro no válido o con error en extracción"
        });
        continue;
      }

      const empresa = item.empresa;

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
          item.planContable
        ]
      );

      insercionResultado.push({
        input: item.input,
        planContable: item.planContable,
        inserted: true,
        skipped: false,
        empresaId: empresa.id,
        razonSocial: empresa.razon_social
      });

      console.log(`✓ Insertada: ${empresa.razon_social}`);
    } catch (error) {
      insercionResultado.push({
        input: item?.input ?? null,
        planContable: item?.planContable ?? null,
        inserted: false,
        skipped: false,
        error: error.message
      });

      console.log(`✖ Error insertando ${item?.input ?? "(sin input)"}: ${error.message}`);
    }
  }

  fs.writeFileSync(
    INSERCION_OUTPUT_PATH,
    JSON.stringify(insercionResultado, null, 2),
    "utf-8"
  );

  const total = insercionResultado.length;
  const inserted = insercionResultado.filter(r => r.inserted).length;
  const skipped = insercionResultado.filter(r => r.skipped).length;
  const failed = total - inserted - skipped;

  console.log("Inserción terminada.");
  console.log(`Total: ${total} | Insertadas: ${inserted} | Omitidas: ${skipped} | Fallidas: ${failed}`);

  await pool.end();
})();
