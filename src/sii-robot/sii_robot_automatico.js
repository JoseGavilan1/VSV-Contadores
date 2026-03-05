import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Importamos nuestros módulos separados (¡Aquí está la magia!)
import { extraerDatosFactura } from './leerpdf_documentos_recibidos.js';
import { iniciarSesion, extraerTablaFolios, descargarPDF, cerrarSesion } from './sii_operaciones.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rutaArchivoJSON = path.join(__dirname, 'folios_documentos_recibidos.json');
const carpetaDescargas = path.join(__dirname, 'pdf_descargados');

if (!fs.existsSync(carpetaDescargas)) {
    fs.mkdirSync(carpetaDescargas);
}

async function ejecutarRobotAutomatico() {
    console.log("==================================================");
    console.log("🚀 INICIANDO SÚPER ROBOT MODULAR - VSV CONTADORES");
    console.log("==================================================");
    
    const rutaEdge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

    const browser = await puppeteer.launch({ 
        headless: true,
        defaultViewport: null,
        executablePath: rutaEdge
    });
    
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000); 

    // Escudo anti-bloqueos
    page.on('dialog', async dialog => {
        await dialog.accept().catch(() => {});
    });

    try {
        // --- 1. INICIAR SESIÓN ---
        await iniciarSesion(page);

        // --- 2. EXTRAER LA TABLA Y MEMORIZAR URL ---
        const { facturasExtraidas, urlTablaPrincipal } = await extraerTablaFolios(page);

        // Actualizar Base de Datos JSON
        let datosExistentes = fs.existsSync(rutaArchivoJSON) ? JSON.parse(fs.readFileSync(rutaArchivoJSON, 'utf8')) : [];
        const facturasNuevas = facturasExtraidas.filter(nueva => 
            !datosExistentes.some(guardada => guardada.rutEmisor === nueva.rutEmisor && guardada.folio === nueva.folio && guardada.documento === nueva.documento)
        );

        if (facturasNuevas.length > 0) {
            datosExistentes = [...datosExistentes, ...facturasNuevas];
            fs.writeFileSync(rutaArchivoJSON, JSON.stringify(datosExistentes, null, 2));
            console.log(`💾 ¡Se agregaron ${facturasNuevas.length} nuevos documentos a la base de datos!`);
        } else {
            console.log(`📊 No hay documentos nuevos en la tabla del portal.`);
        }

        // --- 3. CICLO DE PROCESAMIENTO ---
        console.log("\n⚙️ [3/4] Iniciando procesamiento de PDFs pendientes...");
        let datosJson = JSON.parse(fs.readFileSync(rutaArchivoJSON, 'utf8'));
        const documentosPendientes = datosJson.filter(d => d.procesado === false);

        if (documentosPendientes.length === 0) {
            console.log("✅ Todos los documentos ya están procesados. No hay nada más que hacer.");
        } else {
            console.log(`📌 Hay ${documentosPendientes.length} documentos en cola.\n`);

            for (let i = 0; i < documentosPendientes.length; i++) {
                const doc = documentosPendientes[i];
                console.log(`📄 [${i + 1}/${documentosPendientes.length}] Procesando Folio: ${doc.folio} | Emisor: ${doc.rutEmisor}`);

                // LLamamos a nuestra función externa para descargar
                const rutaPDF = await descargarPDF(browser, page, doc, urlTablaPrincipal, carpetaDescargas);

                // Si descargó con éxito, lo leemos
                if (rutaPDF) {
                    const datosExtraidos = await extraerDatosFactura(rutaPDF);
                    
                    if (datosExtraidos) {
                        const index = datosJson.findIndex(f => f.rutEmisor === doc.rutEmisor && f.folio === doc.folio);
                        if (index !== -1) {
                            datosJson[index].procesado = true;
                            datosJson[index].detalleCompleto = datosExtraidos;
                            fs.writeFileSync(rutaArchivoJSON, JSON.stringify(datosJson, null, 2));
                            console.log(`   ✔️ ¡Guardado en Base de Datos!`);
                        }
                    }
                }
                await new Promise(r => setTimeout(r, 2000)); // Pausa entre documentos
            }
        }

        // --- 4. CERRAR SESIÓN ---
        await cerrarSesion(page);

    } catch (error) {
        console.error("\n❌ Error Crítico en el Robot:", error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log("🛑 Robot apagado completamente.");
        }
    }
}

ejecutarRobotAutomatico();