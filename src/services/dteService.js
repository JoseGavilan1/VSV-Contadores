import { emitirDteConPuppeteer } from "../components/puppeteer/emitirDTE.js";

export async function emitirDteService(dteJson) {
  const resultado = await emitirDteConPuppeteer(dteJson);
  return resultado;
}