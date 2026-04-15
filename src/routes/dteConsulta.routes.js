import { Router } from "express";
import { 
    consultarHistorialBunkerController, 
    consultarComprasBunkerController 
} from "../controllers/dteConsulta.controllers.js";

const dteConsultaRoutes = Router();

dteConsultaRoutes.get('/historial', consultarHistorialBunkerController);
dteConsultaRoutes.get('/compras', consultarComprasBunkerController);

export default dteConsultaRoutes;