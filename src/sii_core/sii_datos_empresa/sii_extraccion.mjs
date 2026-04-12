/**
 * sii_extraccion.mjs
 * Apertura secuencial de paneles para evitar bloqueos AJAX del SII.
 */

export async function extraerDatosTributarios(page) {
    console.log("📂 [2/4] Accediendo a 'Datos personales y tributarios'...");
    
    await page.waitForSelector("#menu_datos_contribuyente");
    await page.evaluate(() => document.querySelector("#menu_datos_contribuyente").click());
    await page.waitForSelector("#accordionCntrb");

    console.log("   👉 Solicitando datos al servidor (Apertura secuencial para evitar bloqueos)...");
    
    // Lista exacta de todos los paneles que mencionaste
    const paneles = [
        'ctracc_1',   // Direcciones
        'ctracc_2',   // Teléfonos y Correos
        'ctracc_3',   // Inicio y Término
        'ctracc_cutri', // Estado Cumplimiento
        'ctracc_6',   // Actividades
        'ctracc_7',   // Sociedades
        'ctracc_9',   // Características
        'ctracc_100', // Apoderados
        'ctracc_11',  // Documentos
        'ctracc_10',  // Bienes Raíces
        'ctracc_12'   // Oficina SII
    ];

    // Clic secuencial desde Puppeteer (como un humano rápido)
    for (const panelId of paneles) {
        await page.evaluate((id) => {
            const enlace = document.querySelector(`#${id} .panel-heading a`);
            if (enlace) enlace.click();
            else {
                const div = document.getElementById(id);
                if (div) div.click();
            }
        }, panelId);
        // Pausa de 250ms entre cada clic para que el SII no anule las peticiones AJAX
        await new Promise(r => setTimeout(r, 250));
    }

    console.log("   ⏳ Esperando que el SII termine de poblar todas las tablas (7 segundos)...");
    await new Promise(r => setTimeout(r, 7000));

    console.log("🔍 [3/4] Extrayendo información profunda...");
    return await page.evaluate(() => {
        const clean = (t) => t?.replace(/\s+/g, ' ').trim() || '';
        const getText = (selector) => clean(document.querySelector(selector)?.innerText);

        // Lector inteligente de tablas
        const extraerTabla = (selectorPanel) => {
            const filas = Array.from(document.querySelectorAll(`${selectorPanel} tbody tr`));
            return filas.map(tr => {
                const celdas = Array.from(tr.querySelectorAll("td"));
                if (celdas.length === 1 && celdas[0].colSpan > 1) return null; // "Cargando..."
                if (tr.innerText.includes("Mostrando del") || tr.innerText.includes("Siguiente")) return null;
                
                if (celdas.length > 0) return celdas.map(td => clean(td.innerText)).join(' | ');
                return null;
            }).filter(Boolean);
        };

        // Extractor de texto para paneles sin tabla tradicional (ej. Características, Oficina)
        const extraerCuerpo = (selectorPanel) => {
            const cuerpo = document.querySelector(`${selectorPanel} .panel-body`);
            return cuerpo ? clean(cuerpo.innerText) : 'No registra';
        };

        // --- BÁSICOS ---
        const razonSocial = getText("#nameCntr") || 'No registra';
        const rut = getText("#rutCntr") || 'No registra';
        const direccionPrincipal = getText("#domiCntr") || 'No registra';
        let comuna = 'SANTIAGO';
        if (direccionPrincipal.includes("COMUNA")) {
            comuna = clean(direccionPrincipal.split("COMUNA")[1]?.split("CIUDAD")[0]);
        }

        // --- CONTACTO ---
        let telefono = 'No registra';
        let correo = 'No registra';
        const tdsContacto = Array.from(document.querySelectorAll("#ctracc_2 td"));
        const elCorreo = tdsContacto.find(td => td.innerText.includes("@"));
        const elFono = tdsContacto.find(td => /^[0-9]{8,15}$/.test(td.innerText.replace(/\s+/g, '')));
        if (elCorreo) correo = clean(elCorreo.innerText);
        if (elFono) telefono = clean(elFono.innerText);

        // --- TABLAS MASIVAS ---
        const direcciones = extraerTabla("#ctracc_1");
        const actividades = extraerTabla("#ctracc_6");
        const sociedades = extraerTabla("#ctracc_7");
        const apoderados = extraerTabla("#ctracc_100");
        const documentos = extraerTabla("#ctracc_11");
        const bienesRaices = extraerTabla("#ctracc_10");

        // --- TEXTOS ---
        const inicioActividades = extraerCuerpo("#ctracc_3");
        const caracteristicas = extraerCuerpo("#ctracc_9");
        const oficinaSII = extraerCuerpo("#ctracc_12");
        
        let estadoF29 = 'PENDIENTE';
        if (document.body.innerText.toUpperCase().includes("AL DÍA")) estadoF29 = 'DECLARADO';

        // --- CORRECCIÓN DE GIRO ---
        let giro = 'Sin giro registrado';
        if (actividades.length > 0) {
            // actividades[0] trae: "OTRAS ACTIVIDADES... | 960909 | 2 | NO | 05-08-2011"
            giro = actividades[0].split(' | ')[0]; // Toma la descripción, no el código numérico
        }

        let nombreRep = 'No registra';
        let rutRep = '';
        if (sociedades.length > 0) {
            nombreRep = sociedades[0].split(' | ')[0]; 
            rutRep = sociedades[0].split(' | ')[1];    
        }

        return {
            razonSocial, rut, comuna, correo, telefono, estadoF29, 
            direcciones, actividades, sociedades, apoderados, documentos, bienesRaices, 
            inicioActividades, caracteristicas, oficinaSII, giro, nombreRep, rutRep
        };
    });
}