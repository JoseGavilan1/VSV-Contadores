export async function extraerDatosTributarios(page) {
    console.log("[+] Esperando a que cargue el dashboard del SII...");
    await page.waitForSelector("#nameCntr", { timeout: 20000 });
    
    console.log("[+] Verificando banner 'Más Tarde'...");
    try {
        await new Promise(r => setTimeout(r, 2000));
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText?.toLowerCase().includes('mas tarde') || el.innerText?.toLowerCase().includes('m\u00e1s tarde'));
            if (btn) btn.click();
            else document.querySelector('[data-dismiss="modal"]')?.click();
        });
        await new Promise(r => setTimeout(r, 1000)); 
    } catch (e) {}

    console.log("[+] Extrayendo datos vitales...");
    return await page.evaluate(() => {
        const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || 'No registra';

        const razonSocial = getText("#nameCntr");
        const rut = getText("#rutCntr");
        const direccion = getText("#domiCntr");
        const correo = getText("#mailCntr");

        let telefono = 'No registra';
        const cellTel = Array.from(document.querySelectorAll("#tablaDatosTelefonos td")).find(td => /^\d{7,15}$/.test(td.textContent.trim()));
        if (cellTel) telefono = cellTel.textContent.trim();

        const representantes = Array.from(document.querySelectorAll("#tablaRepresentantes tr, .table-representantes tr"))
            .map(tr => {
                let nombre = tr.querySelector('td[data-title*="Nombre"]')?.textContent?.trim();
                let rutRep = tr.querySelector('td[data-title*="Rut"]')?.textContent?.trim();
                if (!nombre || !rutRep) {
                    const celdas = tr.querySelectorAll('td');
                    if (celdas.length >= 2) { rutRep = celdas[0].textContent.trim(); nombre = celdas[1].textContent.trim(); }
                }
                return { nombre, rut: rutRep };
            }).filter(r => r.nombre && r.rut && !r.nombre.toLowerCase().includes('nombre'));

        let inicioActividades = 'No registra', terminoGiro = 'Vigente', estadoCumplimiento = 'No determinado';
        const elementos = Array.from(document.querySelectorAll("div, span, p, td"));
        for (let i = 0; i < elementos.length; i++) {
            const txt = elementos[i].textContent.trim();
            if (txt.includes("Inicio de Actividades")) inicioActividades = elementos[i].nextElementSibling?.textContent?.trim() || 'No encontrado';
            if (txt.includes("Término de Giro") && !txt.includes("Sin")) terminoGiro = elementos[i].nextElementSibling?.textContent?.trim() || 'Registra término';
            if (txt.includes("Estado de Cumplimiento") || txt.includes("Situación Tributaria")) estadoCumplimiento = elementos[i].nextElementSibling?.textContent?.trim() || 'Revisar portal';
        }

        let giro = 'Sin giro registrado';
        const filasAct = Array.from(document.querySelectorAll("#tablaActividades tr, .table-actividades tr"));
        if (filasAct.length > 1) {
            const celdas = filasAct[1].querySelectorAll('td');
            if (celdas.length > 0) giro = celdas[0].textContent.trim();
        }

        let comuna = 'Santiago';
        if (direccion && direccion.toUpperCase().includes('COMUNA')) {
            comuna = direccion.toUpperCase().split('COMUNA')[1].trim();
        }

        return { razonSocial, rut, direccion, correo, telefono, inicioActividades, terminoGiro, estadoCumplimiento, representantes, giro, comuna };
    });
}