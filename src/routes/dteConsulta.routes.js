import { Router } from "express";
import { consultarHistorialEmpresa } from "../controllers/dteConsulta.controllers.js";

const dteConsultaRoutes = Router();

// Definimos la ruta de historial
dteConsultaRoutes.get('/historial', consultarHistorialEmpresa);

export default dteConsultaRoutes;