import { Router } from "express";
import { consultarDtesController, descargarFolioController } from "../controllers/dteConsulta.controllers.js";

const dteConsultaRoutes = Router();

dteConsultaRoutes.get("/consultar", consultarDtesController);
dteConsultaRoutes.post("/descargar-folio", descargarFolioController);

export default dteConsultaRoutes;
