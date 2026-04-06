import { fetchWithAuth } from './apiClient.js';
import { API_BASE_URL } from "../../config.js";

export async function enviarDteABackend(dteJson, sessionId) {
  const res = await fetchWithAuth(`${API_BASE_URL}/dte/emitir-dte`, sessionId, {
    method: "POST",
    body: dteJson,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error enviando DTE al búnker");
  }

  return res.json();
}