import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { API_BASE_URL } from "../../../../../config.js";
import { cleanRut } from "@/lib/rut.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DOC_CONFIG = {
  title: "Crear Factura Electrónica",
  description: "Completa los datos para emitir una Factura Electrónica (DTE 33) vía automatización.",
};

const FACTURA_TABS = {
  UNICA: "unica",
  MASIVA: "masiva",
};

const todayLocalISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

const BULK_BACKEND_DEFAULTS = {
  cantidad: "1",
  ciudadReceptor: "Santiago",
  fecha: todayLocalISO(),
  metodo: "1",
  ciudadEmisor: "Santiago",
};

const extractInvoiceNumber = (responseData = {}) => {
  const direct =
    responseData?.numeroDocumento ??
    responseData?.numero_documento ??
    responseData?.nroDocumento ??
    responseData?.folio ??
    responseData?.numeroFactura ??
    responseData?.numero_folio ??
    responseData?.siiFolio ??
    responseData?.NroFolio;

  if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
    return String(direct);
  }
  return "-";
};

// Valores por defecto que exige Puppeteer
const createEmptyItem = () => ({
  rutFacturar: "", 
  ciudadReceptor: "Santiago", 
  name: "", 
  cantidad: "1", 
  precio: "", 
  fecha: todayLocalISO(),
  metodo: "1",
  ciudadEmisor: "Santiago", 
  telefonoEmisor: "56978278733", 
  contactoReceptor: "", 
  rutSolicita: "", 
  unidadProducto: "1",  
  descuentoPct: "", 
  descripcionProducto: "", 
});

const normalizeHeader = (value) =>
  String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const CSV_HEADERS = {
  rutFacturar: ["rutfacturar", "rut_facturar", "rutreceptor", "rut"],
  ciudadReceptor: ["ciudadreceptor", "ciudad_receptor"],
  name: ["name", "item", "nombreitem", "nombre", "nmbitem"],
  cantidad: ["cantidad", "qtyitem", "qty", "cantidaditem"],
  precio: ["precio", "prcitem", "valor", "monto", "neto"],
  fecha: ["fecha", "fchemis", "fechadeemision", "fechaemision"],
  metodo: ["metodo", "formadepago", "forma_pago"],
  ciudadEmisor: ["ciudademisor", "ciudad_emisor", "ciudadorigen"],
  telefonoEmisor: ["telefonoemisor", "telefono_emisor", "telefono"],
  contactoReceptor: ["contactoreceptor", "contacto_receptor", "contacto", "correo", "email", "e_mail"],
  rutSolicita: ["rutsolicita", "rut_solicita"],
  unidadProducto: ["unidadproducto", "unidad_producto", "uniitem"],
  descripcionProducto: ["descripcionproducto", "descripcion", "descripcion_item"],
};

const parseCsvLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') { current += '"'; i += 1; } 
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += char;
  }
  result.push(current.trim());
  return result;
};

const parseCsvText = (content) => {
  const lines = String(content || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const rawHeaders = parseCsvLine(lines[0]);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return normalizedHeaders.reduce((acc, key, idx) => {
      acc[key] = values[idx] ?? "";
      return acc;
    }, {});
  });
};

const getCsvValue = (row, aliases = []) => {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && String(value).trim() !== "") return String(value).trim();
  }
  return "";
};

const mapCsvRowToItem = (row) => {
  const base = createEmptyItem();
  Object.entries(CSV_HEADERS).forEach(([key, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    const value = getCsvValue(row, normalizedAliases);
    if (value !== "") base[key] = value;
  });

  const rawNeto = getCsvValue(row, ["neto", "monto", "valor", "precio", "prcitem"]);
  base.precio = rawNeto !== "" ? String(rawNeto || "").trim().replace(/[^0-9]/g, "") : "";
  const rawPlan = getCsvValue(row, ["plancontable", "plan", "tipo_plan"]);
  base.name = rawPlan || "Sin Plan";
  
  return base;
};

export default function FacturaElectronicaModal({ isOpen, setIsOpen }) {
  const [activeTab, setActiveTab] = useState(FACTURA_TABS.UNICA);
  const [item, setItem] = useState(createEmptyItem());
  
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkPreviewRows, setBulkPreviewRows] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [folioGenerado, setFolioGenerado] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(FACTURA_TABS.UNICA);
      setItem(createEmptyItem());
      setBulkRows([]);
      setBulkPreviewRows([]);
      setBulkFileName("");
      setIsFinished(false);
      setFolioGenerado(null);
    }
  }, [isOpen]);

  const validate = (sourceItem = item) => {
    const errors = [];
    const precioNum = Number(sourceItem.precio);

    if (!sourceItem.rutFacturar.trim() || !cleanRut(sourceItem.rutFacturar).includes("-")) errors.push("RUT Receptor (incluye guion)");
    if (!sourceItem.contactoReceptor.trim()) errors.push("Email Contacto Receptor");
    if (!sourceItem.name.trim()) errors.push("Nombre del Plan");
    if (!sourceItem.descripcionProducto.trim()) errors.push("Mes / Descripción");
    if (!Number.isFinite(precioNum) || precioNum <= 0) errors.push("Precio (Neto)");

    if (errors.length > 0) {
      toast({ variant: "destructive", title: "Faltan campos", description: `Revisa: ${errors.join(", ")}.` });
      return false;
    }
    return true;
  };

  // Función Unitaria corregida
  const emitirDte = async (sourceItem) => {
    const rutLimpio = cleanRut(sourceItem.rutFacturar);
    const [rutFull, dv] = rutLimpio.includes('-') ? rutLimpio.split('-') : [rutLimpio, ''];
    const rutSoliLimpio = cleanRut(sourceItem.rutSolicita);
    const [rutSoli, dvSoli] = rutSoliLimpio.includes('-') ? rutSoliLimpio.split('-') : [rutSoliLimpio, ''];

    const payloadBackend = {
      rutReceptor: rutFull,
      dvReceptor: dv,
      ciudadEmisor: sourceItem.ciudadEmisor || "Santiago", 
      telefonoEmisor: sourceItem.telefonoEmisor || "56978278733", 
      ciudadReceptor: sourceItem.ciudadReceptor || "Santiago", 
      contactoReceptor: sourceItem.contactoReceptor, 
      rutSolicita: rutSoli,    
      dvSolicita: dvSoli,
      producto: {
          nombre: sourceItem.name,      
          cantidad: sourceItem.cantidad || "1", 
          unidad: sourceItem.unidadProducto || "1",   
          precio: sourceItem.precio,
          descripcion: sourceItem.descripcionProducto
      }
    };

    const res = await fetch(`${API_BASE_URL}/dte/emitir-manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadBackend),
    });

    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || "Error al emitir el documento en el servidor");
    }
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(item)) return;

    setIsSubmitting(true);
    try {
      const data = await emitirDte(item);
      setFolioGenerado(data.folio);
      setIsFinished(true);
      toast({ title: "¡Éxito!", description: `DTE emitido correctamente. Folio: ${data.folio}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error de Emisión", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Carga de Excel Masivo
  const handleCsvFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsedRows = parseCsvText(content);
      const rows = parsedRows.map(mapCsvRowToItem);
      const previewRows = rows.map((row) => ({
        plan: row.name, neto: row.precio, rut: row.rutFacturar, contacto: row.contactoReceptor, estado: "pendiente"
      }));

      setBulkRows(rows);
      setBulkPreviewRows(previewRows);
      setBulkFileName(file.name);
      toast({ title: "CSV cargado", description: `Se detectaron ${rows.length} filas.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo leer el CSV." });
    }
  };

  // Envío Masivo a tu nuevo endpoint /emitir-masivo
  const handleBulkSubmit = async () => {
    if (bulkRows.length === 0) return;
    setIsBulkSubmitting(true);

    const facturasAProcesar = [];
    
    bulkRows.forEach((rowItem) => {
      const rutLimpio = cleanRut(rowItem.rutFacturar);
      const [rutFull, dv] = rutLimpio.includes("-") ? rutLimpio.split("-") : [rutLimpio, ""];
      const rutSoliLimpio = cleanRut(rowItem.rutSolicita);
      const [rutSoli, dvSoli] = rutSoliLimpio.includes("-") ? rutSoliLimpio.split("-") : [rutSoliLimpio, ""];

      facturasAProcesar.push({
        rutReceptor: rutFull,
        dvReceptor: dv,
        ciudadEmisor: rowItem.ciudadEmisor || "Santiago",
        telefonoEmisor: rowItem.telefonoEmisor || "56978278733",
        ciudadReceptor: rowItem.ciudadReceptor || "Santiago",
        contactoReceptor: rowItem.contactoReceptor,
        rutSolicita: rutSoli,
        dvSolicita: dvSoli,
        producto: {
          nombre: rowItem.name,
          cantidad: rowItem.cantidad || "1",
          unidad: rowItem.unidadProducto || "1",
          precio: rowItem.precio,
          descripcion: rowItem.descripcionProducto,
        },
      });
    });

    try {
      setBulkPreviewRows(prev => prev.map(r => ({ ...r, estado: "procesando" })));
      
      const res = await fetch(`${API_BASE_URL}/dte/emitir-masivo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facturas: facturasAProcesar }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en lote");

      toast({ title: "¡Lote Procesado!", description: "La facturación masiva ha concluido." });
      setBulkPreviewRows(prev => prev.map(r => ({ ...r, estado: "emitida" })));
    } catch (error) {
      toast({ variant: "destructive", title: "Fallo masivo", description: error.message });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if(!isSubmitting && !isBulkSubmitting) setIsOpen(val); }}>
      <DialogContent className="sm:max-w-[980px] bg-zinc-900 border-white/10 text-white">
        {(isSubmitting || isFinished) && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm pointer-events-auto">
            <div className="flex flex-col items-center gap-6 p-10 text-center w-full max-w-sm">
              {isSubmitting ? (
                <>
                  <span className="h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />
                  <h3 className="text-xl font-bold">Procesando automatización...</h3>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-green-400">¡Factura Emitida!</h3>
                  <p className="text-lg">Folio N° {folioGenerado}</p>
                  <Button onClick={() => setIsOpen(false)} className="bg-blue-600 hover:bg-blue-700 w-full mt-4">
                    Cerrar
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="p-6">
          <DialogHeader>
            <DialogTitle>{DOC_CONFIG.title}</DialogTitle>
            <DialogDescription>{DOC_CONFIG.description}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant={activeTab === FACTURA_TABS.UNICA ? "default" : "secondary"} onClick={() => setActiveTab(FACTURA_TABS.UNICA)}>Factura única</Button>
            <Button variant={activeTab === FACTURA_TABS.MASIVA ? "default" : "secondary"} onClick={() => setActiveTab(FACTURA_TABS.MASIVA)}>Factura masiva</Button>
          </div>

          {activeTab === FACTURA_TABS.UNICA && (
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>RUT Receptor</Label><Input value={item.rutFacturar} onChange={(e) => setItem({ ...item, rutFacturar: e.target.value })} placeholder="Ej: 77871935-K" /></div>
                <div className="space-y-2"><Label>Email Contacto Receptor</Label><Input value={item.contactoReceptor} onChange={(e) => setItem({ ...item, contactoReceptor: e.target.value })} placeholder="ejemplo@empresa.cl" /></div>
                <div className="space-y-2"><Label>RUT Solicita (Opcional)</Label><Input value={item.rutSolicita} onChange={(e) => setItem({ ...item, rutSolicita: e.target.value })} placeholder="Ej: 14143766-0" /></div>
                <div className="space-y-2"><Label>Nombre del Plan</Label><Input value={item.name} onChange={(e) => setItem({...item, name: e.target.value})} placeholder="Ej: Plan EXECUTIVE" /></div>
                <div className="space-y-2"><Label>Precio (Neto)</Label><Input type="number" value={item.precio} onChange={(e) => setItem({...item, precio: e.target.value})} /></div>
                <div className="space-y-2"><Label>Mes / Descripción</Label><Input value={item.descripcionProducto} onChange={(e) => setItem({ ...item, descripcionProducto: e.target.value })} placeholder="Ej: Marzo" /></div>
              </div>
              <DialogFooter className="mt-6 border-t border-white/10 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600">Emitir Factura Manual</Button>
              </DialogFooter>
            </form>
          )}

          {activeTab === FACTURA_TABS.MASIVA && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Archivo CSV</Label>
                <Input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} disabled={isBulkSubmitting} />
              </div>
              {bulkPreviewRows.length > 0 && (
                <div className="max-h-56 overflow-auto rounded-md border border-white/10 mt-4">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white/10"><tr><th className="p-2">PLAN</th><th className="p-2">NETO</th><th className="p-2">RUT</th><th className="p-2">ESTADO</th></tr></thead>
                    <tbody>
                      {bulkPreviewRows.map((row, i) => (
                        <tr key={i} className="border-t border-white/10">
                          <td className="p-2">{row.plan}</td><td className="p-2">{row.neto}</td><td className="p-2">{row.rut}</td>
                          <td className="p-2">{row.estado === "procesando" ? "⏳ Procesando..." : row.estado}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button className="bg-blue-600" onClick={handleBulkSubmit} disabled={isBulkSubmitting || bulkRows.length === 0}>
                  {isBulkSubmitting ? "Emitiendo Lote..." : "Emitir Facturas Masivas"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}