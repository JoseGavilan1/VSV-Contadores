import { Router } from "express";
import { 
    emitirDTE, 
    cerrarSesion,
    emitirManualController,
    emitirMasivoController,
    getDtesEmitidos,
    testConnection,
    loginDTE,
    checkSIIStatus,
    getSessionData,
    verificarSesion,
    obtenerPDF,
    emitirBoletaHonorarios
} from "../controllers/dte.controllers.js";
import path from 'path';
import fs from 'fs';

const dteRoutes = Router();

// Rutas originales adaptadas a los nombres correctos del controlador
dteRoutes.post('/emitir-dte', emitirDTE);
dteRoutes.post('/cerrar-sesion', cerrarSesion);

// Otras rutas base de tu sistema
dteRoutes.post('/login', loginDTE);
dteRoutes.get('/status', checkSIIStatus);
dteRoutes.get('/session-data', getSessionData);
dteRoutes.post('/dtes-emitidos', getDtesEmitidos);
dteRoutes.get('/test-conexion', testConnection);
dteRoutes.get('/verificar-sesion', verificarSesion);
dteRoutes.post('/obtener-pdf', obtenerPDF);
dteRoutes.post('/emitir-boleta', emitirBoletaHonorarios);

// ==========================================
// NUEVAS RUTAS PARA PUPPETEER
// ==========================================
dteRoutes.post('/emitir-manual', emitirManualController);
dteRoutes.post('/emitir-masivo', emitirMasivoController);

// Ruta para descargar el PDF generado
dteRoutes.get('/download/:fileName', (req, res) => {
    const { fileName } = req.params;
    
    const filePath = path.resolve(process.cwd(), 'tmp', fileName);

    if (fs.existsSync(filePath)) {
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error("Error al descargar:", err);
                if (!res.headersSent) res.status(500).send("Error de descarga.");
            }
        });
    } else {
        res.status(404).send("El archivo no existe en el búnker.");
    }
});

export default dteRoutes;