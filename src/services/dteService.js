import { cerrarSesionDtePuppeteer, emitirDteConPuppeteer } from "../components/puppeteer/emitirDTE.js";

export async function emitirDteService(dteJson) {
  const resultado = await emitirDteConPuppeteer(dteJson);
  return resultado;
}

export async function cerrarSesionDteService() {
  return await cerrarSesionDtePuppeteer();
}
