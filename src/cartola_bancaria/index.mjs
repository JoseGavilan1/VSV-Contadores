import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { iniciarNavegador, loginBCI, extraerMovimientosBCI, cerrarSesionBCI } from './bci_scraper.mjs';

// Obtenemos la ruta actual del script (src/cartola_bancaria)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Seguimos buscando el .env dos carpetas más atrás (en la raíz)
const rootDir = path.resolve(__dirname, '../../');
dotenv.config({ path: path.join(rootDir, '.env') }); 

async function main() {
    const rut = process.env.BANCO_RUT; 
    const dv = process.env.BANCO_DV;   
    const rutCompleto = `${rut}${dv}`; 
    const clave = process.env.BANCO_PASS; 

    let browser;
    let page; 

    try {
        console.log(`\n=======================================================`);
        console.log(`🏦 INICIANDO EXTRACCIÓN DE CARTOLAS BCI`);
        console.log(`=======================================================`);

        browser = await iniciarNavegador();
        page = await browser.newPage(); 
        
        await loginBCI(page, rutCompleto, clave);

        // Obtenemos el objeto organizado mes por mes
        const datosExtraidos = await extraerMovimientosBCI(page);
        
        // Calculamos el total de movimientos extraídos para el resumen
        let totalMovimientos = 0;
        for (const mes in datosExtraidos) {
            totalMovimientos += datosExtraidos[mes].length;
        }
        
        console.log("\n=======================================================");
        console.log(`📊 EXTRACCIÓN FINALIZADA: ${totalMovimientos} movimientos obtenidos en total.`);
        console.log("=======================================================");

        if (totalMovimientos > 0) {
            // Guardamos la información exactamente en la carpeta actual del script (__dirname)
            // Esto lo guardará en: C:\Users\felip\OneDrive\Documentos\VS\VSV-Contadores\src\cartola_bancaria
            const rutaArchivo = path.join(__dirname, 'cartolas_bci.json');
            
            await fs.writeFile(rutaArchivo, JSON.stringify(datosExtraidos, null, 4), 'utf-8');
            
            console.log(`\n💾 ¡ÉXITO! Archivo guardado correctamente en la carpeta solicitada.`);
            console.log(`📂 Ruta exacta: ${rutaArchivo}`);
        } else {
            console.log("\n[!] No se guardó ningún archivo porque no se detectaron movimientos.");
        }
        
    } catch (error) {
        console.error("\n❌ ERROR CRÍTICO EN EL PROCESO:", error.message);
    } finally {
        if (page && !page.isClosed()) {
            await cerrarSesionBCI(page);
        }
        if (browser) {
            console.log("🛑 Apagando el motor del navegador...");
            await browser.close();
        }
        process.exit(0);
    }
}

main();