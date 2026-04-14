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
import { Building2, Mail, CreditCard, Loader2, Tag, Receipt } from "lucide-react";
import { API_BASE_URL } from "../../../../../config.js";
import { cleanRut } from "@/lib/rut.js";

// IMPORTAMOS EL CONTEXTO GLOBAL PARA LEER LA EMPRESA
import { useAuth } from "@/hooks/useAuth.jsx"; 

const DOC_CONFIG = {
  title: "Crear Exenta Electrónica",
  description: "Emite una Factura Exenta (DTE 34) automatizada usando los datos de la empresa activa.",
};

const TABS = {
  UNICA: "unica",
  MASIVA: "masiva",
};

const todayLocalISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

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

// --- FUNCIONES DE PARSEO CSV ---
const normalizeHeader = (value) =>
  String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const CSV_HEADERS = {
  rutFacturar: ["rutfacturar", "rut_facturar", "rutreceptor", "rut"],
  ciudadReceptor: ["ciudadreceptor", "ciudad_receptor"],
  name: ["name", "item", "nombreitem", "nombre", "nmbitem", "plancontable", "plan"],
  cantidad: ["cantidad", "qtyitem", "qty", "cantidaditem"],
  precio: ["precio", "prcitem", "valor", "monto", "neto", "exento"],
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

  const rawPrecio = getCsvValue(row, ["exento", "neto", "monto", "valor", "precio", "prcitem"]);
  base.precio = rawPrecio !== "" ? String(rawPrecio || "").trim().replace(/[^0-9]/g, "") : "";
  const rawPlan = getCsvValue(row, ["plancontable", "plan", "tipo_plan"]);
  base.name = rawPlan || "Sin Plan";
  
  return base;
};
// --------------------------------

export default function ExentaElectronicaModal({ isOpen, setIsOpen }) {
  const { selectedCompany } = useAuth();

  const [activeTab, setActiveTab] = useState(TABS.UNICA);
  const [item, setItem] = useState(createEmptyItem());
  
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkPreviewRows, setBulkPreviewRows] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [folioGenerado, setFolioGenerado] = useState(null);

  const razonSocialSegura = selectedCompany?.razon_social || selectedCompany?.razonSocial || 'Razón Social Desconocida';

  useEffect(() => {
    if (isOpen) {
      setActiveTab(TABS.UNICA);
      setBulkRows([]);
      setBulkPreviewRows([]);
      setBulkFileName("");
      setIsFinished(false);
      setFolioGenerado(null);

      if (selectedCompany) {
        const correosCrudos = selectedCompany.email_corporativo || selectedCompany.correo || selectedCompany.email || "";
        const primerCorreo = correosCrudos.split(/[,;/\s]+/)[0].trim();

        setItem({
          ...createEmptyItem(),
          rutFacturar: selectedCompany.rut_encrypted || selectedCompany.rut || "",
          contactoReceptor: primerCorreo,
          rutSolicita: selectedCompany.rut_rep_encrypted || selectedCompany.repRut || "",
          name: selectedCompany.plan_nombre || selectedCompany.plan || "", 
          precio: selectedCompany.impuesto_pagar || selectedCompany.neto || "",
          descripcionProducto: "Servicios Contables",
        });
      } else {
        setItem(createEmptyItem());
      }
    }
  }, [isOpen, selectedCompany]);

  const validate = (sourceItem = item) => {
    const errors = [];
    const precioNum = Number(sourceItem.precio);

    if (!sourceItem.rutFacturar.trim() || !cleanRut(sourceItem.rutFacturar).includes("-")) errors.push("Falta RUT Receptor");
    if (!sourceItem.name.trim()) errors.push("Falta el Nombre del Plan");
    if (!sourceItem.descripcionProducto.trim()) errors.push("Debes ingresar el Mes/Descripción");
    if (!Number.isFinite(precioNum) || precioNum <= 0) errors.push("Debes ingresar un Monto Exento válido");

    if (errors.length > 0) {
      toast({ variant: "destructive", title: "Datos incompletos", description: `Revisa: ${errors.join(", ")}.` });
      return false;
    }
    return true;
  };

  const emitirDte = async (sourceItem) => {
    const rutLimpio = cleanRut(sourceItem.rutFacturar);
    const [rutFull, dv] = rutLimpio.includes('-') ? rutLimpio.split('-') : [rutLimpio, ''];
    
    const rutSoliLimpio = cleanRut(sourceItem.rutSolicita);
    const [rutSoli, dvSoli] = rutSoliLimpio.includes('-') ? rutSoliLimpio.split('-') : [rutSoliLimpio, ''];

    // CREACIÓN DEL PAYLOAD
    const payloadBackend = {
      tipo_documento: "34", // EL CÓDIGO MAESTRO PARA LA EXENTA
      empresa_id: selectedCompany.id, 
      razonSocial: razonSocialSegura,
      rutReceptor: rutFull || '',
      dvReceptor: dv || '',
      ciudadEmisor: 'Santiago',
      telefonoEmisor: '56978278733',
      ciudadReceptor: 'Santiago',
      contactoReceptor: sourceItem.contactoReceptor || '',
      rutSolicita: rutSoli || '',
      dvSolicita: dvSoli || '',
      producto: {
          nombre: sourceItem.name.trim(),
          cantidad: '1',                            
          unidad: '1',                              
          precio: String(sourceItem.precio).replace(/[^0-9]/g, ''), 
          descripcion: sourceItem.descripcionProducto 
      }
    };

    console.log("=====================================");
    console.log("🚨 ENVIANDO ORDEN DE FACTURA EXENTA 🚨");
    console.log("TIPO DOCUMENTO:", payloadBackend.tipo_documento);
    console.log("DATOS:", payloadBackend);
    console.log("=====================================");

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
      toast({ title: "¡Éxito!", description: `Exenta emitida correctamente. Folio: ${data.folio}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error de Emisión", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      toast({ title: "CSV cargado", description: `Se detectaron ${rows.length} filas para Exentas.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo leer el CSV." });
    }
  };

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
        tipo_documento: "34", 
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

      toast({ title: "¡Lote Procesado!", description: "La facturación exenta masiva ha concluido." });
      setBulkPreviewRows(prev => prev.map(r => ({ ...r, estado: "emitida" })));
    } catch (error) {
      toast({ variant: "destructive", title: "Fallo masivo", description: error.message });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if(!isSubmitting && !isBulkSubmitting) setIsOpen(val); }}>
      <DialogContent className="sm:max-w-[800px] bg-zinc-900 border-emerald-500/20 text-white">
        
        {(isSubmitting || isFinished) && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm pointer-events-auto rounded-lg">
            <div className="flex flex-col items-center gap-6 p-10 text-center w-full max-w-sm">
              {isSubmitting ? (
                <>
                  <span className="h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-emerald-500" />
                  <h3 className="text-xl font-bold">Procesando Exenta en SII...</h3>
                </>
              ) : (
                <>
                  <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-400 uppercase italic tracking-tighter">¡Exenta Emitida!</h3>
                  <p className="text-gray-400 font-mono">Folio N° {folioGenerado}</p>
                  <Button onClick={() => setIsOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 w-full mt-4 rounded-xl uppercase font-black tracking-widest text-[10px]">
                    Finalizar Operación
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
               <Receipt className="text-emerald-500" size={28} />
               <div>
                  <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">{DOC_CONFIG.title}</DialogTitle>
                  <DialogDescription className="text-gray-400">{DOC_CONFIG.description}</DialogDescription>
               </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 mt-6">
            <Button variant={activeTab === TABS.UNICA ? "default" : "secondary"} onClick={() => setActiveTab(TABS.UNICA)} className={activeTab === TABS.UNICA ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}>Exenta única</Button>
            <Button variant={activeTab === TABS.MASIVA ? "default" : "secondary"} onClick={() => setActiveTab(TABS.MASIVA)} className={activeTab === TABS.MASIVA ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}>Exenta masiva (CSV)</Button>
          </div>

          {activeTab === TABS.UNICA && (
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              
              <div className="bg-white/[0.02] border border-emerald-500/20 rounded-2xl p-5 shadow-inner">
                <h4 className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Building2 size={14} /> Facturando a
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Razón Social</p>
                        <p className="text-sm font-black text-white truncate">{razonSocialSegura}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">RUT</p>
                        <p className="text-sm font-mono text-emerald-400">{item.rutFacturar || 'Sin RUT'}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1"><Mail size={10} /> Correo de Envío</p>
                        <p className="text-sm text-gray-300 truncate">{item.contactoReceptor || 'Sin correo registrado'}</p>
                    </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-300">Plan Contratado / Producto</Label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <Input 
                            type="text" 
                            value={item.name} 
                            onChange={(e) => setItem({...item, name: e.target.value})} 
                            className="pl-10 bg-black/40 border-white/10 focus:border-emerald-500 h-12 rounded-xl text-md"
                            placeholder="Ej: Plan Executive"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-300">Monto Exento</Label>
                      <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                          <Input 
                              type="number" 
                              value={item.precio} 
                              onChange={(e) => setItem({...item, precio: e.target.value})} 
                              className="pl-10 bg-black/40 border-white/10 focus:border-emerald-500 h-12 rounded-xl text-lg font-mono"
                              placeholder="Ej: 50000"
                          />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-300">Mes / Descripción</Label>
                      <Input 
                          value={item.descripcionProducto} 
                          onChange={(e) => setItem({ ...item, descripcionProducto: e.target.value })} 
                          className="bg-black/40 border-white/10 focus:border-emerald-500 h-12 rounded-xl"
                          placeholder="Ej: Servicios de Marzo" 
                      />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6 border-t border-white/5 pt-6">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-8 shadow-lg shadow-emerald-500/20 font-black uppercase text-[10px] tracking-widest">
                    Emitir Exenta Ahora
                </Button>
              </DialogFooter>
            </form>
          )}

          {activeTab === TABS.MASIVA && (
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Archivo CSV (Para Exentas)</Label>
                <Input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} disabled={isBulkSubmitting} className="bg-black/40 border-white/10 file:text-white file:bg-white/10 file:rounded-lg file:border-0 hover:file:bg-white/20" />
              </div>
              {bulkPreviewRows.length > 0 && (
                <div className="max-h-56 overflow-auto rounded-xl border border-white/10 mt-4 custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white/5 sticky top-0 backdrop-blur-md">
                        <tr>
                            <th className="p-3 font-black text-gray-400 uppercase tracking-widest">Plan</th>
                            <th className="p-3 font-black text-gray-400 uppercase tracking-widest">Exento</th>
                            <th className="p-3 font-black text-gray-400 uppercase tracking-widest">RUT</th>
                            <th className="p-3 font-black text-gray-400 uppercase tracking-widest">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bulkPreviewRows.map((row, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-medium">{row.plan}</td>
                          <td className="p-3 text-emerald-400 font-mono">${row.neto}</td>
                          <td className="p-3 text-gray-300 font-mono">{row.rut}</td>
                          <td className="p-3">
                              {row.estado === "procesando" ? (
                                  <span className="text-emerald-400 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Procesando</span>
                              ) : row.estado === "emitida" ? (
                                  <span className="text-emerald-400 font-bold">Completado</span>
                              ) : (
                                  <span className="text-gray-500">En espera</span>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <DialogFooter className="mt-6 border-t border-white/5 pt-6">
                <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-gray-400">Cancelar</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-8 shadow-lg shadow-emerald-500/20 font-black uppercase text-[10px] tracking-widest" onClick={handleBulkSubmit} disabled={isBulkSubmitting || bulkRows.length === 0}>
                  {isBulkSubmitting ? "Emitiendo Lote..." : "Iniciar Emisión Masiva"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}