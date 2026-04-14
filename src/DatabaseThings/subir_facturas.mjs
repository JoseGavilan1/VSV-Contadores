import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Configuración de conexión directa (Superusuario)
const client = new Client({
    user: process.env.DBS_USER,
    host: process.env.DBS_HOST,
    database: process.env.DBS_DATABASE,
    password: process.env.DBS_PASSWORD,
    port: process.env.DBS_PORT,
    ssl: { rejectUnauthorized: false } // Obligatorio para Supabase
});

async function inyectarHistorial() {
    try {
        await client.connect();
        console.log("🔌 Conexión directa establecida (Modo Dios).");

        // Ruta absoluta del JSON
        const jsonPath = 'C:\\Users\\felip\\OneDrive\\Documentos\\VS\\VSV-Contadores\\src\\sii_core\\sii_historial_DTE\\documentos emitidos\\folios_documentos_emitidos.json';
        const documentos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

        console.log("🔍 Buscando empresas en el Búnker para vincular IDs...");
        const resEmpresas = await client.query("SELECT id, razon_social FROM empresa");
        const empresas = resEmpresas.rows;

        console.log(`🚀 Procesando ${documentos.length} documentos...`);

        for (const doc of documentos) {
            // Buscamos la empresa por Razón Social (que es texto plano en tu DB)
            const empresaMatch = empresas.find(e => 
                e.razon_social.toLowerCase().trim() === doc.razonSocial.toLowerCase().trim() ||
                doc.razonSocial.toLowerCase().includes(e.razon_social.toLowerCase())
            );

            if (empresaMatch) {
                // Mapeo de tipo DTE
                let tipoDte = 33; // Por defecto Factura
                if (doc.documento.includes("Nota de Credito")) tipoDte = 61;
                if (doc.documento.includes("Exenta")) tipoDte = 34;

                const montoTotal = parseInt(doc.montoTotal);
                const montoNeto = Math.round(montoTotal / 1.19); // Cálculo del neto

                // Insertar directamente (saltando RLS)
                const queryInsert = `
                    INSERT INTO documentos_emitidos (empresa_id, rut_cliente, tipo_dte, folio, monto_neto, fecha_emision, url_pdf)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT DO NOTHING
                `;
                const valores = [
                    empresaMatch.id, 
                    doc.rutReceptor, 
                    tipoDte, 
                    parseInt(doc.folio), 
                    montoNeto, 
                    doc.fecha, 
                    doc.enlacePdf || null
                ];

                await client.query(queryInsert, valores);
                console.log(`✅ Folio ${doc.folio} subido con éxito para: ${empresaMatch.razon_social}`);
            } else {
                console.log(`⚠️ Empresa ignorada (no existe en DB): "${doc.razonSocial}"`);
            }
        }

        console.log("\n🏁 ¡Carga de historial finalizada!");

    } catch (err) {
        console.error("❌ Error crítico:", err.message);
    } finally {
        await client.end();
    }
}

inyectarHistorial();