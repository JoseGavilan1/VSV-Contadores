import * as siiBase from '../lib/siiBase.js';
import * as utils from '../lib/utils.js';
import * as API_DTE from '../services/apiDTE.js';
import { crear_cliente } from '../controllers/clientes.controllers.js';

// Importamos el script de Puppeteer para la factura manual y masiva
import { emitirFacturaPuppeteer } from '../components/facturacion/scripts/factura_manual.mjs';
import { emitirLotePuppeteer } from '../components/facturacion/scripts/factura_masiva.mjs';

// ==========================================
// NUEVO CONTROLADOR: Emisión Manual Puppeteer
// ==========================================
export const emitirManualController = async (req, res) => {
    try {
        const datosFactura = req.body; 

        // Verificamos que lleguen los datos mínimos
        if (!datosFactura.rutReceptor || !datosFactura.producto) {
            return res.status(400).json({ ok: false, error: "Faltan datos obligatorios para emitir la factura." });
        }

        console.log("Iniciando emisión manual con Puppeteer para RUT:", datosFactura.rutReceptor);

        // Ejecutamos el script de Puppeteer
        const resultado = await emitirFacturaPuppeteer(datosFactura);

        // Devolvemos la respuesta exitosa al frontend
        res.status(200).json(resultado);
    } catch (error) {
        console.error("Error en emitirManualController:", error);
        res.status(500).json({ ok: false, error: error.message || "Error interno al ejecutar Puppeteer." });
    }
};

// ==========================================
// NUEVO CONTROLADOR: Emisión Masiva Puppeteer
// ==========================================
export const emitirMasivoController = async (req, res) => {
    try {
        const { facturas } = req.body; 

        if (!facturas || !Array.isArray(facturas) || facturas.length === 0) {
            return res.status(400).json({ ok: false, error: "No se proporcionó un array de facturas válido." });
        }

        console.log(`Iniciando emisión MASIVA para ${facturas.length} registros...`);

        // Ejecutamos el script masivo de Puppeteer
        const resultado = await emitirLotePuppeteer(facturas);

        res.status(200).json(resultado);
    } catch (error) {
        console.error("Error en emitirMasivoController:", error);
        res.status(500).json({ ok: false, error: error.message || "Error interno al procesar el lote en Puppeteer." });
    }
};

// ==========================================
// CONTROLADORES ORIGINALES
// ==========================================

export const emitirDTE = async (req, res) => {
  try {
    const { dteJson } = req.body;
    const empresaId = req.empresaId;
    
    console.log('--- Nueva Petición de Emisión DTE ---');
    console.log('Empresa ID:', empresaId);
    console.log('DTE JSON Recibido:', JSON.stringify(dteJson, null, 2));

    if (!empresaId) {
      console.warn('Error: No se proporcionó ID de empresa');
      return res.status(400).json({ 
        ok: false, 
        error: 'No se ha seleccionado una empresa activa en el sistema.' 
      });
    }

    if (!dteJson || !dteJson.Encabezado) {
       console.warn('Error: DTE JSON inválido o incompleto');
       return res.status(400).json({ ok: false, error: 'Datos de DTE inválidos o incompletos' });
    }

    const receptor = dteJson.Encabezado.Receptor;
    console.log('Datos del Receptor extraídos:', receptor);

    // 1. Emitir el DTE en el SII
    console.log('Iniciando emisión en SII...');
    const resultSii = await siiBase.emitirDTE(dteJson);
    console.log('Resultado de emisión en SII:', resultSii);
    
    if (!resultSii || !resultSii.ok) {
       console.warn('Error devuelto por siiBase.emitirDTE:', resultSii?.error);
       return res.status(500).json({ 
           ok: false, 
           error: resultSii?.error || 'Error desconocido al emitir el documento en el SII' 
       });
    }

    const numeroDocumento = resultSii.numeroDocumento || resultSii.folio;
    console.log('Folio obtenido:', numeroDocumento);

    // 2. Crear Cliente (CRM) si corresponde
    let clienteId = null;
    try {
        console.log('Intentando registrar cliente en CRM...');
        const rutReceptorCompleto = receptor.RUTRecep || '';
        const rutReceptor = rutReceptorCompleto.split('-')[0];
        
        const reqCliente = {
            empresaId: empresaId,
            body: {
                rut: rutReceptor,
                nombre: receptor.RznSocRecep || 'Sin Razón Social',
                email: receptor.Contacto || '',
                tipo_cliente: 'empresa'
            }
        };

        const resCliente = {
             status: (code) => ({
                 json: (data) => {
                     console.log(`Respuesta interna crear_cliente (${code}):`, data);
                     if (code === 201 || code === 200) {
                        clienteId = data.id || data.cliente?.id;
                     }
                 }
             })
        };
        
        await crear_cliente(reqCliente, resCliente);
        console.log('ID de cliente obtenido/creado:', clienteId);

    } catch(err) {
         console.warn('Advertencia: No se pudo registrar el cliente en el CRM. La emisión del DTE continuará.', err);
    }
    
    // 3. Obtener el PDF del SII (Opcional, pero recomendado)
     let downloadUrl = resultSii.downloadUrl;
     let fileName = resultSii.fileName;
     
     if(!downloadUrl && numeroDocumento && dteJson.Encabezado.IdDoc.TipoDTE) {
          console.log(`Intentando obtener PDF para folio ${numeroDocumento}...`);
          try{
               const reqPDF = {
                    body: {
                         rutEmisor: dteJson.Encabezado.Emisor.RUTEmisor,
                         tipoDocumento: dteJson.Encabezado.IdDoc.TipoDTE,
                         folio: numeroDocumento
                    }
               }
               const resPDF = {
                    json: (data) => data,
                    status: () => resPDF
               }
               
               const pdfResult = await siiBase.obtenerPDF(reqPDF, resPDF);
               if(pdfResult && pdfResult.ok){
                    downloadUrl = pdfResult.downloadUrl;
                    fileName = pdfResult.fileName;
                    console.log('PDF obtenido con éxito:', downloadUrl);
               }
          }catch(err){
               console.warn("Advertencia: No se pudo obtener el PDF del DTE recién emitido", err)
          }
     }

    // 4. Guardar Documento Emitido en la BD Principal (Documentos_Emitidos)
    console.log('Intentando guardar documento en BD Principal...');
    try {
       const montoTotalStr = dteJson.Detalle?.PrcItem || dteJson.Encabezado?.Totales?.MntTotal || '0';
       const montoTotal = utils.parseSiiMonto(montoTotalStr);

       const documentoData = {
           empresa_id: empresaId,
           tipo_documento_id: 33, // TODO: Mapear según dteJson.Encabezado.IdDoc.TipoDTE (Factura Electrónica)
           numero_documento: numeroDocumento,
           fecha_emision: dteJson.Encabezado.IdDoc.FchEmis || new Date().toISOString().split('T')[0],
           receptor_rut: receptor.RUTRecep || '',
           receptor_razon_social: receptor.RznSocRecep || 'Sin Razón Social',
           monto_neto: montoTotal, // Simplificación: asumiendo que el item price es el total neto
           monto_exento: 0,
           monto_iva: Math.round(montoTotal * 0.19),
           monto_total: Math.round(montoTotal * 1.19),
           archivo_xml: resultSii.xml || '',
           archivo_pdf: fileName || '',
           estado: 'Emitido'
       };

       console.log('Datos a insertar en Documentos_Emitidos:', documentoData);
       const docId = await API_DTE.guardarDocumentoEmitido(documentoData);
       console.log('Documento guardado en BD con ID:', docId);

    } catch (err) {
        console.error('Error Crítico: Fallo al guardar el documento emitido en la BD Principal:', err);
        // NOTA: No detenemos el flujo retornando error 500, porque el DTE ya se emitió en el SII.
        // Lo ideal sería encolar este reintento o notificar al admin.
    }

    console.log('--- Emisión Completada Exitosamente ---');
    return res.status(200).json({
      ok: true,
      mensaje: 'DTE emitido, cliente actualizado y registrado en BD correctamente',
      numeroDocumento: numeroDocumento,
      downloadUrl: downloadUrl,
      fileName: fileName,
      siiData: resultSii
    });

  } catch (error) {
    console.error('❌ Error no controlado en emitirDTE:', error);
    return res.status(500).json({ 
        ok: false, 
        error: error.message || 'Error interno al procesar la emisión del documento' 
    });
  }
};

export const getDtesEmitidos = async (req, res) => {
    try {
        const result = await siiBase.getDtes(req.body);
        if (result.ok) {
            res.json(result);
        } else {
             res.status(500).json(result);
        }
    } catch (error) {
        console.error("Error en getDtesEmitidos (Controller):", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

export const testConnection = async (req, res) => {
    try {
         const result = await siiBase.testConexion();
         res.json(result);
    } catch (error) {
         res.status(500).json({ ok: false, error: error.message });
    }
}

export const loginDTE = async (req, res) => {
    try {
        const { rut, clave } = req.body;
        
        if (!rut || !clave) {
            return res.status(400).json({ 
                ok: false, 
                error: "El RUT y la clave son obligatorios para el login." 
            });
        }
        
        const result = await siiBase.loginDTE(rut, clave);
        
        if (result.ok) {
            return res.status(200).json(result);
        } else {
            return res.status(401).json(result);
        }
        
    } catch (error) {
        console.error("Error en loginDTE controller:", error);
        return res.status(500).json({ 
            ok: false, 
            error: "Error interno del servidor durante el login en el SII." 
        });
    }
};

export const checkSIIStatus = async (req, res) => {
    try {
        const result = await siiBase.checkSIIStatus();
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error en checkSIIStatus controller:", error);
        return res.status(500).json({ 
            ok: false, 
            error: "No se pudo verificar el estado de la conexión con el SII." 
        });
    }
};

export const getSessionData = async (req, res) => {
    try {
        const sessionData = await siiBase.getSessionData();
        return res.status(200).json({ ok: true, data: sessionData });
    } catch (error) {
         console.error("Error en getSessionData controller:", error);
         return res.status(500).json({ ok: false, error: "Error al obtener datos de sesión del SII." });
    }
};

export const verificarSesion = async (req, res) => {
    try {
        const result = await siiBase.verificarSesion();
        res.json(result);
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

export const cerrarSesion = async (req, res) => {
    try {
        const result = await siiBase.cerrarSesion();
        res.json(result);
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

export const obtenerPDF = async (req, res) => {
     try {
          const result = await siiBase.obtenerPDF(req.body);
          if (result.ok) {
               res.json(result);
          } else {
               res.status(500).json(result);
          }
     } catch (error) {
          console.error("Error en obtenerPDF (Controller):", error);
          res.status(500).json({ ok: false, error: error.message });
     }
}

export const emitirBoletaHonorarios = async (req, res) => {
     try {
          const result = await siiBase.emitirBoletaHonorarios(req.body);
          if(result.ok) {
               res.json(result);
          } else {
               res.status(500).json(result);
          }
     } catch(error) {
          console.error("Error en emitirBoletaHonorarios (Controller):", error);
          res.status(500).json({ ok: false, error: error.message });
     }
}