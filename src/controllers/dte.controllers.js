import path from 'path';
import { emitirDteService } from "../services/dteService.js";

export async function emitirDteController(req, res) {
  try {
    const dteJson = req.body?.dteJson ?? req.body;
    if (!dteJson) {
      return res.status(400).json({ ok: false, error: "Falta dteJson en el body" });
    }

    const result = await emitirDteService(dteJson);

    if (result.ok && result.path) {
        const fileName = path.basename(result.path); 
        
        return res.status(200).json({
            ...result,
            downloadUrl: `/dte/download/${fileName}`,
            fileName: fileName
        });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error emitiendo DTE:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message ?? "Error interno",
    });
  }
}
