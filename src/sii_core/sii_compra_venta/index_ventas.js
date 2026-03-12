import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { iniciarSesion, prepararYConsultarRCV, escanearSoloVentas, cerrarSesion } from './sii_ventas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ejecutarRobotVentas() {
    console.log("==================================================");
    console.log("🚀 VSV CONTADORES - ESCÁNER DE VENTAS (SOLO ENERO)");
    console.log("==================================================");
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null, // 🛠️ ESTO EVITA QUE SE VEA CORTADO
        args: [
            '--start-maximized',
            '--window-size=1920,1080',
            '--no-sandbox', 
            '--disable-setuid-sandbox'
        ] 
    });
    
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    
    // 🛠️ Forzamos la resolución a Full HD
    await page.setViewport({ width: 1920, height: 1080 });
    page.setDefaultNavigationTimeout(90000); 

    page.on('dialog', async d => await d.accept().catch(() => {}));

    try {
        await iniciarSesion(page);
        
        // Solo ejecutamos el mes 1 (Enero) para prueba
        const meses = [1]; 
        
        for (const MES of meses) {
            console.log(`\n📅 PROCESANDO VENTAS PERIODO: ${MES}/2026`);
            await prepararYConsultarRCV(page, 2026, MES);
            
            const datosVentas = await escanearSoloVentas(page);

            const nombreArchivo = `RCV_Ventas_Solo_2026_${String(MES).padStart(2, '0')}.json`;
            fs.writeFileSync(path.join(__dirname, nombreArchivo), JSON.stringify(datosVentas, null, 4));
            
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

ejecutarRobotVentas();