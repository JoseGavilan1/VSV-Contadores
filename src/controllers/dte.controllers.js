import path from 'path';
import { cerrarSesionDteService, emitirDteService } from "../services/dteService.js";

function validarDteMinimo(dteJson) {
  if (!dteJson || typeof dteJson !== 'object' || Array.isArray(dteJson)) {
    return { ok: false, faltantes: ['dteJson (objeto)'] };
  }

  const faltantes = [];

  if (!dteJson.TipoDTE) faltantes.push('TipoDTE');
  if (!dteJson?.Encabezado?.Receptor?.RUTRecep) faltantes.push('Encabezado.Receptor.RUTRecep');
  if (!dteJson?.Encabezado?.Receptor?.CdadRecep) faltantes.push('Encabezado.Receptor.CdadRecep');
  if (!dteJson?.Detalle?.NmbItem) faltantes.push('Detalle.NmbItem');
  if (!dteJson?.Detalle?.QtyItem) faltantes.push('Detalle.QtyItem');
  if (!dteJson?.Detalle?.PrcItem) faltantes.push('Detalle.PrcItem');
  if (!dteJson?.Detalle?.FchEmis) faltantes.push('Detalle.FchEmis');

  return { ok: faltantes.length === 0, faltantes };
}

export async function emitirDteController(req, res) {
  try {
    const dteJson = req.body?.dteJson ?? req.body;
    if (!dteJson) {
      return res.status(400).json({ ok: false, error: "Falta dteJson en el body" });
    }

    const validacion = validarDteMinimo(dteJson);
    if (!validacion.ok) {
      return res.status(422).json({
        ok: false,
        error: "Faltan campos requeridos en dteJson",
        missingFields: validacion.faltantes,
      });
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

    if (!result?.ok) {
      const errorText = String(result?.error || '').toLowerCase();
      const statusCode = /falt|inválid|invalid|oblig/.test(errorText) ? 422 : 502;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error emitiendo DTE:", {
      message: err?.message,
      tipoDte: req.body?.dteJson?.TipoDTE ?? req.body?.TipoDTE,
      rutReceptor: req.body?.dteJson?.Encabezado?.Receptor?.RUTRecep ?? req.body?.Encabezado?.Receptor?.RUTRecep,
    });
    return res.status(500).json({
      ok: false,
      error: err?.message ?? "Error interno",
    });
  }
}

export async function cerrarSesionDteController(_req, res) {
  try {
    const result = await cerrarSesionDteService();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message ?? "No se pudo cerrar la sesión de DTE",
    });
  }
}
