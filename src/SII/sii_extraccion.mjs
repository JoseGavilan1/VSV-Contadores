export async function extraerDatosTributarios(page) {
    console.log(`[+] Extrayendo información tributaria...`);
    await page.waitForSelector("#nameCntr", { timeout: 15000 });

    return await page.evaluate(() => {
        const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || 'No registra';

        const razonSocial = getText("#nameCntr");
        const rut = getText("#rutCntr");
        const direccion = getText("#domiCntr");
        const correo = getText("#mailCntr");

        let telefono = 'No registra';
        const tdsTelefono = Array.from(document.querySelectorAll("#tablaDatosTelefonos td"));
        const cellTel = tdsTelefono.find(td => /^\d{7,15}$/.test(td.textContent.trim()));
        if (cellTel) telefono = cellTel.textContent.trim();

        const representantes = Array.from(document.querySelectorAll("#tablaRepresentantes tr"))
            .map(tr => ({
                nombre: tr.querySelector('td[data-title="Nombre"]')?.textContent?.trim(),
                rut: tr.querySelector('td[data-title="Rut"]')?.textContent?.trim()
            }))
            .filter(r => r.nombre || r.rut);

        let inicioActividades = 'No registra';
        let terminoGiro = 'Vigente (Sin término)';
        let estadoCumplimiento = 'No determinado';

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
            razonSocial, rut, direccion, correo, telefono,
            inicioActividades, terminoGiro, estadoCumplimiento, representantes
        };
    });
}