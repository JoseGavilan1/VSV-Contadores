import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Importamos el login y tu función de operaciones
import { iniciarSesion, cerrarSesion } from '../documentos recibidos/sii_operaciones.js';
import { extraerTablaFoliosEmitidos } from './sii_emitidos_operaciones.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rutaArchivoJSON_Emitidos = path.join(__dirname, 'folios_documentos_emitidos.json');

async function ejecutarScrapperEmitidos() {
    console.log("==================================================");
    console.log("🚀 INICIANDO SCRAPPER DE EMITIDOS (SOLO TABLA)");
    console.log("==================================================");
    
    const rutaEdge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        executablePath: rutaEdge
    });
    
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000); 

    page.on('dialog', async dialog => {
        await dialog.accept().catch(() => {});
    });

    try {
        await iniciarSesion(page);

        // --- 1. EXTRACCIÓN Y ACTUALIZACIÓN DE TABLA ---
        const facturasExtraidas = await extraerTablaFoliosEmitidos(page);
        let datosExistentes = fs.existsSync(rutaArchivoJSON_Emitidos) ? JSON.parse(fs.readFileSync(rutaArchivoJSON_Emitidos, 'utf8')) : [];
        
        const facturasNuevas = facturasExtraidas.filter(nueva => 
            !datosExistentes.some(guardada => guardada.folio === nueva.folio && guardada.documento === nueva.documento)
        );

        if (facturasNuevas.length > 0) {
            datosExistentes = [...datosExistentes, ...facturasNuevas];
            fs.writeFileSync(rutaArchivoJSON_Emitidos, JSON.stringify(datosExistentes, null, 2));
            console.log(`💾 Se agregaron ${facturasNuevas.length} folios nuevos a la base de datos.`);
        } else {
            console.log(`📊 No hay folios nuevos detectados en el portal.`);
        }

    } catch (error) {
        console.error("\n❌ Error Crítico:", error.message);
    } finally {
        if (browser) {
            console.log("\n🛑 Asegurando el cierre de sesión antes de salir...");
            try {
                if (!page.isClosed()) {
                    // Llama a la función que ya tienes en sii_operaciones.js
                    await cerrarSesion(page); 
                }
            } catch(e) {}
            
            await browser.close();
            console.log("🛑 Robot apagado correctamente.");
        }
    }
}

ejecutarScrapperEmitidos();