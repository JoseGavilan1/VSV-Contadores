import path from 'node:path';
import { consultarDtesService, descargarFolioService } from "../services/dteConsultasService.js";

export async function consultarDtesController(req, res) {
  try {
    const { mes, anio, rutEmpresa, tipoDoc } = req.query;

    console.log(tipoDoc);
    
    if (!mes || !anio || !rutEmpresa) {
      return res.status(400).json({
        ok: false,
        error: "Faltan parámetros: mes, anio, rutEmpresa",
      });
    }

    const result = await consultarDtesService({ mes, anio, rutEmpresa, tipoDoc });
    return res.status(result.ok ? 200 : 500).json(result);
  } catch (err) {
    console.error("Error consultando DTE:", err);
    return res.status(500).json({ ok: false, error: err?.message ?? "Error interno" });
  }
}

// Añade esto a tu archivo de controladores
export async function descargarFolioController(req, res) {
  try {
    // 1. Sacamos los datos del body enviados por el JSON.stringify del front
    const { folio, tipoDoc, rutContraparte, tipoRegistro} = req.body;
    
    // 2. Sacamos el RUT del header autorizado en CORS
    const rutContexto = req.headers["x-company-rut"];

    // 🛡️ Si falta CUALQUIERA de estos, lanzará el Error 400 que viste en la imagen
    if (!folio || !rutContexto || !rutContraparte || !tipoRegistro) {
      console.error("❌ Faltan datos:", { folio, rutContexto, rutContraparte, tipoRegistro });
      return res.status(400).json({ 
        ok: false, 
        error: "Faltan parámetros críticos: Folio, RUT Contexto, RUT Contraparte o Tipo de Registro." 
      });
    }

    const result = await descargarFolioService({
      rutEmisor: rutContexto, 
      rutReceptor: rutContraparte,
      folio,
      tipoDoc: tipoDoc,
      tipoRegistro: tipoRegistro
    });

    if (result.ok && result.fileName) {
      return res.status(200).json({
        ok: true,
        downloadUrl: `/dte/download/${result.fileName}`,
        fileName: result.fileName
      });
    }

    return res.status(500).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}