import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { iniciarSesion, prepararYConsultarRCV, escanearTodoElPortal, cerrarSesion } from './sii_navegador.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ejecutarRobotRCV() {
    console.log("==================================================");
    console.log("🚀 VSV CONTADORES - ESCÁNER MAESTRO (SOLO ENERO)");
    console.log("==================================================");
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null, // Pantalla sin recortes
        args: [
            '--start-maximized',
            '--window-size=1920,1080',
            '--no-sandbox', 
            '--disable-setuid-sandbox'
        ] 
    });
    
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    page.setDefaultNavigationTimeout(90000); 

    page.on('dialog', async d => await d.accept().catch(() => {}));

    try {
        await iniciarSesion(page);
        
        // 🛑 LÍMITE DE PRUEBA: Solo ejecutamos el mes 1 (Enero)
        const meses = [1]; 
        
        for (const MES of meses) {
            console.log(`\n📅 INICIANDO EXTRACCIÓN TOTAL PERIODO: ${MES}/2026`);
            await prepararYConsultarRCV(page, 2026, MES);
            
            // Función maestra que recorre Compras, Ventas y Descargas
            const datosCompletos = await escanearTodoElPortal(page);

            const nombreArchivo = `RCV_Super_Extraccion_2026_${String(MES).padStart(2, '0')}.json`;
            fs.writeFileSync(path.join(__dirname, nombreArchivo), JSON.stringify(datosCompletos, null, 4));
            
            console.log(`💾 ¡Extracción del mes ${MES} guardada con éxito en ${nombreArchivo}!`);
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

//funciona