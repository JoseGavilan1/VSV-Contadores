// sii_extraccion.mjs
export async function extraerDatosTributarios(page) {
    console.log("[+] Esperando a que cargue el dashboard del SII...");
    await page.waitForSelector("#nameCntr", { timeout: 20000 });
    
    // --- MANEJO DEL POPUP DE "ACTUALIZAR DATOS" ---
    console.log("[+] Verificando si existe el banner de actualización de datos...");
    try {
        // Le damos 2 segundos para que cualquier animación de popup termine de aparecer
        await new Promise(r => setTimeout(r, 2000));
        
        await page.evaluate(() => {
            // Buscamos todos los botones o enlaces
            const elementos = Array.from(document.querySelectorAll('button, a'));
            // Filtramos el que contenga "más tarde" o "mas tarde"
            const btnMasTarde = elementos.find(el => el.innerText && el.innerText.toLowerCase().includes('m\u00e1s tarde') || el.innerText.toLowerCase().includes('mas tarde'));
            
            if (btnMasTarde) {
                btnMasTarde.click();
            } else {
                // A veces el botón tiene clases específicas en el SII, intentamos forzar el cierre de modales de Bootstrap
                const btnCerrarModal = document.querySelector('[data-dismiss="modal"]');
                if (btnCerrarModal) btnCerrarModal.click();
            }
        });
        
        // Pequeña pausa para que el modal desaparezca visualmente
        await new Promise(r => setTimeout(r, 1000)); 
    } catch (e) {
        console.log("[!] No se encontró el popup o ya estaba cerrado.");
    }

    console.log("[+] Extrayendo Representantes Legales y datos de la empresa...");
    return await page.evaluate(() => {
        const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || 'No registra';

        // Datos básicos
        const razonSocial = getText("#nameCntr");
        const rut = getText("#rutCntr");
        const direccion = getText("#domiCntr");
        const correo = getText("#mailCntr");

        let telefono = 'No registra';
        const tdsTelefono = Array.from(document.querySelectorAll("#tablaDatosTelefonos td"));
        const cellTel = tdsTelefono.find(td => /^\d{7,15}$/.test(td.textContent.trim()));
        if (cellTel) telefono = cellTel.textContent.trim();

        // --- EXTRACCIÓN DE REPRESENTANTES LEGALES (PRIORIDAD) ---
        // Buscamos todas las filas de la tabla de representantes
        const representantes = Array.from(document.querySelectorAll("#tablaRepresentantes tr, .table-representantes tr"))
            .map(tr => {
                // Extraemos por el atributo data-title que suele usar el SII en sus tablas responsivas
                let nombre = tr.querySelector('td[data-title*="Nombre"]')?.textContent?.trim();
                let rutRep = tr.querySelector('td[data-title*="Rut"]')?.textContent?.trim();
                
                // Si no tienen data-title, intentamos sacar las celdas por su orden (RUT suele ser la 1, Nombre la 2)
                if (!nombre || !rutRep) {
                    const celdas = tr.querySelectorAll('td');
                    if (celdas.length >= 2) {
                        rutRep = rutRep || celdas[0].textContent.trim();
                        nombre = nombre || celdas[1].textContent.trim();
                    }
                }
                return { nombre, rut: rutRep };
            })
            // Filtramos para limpiar filas vacías o cabeceras perdidas
            .filter(r => r.nombre && r.rut && !r.nombre.toLowerCase().includes('nombre'));

        // Extraer otros datos (inicio de actividades, etc.)
        let inicioActividades = 'No registra';
        let terminoGiro = 'Vigente';
        let estadoCumplimiento = 'No determinado';

        const elementosTexto = Array.from(document.querySelectorAll("div, span, p, td"));
        for (let i = 0; i < elementosTexto.length; i++) {
            const texto = elementosTexto[i].textContent.trim();
            if (texto.includes("Inicio de Actividades")) {
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
            inicioActividades, terminoGiro, estadoCumplimiento, 
            representantes // Este es el array más importante que viaja a la Base de Datos
        };
    });
}