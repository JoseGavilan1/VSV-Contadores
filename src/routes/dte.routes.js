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
    emitirBoletaHonorarios,
    getHistorialController // <--- Añadido correctamente
} from "../controllers/dte.controllers.js";
import path from 'path';
import fs from 'fs';

const dteRoutes = Router();

// ==========================================
// RUTAS ORIGINALES Y DE SESIÓN
// ==========================================
dteRoutes.post('/emitir-dte', emitirDTE);
dteRoutes.post('/cerrar-sesion', cerrarSesion);

// ==========================================
// OTRAS RUTAS BASE DEL SISTEMA
// ==========================================
dteRoutes.post('/login', loginDTE);
dteRoutes.get('/status', checkSIIStatus);
dteRoutes.get('/session-data', getSessionData);
dteRoutes.post('/dtes-emitidos', getDtesEmitidos);
dteRoutes.get('/test-conexion', testConnection);
dteRoutes.get('/verificar-sesion', verificarSesion);
dteRoutes.post('/obtener-pdf', obtenerPDF);
dteRoutes.post('/emitir-boleta', emitirBoletaHonorarios);

// ==========================================
// RUTAS PARA PUPPETEER (EMISIÓN)
// ==========================================
dteRoutes.post('/emitir-manual', emitirManualController);
dteRoutes.post('/emitir-masivo', emitirMasivoController);

// ==========================================
// RUTA PARA OBTENER EL HISTORIAL
// ==========================================
dteRoutes.get('/historial', getHistorialController);

// ==========================================
// RUTA PARA DESCARGAR PDF GENERADO
// ==========================================
dteRoutes.get('/download/:fileName', (req, res) => {
    const { fileName } = req.params;
    
    // Resuelve la ruta hacia la carpeta 'tmp'
    const filePath = path.resolve(process.cwd(), 'tmp', fileName);

    // Verifica si el archivo realmente existe antes de enviarlo
    if (fs.existsSync(filePath)) {
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error("❌ Error al descargar el archivo:", err);
                if (!res.headersSent) {
                    res.status(500).send("Error de descarga.");
                }
            }
        });
    } else {
        console.warn(`⚠️ Archivo no encontrado en el búnker: ${fileName}`);
        res.status(404).send("El archivo no existe en el búnker.");
    }
});

export default dteRoutes;