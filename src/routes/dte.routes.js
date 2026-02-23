import { Router } from "express";
import { emitirDteController } from "../controllers/dte.controllers.js";
import path from 'path';
import fs from 'fs';

const dteRoutes = Router();
dteRoutes.post('/emitir-dte', emitirDteController);

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
