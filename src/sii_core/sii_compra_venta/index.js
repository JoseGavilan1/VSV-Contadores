import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { iniciarSesion, prepararYConsultarRCV, revisarSeccionesYExtraerDatos, cerrarSesion } from './sii_navegador.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ejecutarRobotRCV() {
    console.log("==================================================");
    console.log("🚀 VSV CONTADORES - ESCÁNER RCV PROFUNDO HÍBRIDO");
    console.log("==================================================");
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        args: ['--start-maximized'] 
    });
    
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000); 

    page.on('dialog', async d => await d.accept().catch(() => {}));

    try {
        await iniciarSesion(page);
        
        const meses = [1, 2, 3]; // Enero, Febrero, Marzo 2026
        for (const MES of meses) {
            console.log(`\n📅 PROCESANDO PERIODO: ${MES}/2026`);
            await prepararYConsultarRCV(page, 2026, MES);
            
            const datosCompletos = await revisarSeccionesYExtraerDatos(page);

            const nombreArchivo = `RCV_Extraccion_Profunda_2026_${String(MES).padStart(2, '0')}.json`;
            fs.writeFileSync(path.join(__dirname, nombreArchivo), JSON.stringify(datosCompletos, null, 4));
            
            console.log(`💾 Guardado con éxito: ${nombreArchivo}`);
            await new Promise(r => setTimeout(r, 2000));
        }

        await cerrarSesion(page);

    } catch (error) {
        console.error("\n❌ Error Crítico:", error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log("🛑 Robot apagado.");
        }
    }
}

ejecutarRobotRCV();