import { consultarDtesConPuppeteer, descargarPdfPorFolio } from "../components/puppeteer/registroVentaFacturas.js";

export async function consultarDtesService(params) {
  return await consultarDtesConPuppeteer(params);
}

export async function descargarFolioService(params) {
  return await descargarPdfPorFolio(params);
}