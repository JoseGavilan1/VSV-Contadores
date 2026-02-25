// sii_extraccion.mjs

export async function extraerDatosTributarios(page) {
    console.log(`[+] Esperando a que cargue el panel de datos de la empresa...`);
    
    // Esperamos el contenedor principal (Razón social) para asegurar que la página cargó
    await page.waitForSelector("#nameCntr", { timeout: 15000 });

    console.log(`[+] Extrayendo información tributaria...`);

    const datos = await page.evaluate(() => {
        // Función auxiliar para obtener texto limpio y evitar errores si el dato no existe
        const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || 'No registra';

        // 1. Datos básicos usando tus selectores
        const razonSocial = getText("#nameCntr");
        const rut = getText("#rutCntr");
        const direccion = getText("#domiCntr");
        const correo = getText("#mailCntr");

        // 2. Teléfono (Buscando el número en la tabla)
        let telefono = 'No registra';
        const tdsTelefono = Array.from(document.querySelectorAll("#tablaDatosTelefonos td"));
        const cellTel = tdsTelefono.find(td => /^\d{7,15}$/.test(td.textContent.trim()));
        if (cellTel) telefono = cellTel.textContent.trim();

        // 3. Representantes Legales
        const representantes = Array.from(document.querySelectorAll("#tablaRepresentantes tr"))
            .map(tr => ({
                nombre: tr.querySelector('td[data-title="Nombre"]')?.textContent?.trim(),
                rut: tr.querySelector('td[data-title="Rut"]')?.textContent?.trim()
            }))
            .filter(r => r.nombre || r.rut);

        // 4. Búsqueda inteligente para Inicio, Término y Cumplimiento
        // Como a veces no tienen ID fijo, buscamos las palabras clave en toda la página
        let inicioActividades = 'No registra';
        let terminoGiro = 'Vigente (Sin término)';
        let estadoCumplimiento = 'No determinado';

        // Recorremos todos los elementos de texto buscando las etiquetas
        const elementosTexto = Array.from(document.querySelectorAll("div, span, p, td"));
        
        for (let i = 0; i < elementosTexto.length; i++) {
            const texto = elementosTexto[i].textContent.trim();
            
            if (texto === "Inicio de Actividades:" || texto === "Inicio de Actividades") {
                inicioActividades = elementosTexto[i].nextElementSibling?.textContent?.trim() || 'No encontrado';
            }
            if (texto.includes("Término de Giro") && !texto.includes("Sin")) {
                terminoGiro = elementosTexto[i].nextElementSibling?.textContent?.trim() || 'Registra término';
            }
            if (texto.includes("Estado de Cumplimiento") || texto.includes("Situación Tributaria")) {
                estadoCumplimiento = elementosTexto[i].nextElementSibling?.textContent?.trim() || 'Revisar portal';
            }
        }

        return {
            razonSocial,
            rut,
            direccion,
            correo,
            telefono,
            inicioActividades,
            terminoGiro,
            estadoCumplimiento,
            representantes
        };
    });

    return datos;
}