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
import { buildDteJson } from "@/lib/dte/buildDte";
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
  description: "Completa los datos para emitir una Factura Electrónica (DTE 33).",
};

const FACTURA_TABS = {
  UNICA: "unica",
  MASIVA: "masiva",
};

// Tomar la fecha local en formato ISO (YYYY-MM-DD) para el campo de fecha de emisión
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

const BULK_REQUEST_DELAY_MS = 3500;

const extractInvoiceNumber = (responseData = {}) => {
  const direct =
    responseData?.folio ??
    responseData?.numeroFactura ??
    responseData?.numero_folio ??
    responseData?.siiFolio ??
    responseData?.NroFolio;

  if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
    return String(direct);
  }

  const fileName = String(responseData?.fileName || "");
  const match = fileName.match(/FOLIO[_-]?(\d+)/i);
  if (match?.[1]) {
    return match[1];
  }

  return "-";
};

const isMaxSiiSessionError = (message = "") => {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("maximo de sesiones autenticadas") ||
    text.includes("máximo de sesiones autenticadas") ||
    text.includes("01.01.139.500.709.27")
  );
};

// Inicializar el estado del formulario con valores por defecto
const createEmptyItem = () => ({
  rutFacturar: "77493132-5", // Dejar vacio
  ciudadReceptor: "Santiago",
  name: "Operación Renta",
  cantidad: "1",
  precio: "100", // Dejar vacio
  fecha: todayLocalISO(),
  metodo: "1",
  ciudadEmisor: "Santiago",
  telefonoEmisor: "", // Dejar vacio
  contactoReceptor: "", // Dejar vacio
  rutSolicita: "", // Dejar vacio
  unidadProducto: "",  // Dejar vacio
  descuentoPct: "", // Dejar vacio
  descripcionProducto: "", // Dejar vacio
  transportePatente: "", // Dejar vacio
  transporteRut: "", // Dejar vacio
  transporteChofer: "", // Dejar vacio
  transporteRutChofer: "", // Dejar vacio
});

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

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
  descuentoPct: ["descuentopct", "descuento_pct"],
  descripcionProducto: ["descripcionproducto", "descripcion", "descripcion_item"],
  transportePatente: ["transportepatente", "transporte_patente", "patente"],
  transporteRut: ["transporterut", "transporte_rut", "ruttransporte"],
  transporteChofer: ["transportechofer", "transporte_chofer", "chofer"],
  transporteRutChofer: ["transporterutchofer", "transporte_rut_chofer", "rutchofer"],
};

const parseCsvLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const parseCsvText = (content) => {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

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
    if (value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const normalizeMoneyValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const digitsOnly = raw.replace(/[^0-9]/g, "");
  return digitsOnly;
};

const getBillingMonthLabel = (dateValue) => {
  const raw = String(dateValue || "").trim();
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date();

  const monthLabel = new Intl.DateTimeFormat("es-CL", { month: "long" }).format(parsedDate);
  return monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
};

const mapCsvRowToItem = (row) => {
  const base = createEmptyItem();

  Object.entries(CSV_HEADERS).forEach(([key, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    const value = getCsvValue(row, normalizedAliases);
    if (value !== "") {
      base[key] = value;
    }
  });

  const rawPlan = getCsvValue(row, ["plancontable", "plan", "tipo_plan"]);
  const rawNeto = getCsvValue(row, ["neto", "monto", "valor", "precio", "prcitem"]);
  base.precio = rawNeto !== "" ? normalizeMoneyValue(rawNeto) : "";

  if (!base.fecha) base.fecha = todayLocalISO();
  if (!["1", "2", "3"].includes(String(base.metodo))) base.metodo = "1";

  base.cantidad = String(base.cantidad || BULK_BACKEND_DEFAULTS.cantidad).trim() || BULK_BACKEND_DEFAULTS.cantidad;
  base.ciudadReceptor = String(base.ciudadReceptor || BULK_BACKEND_DEFAULTS.ciudadReceptor).trim() || BULK_BACKEND_DEFAULTS.ciudadReceptor;
  base.fecha = String(base.fecha || BULK_BACKEND_DEFAULTS.fecha).trim() || BULK_BACKEND_DEFAULTS.fecha;
  base.metodo = ["1", "2", "3"].includes(String(base.metodo)) ? String(base.metodo) : BULK_BACKEND_DEFAULTS.metodo;
  base.ciudadEmisor = String(base.ciudadEmisor || BULK_BACKEND_DEFAULTS.ciudadEmisor).trim() || BULK_BACKEND_DEFAULTS.ciudadEmisor;

  const planForItem = rawPlan || "Sin Plan";
  const billingMonth = getBillingMonthLabel(base.fecha);
  base.name = `Contabilidad ${planForItem} - ${billingMonth}`;

  return base;
};

const buildBulkPreviewRow = (row, item) => {
  const plan = getCsvValue(row, ["plancontable", "plan", "tipo_plan"]);
  const neto = getCsvValue(row, ["neto", "monto", "valor", "precio", "prcitem"]);
  const rut = getCsvValue(row, ["rut", "rutfacturar", "rutreceptor", "rut_facturar"]);
  const contacto = getCsvValue(row, ["correo", "email", "contacto", "contactoreceptor"]);

  return {
    plan: plan || item.name || "-",
    neto: neto || item.precio || "-",
    rut: rut || item.rutFacturar || "-",
    contacto: contacto || item.contactoReceptor || "-",
    numeroFactura: "-",
    descargaUrl: "",
    descargaArchivo: "",
    estado: "pendiente",
    error: "",
  };
};

export default function FacturaElectronicaModal({ isOpen, setIsOpen }) {
  const [activeTab, setActiveTab] = useState(FACTURA_TABS.UNICA);
  const [item, setItem] = useState(createEmptyItem());
  const [showTransporte, setShowTransporte] = useState(false);
  const [showEditarDetalles, setShowEditarDetalles] = useState(false);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkPreviewRows, setBulkPreviewRows] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState(null);

  // Resetear el formulario cada vez que se abra el modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab(FACTURA_TABS.UNICA);
      setItem(createEmptyItem());
      setShowTransporte(false);
      setShowEditarDetalles(false);
      setBulkRows([]);
      setBulkPreviewRows([]);
      setBulkFileName("");
      setIsBulkSubmitting(false);
      setBulkSummary(null);
      setIsFinished(false);
      setDownloadInfo(null);
    }
  }, [isOpen]);

  // Función para alternar la sección de transporte
  const toggleTransporte = () => {
    setShowTransporte((prev) => !prev);
  };

  // Función para alternar la sección de editar detalles adicionales
  const toggleEditarDetalles = () => {
    setShowEditarDetalles((prev) => !prev);
  };

  // Función para resetear el formulario a su estado inicial
  const resetForm = () => {
    setItem(createEmptyItem());
    setShowTransporte(false);
    setShowEditarDetalles(false);
    setBulkRows([]);
    setBulkPreviewRows([]);
    setBulkFileName("");
    setIsBulkSubmitting(false);
    setBulkSummary(null);
    setIsFinished(false);
    setDownloadInfo(null);
  };

  // Función de validación del formulario antes de enviar
  const validate = (sourceItem = item, showErrorToast = true) => {
    const errors = [];
    const cantidadNum = Number(sourceItem.cantidad);
    const precioNum = Number(sourceItem.precio);

    if (!sourceItem.rutFacturar.trim() || !cleanRut(sourceItem.rutFacturar).includes("-")) errors.push("Rut a facturar");
    if (!sourceItem.ciudadReceptor.trim()) errors.push("Ciudad receptor");
    if (!sourceItem.name.trim()) errors.push("Nombre del ítem");
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) errors.push("Cantidad");
    if (!Number.isFinite(precioNum) || precioNum <= 0) errors.push("Precio");

    const hasDetalleExtraData = [
      sourceItem.ciudadEmisor,
      sourceItem.telefonoEmisor,
      sourceItem.contactoReceptor,
      sourceItem.rutSolicita,
      sourceItem.unidadProducto,
      sourceItem.descuentoPct,
      sourceItem.descripcionProducto,
    ].some((value) => String(value || "").trim() !== "");

    if (hasDetalleExtraData) {
      const descuentoNum = Number(sourceItem.descuentoPct || 0);
      if (!sourceItem.ciudadEmisor.trim()) errors.push("Ciudad emisor");
      if (sourceItem.descuentoPct !== "" && (descuentoNum < 0 || descuentoNum > 100)) {
        errors.push("% Descuento (debe estar entre 0 y 100)");
      }
    }

    const metodosValidos = ["1", "2", "3"]; 
    if (!metodosValidos.includes(String(sourceItem.metodo))) {
      errors.push("Forma de pago inválida (1: Contado, 2: Crédito, 3: Sin Costo)");
    }

    if (!sourceItem.fecha) errors.push("Fecha de emisión");

    if (errors.length > 0 && showErrorToast) {
      toast({
        variant: "destructive",
        title: "Faltan campos",
        description: `Error en: ${errors.join(", ")}.`,
      });
      return false;
    }
    return true;
  };

  const buildDteFromItem = (sourceItem) => {
    const rutReceptor = cleanRut(sourceItem.rutFacturar);
    const rutSolicita = cleanRut(sourceItem.rutSolicita);
    const descuentoNum = Number(sourceItem.descuentoPct || 0);
    const hasTransporteData = [
      sourceItem.transportePatente,
      sourceItem.transporteRut,
      sourceItem.transporteChofer,
      sourceItem.transporteRutChofer,
    ].some((value) => value?.trim());
    const hasDetalleExtraData = [
      sourceItem.ciudadEmisor,
      sourceItem.telefonoEmisor,
      sourceItem.contactoReceptor,
      sourceItem.rutSolicita,
      sourceItem.unidadProducto,
      sourceItem.descuentoPct,
      sourceItem.descripcionProducto,
    ].some((value) => String(value || "").trim() !== "");

    const dteJson = buildDteJson({
      TipoDTE: 33,
      Receptor: {
        RUTRecep: rutReceptor,
        CdadRecep: sourceItem.ciudadReceptor.trim(),
      },
      Detalle: {
        NmbItem: sourceItem.name.trim(),
        QtyItem: Number(sourceItem.cantidad),
        UniItem: (sourceItem.unidadProducto || "UN").trim(),
        PrcItem: Number(sourceItem.precio),
        Metodo: sourceItem.metodo,
        FchEmis: sourceItem.fecha,
        ...(descuentoNum > 0 ? { DescuentoPct: descuentoNum } : {}),
        ...(sourceItem.descripcionProducto.trim()
          ? { Descripcion: sourceItem.descripcionProducto.trim() }
          : {}),
        ...(hasTransporteData
          ? {
              Transporte: {
                Patente: sourceItem.transportePatente,
                RUTTrans: sourceItem.transporteRut,
                Chofer: sourceItem.transporteChofer,
                RUTChofer: sourceItem.transporteRutChofer,
              },
            }
          : {}),
      },
    });

    if (hasDetalleExtraData) {
      dteJson.Encabezado = dteJson.Encabezado || {};
      dteJson.Encabezado.Receptor = {
        ...(dteJson.Encabezado.Receptor || {}),
        ...(sourceItem.contactoReceptor.trim() ? { Contacto: sourceItem.contactoReceptor.trim() } : {}),
      };
      dteJson.Encabezado.Emisor = {
        ...(sourceItem.ciudadEmisor.trim() ? { CiudadOrigen: sourceItem.ciudadEmisor.trim() } : {}),
        ...(sourceItem.telefonoEmisor.trim() ? { Telefono: sourceItem.telefonoEmisor.trim() } : {}),
        ...(rutSolicita.includes("-") ? { RUTSolicita: rutSolicita } : {}),
      };
    }

    return dteJson;
  };

  const emitirDte = async (sourceItem) => {
    const dteJson = buildDteFromItem(sourceItem);

    const res = await fetch(`${API_BASE_URL}/dte/emitir-dte`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dteJson }),
    });

    const data = await res.json();

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || "Error al emitir el documento");
    }

    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(item, true)) return;

    setIsSubmitting(true);

    try {
      const data = await emitirDte(item);

      setDownloadInfo({
        archivo: data.fileName, 
        url: `${API_BASE_URL}${data.downloadUrl}` 
      });

      setIsFinished(true);
      toast({ title: "¡Éxito!", description: "DTE emitido correctamente." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error de Emisión",
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvFileChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setBulkRows([]);
      setBulkPreviewRows([]);
      setBulkFileName("");
      setBulkSummary(null);
      return;
    }

    try {
      const content = await file.text();
      const parsedRows = parseCsvText(content);
      const rows = parsedRows.map(mapCsvRowToItem);
      const previewRows = parsedRows.map((row, index) => buildBulkPreviewRow(row, rows[index]));

      if (rows.length === 0) {
        throw new Error("El archivo no contiene filas válidas.");
      }

      setBulkRows(rows);
      setBulkPreviewRows(previewRows);
      setBulkFileName(file.name);
      setBulkSummary(null);
      toast({ title: "CSV cargado", description: `Se detectaron ${rows.length} filas para procesar.` });
    } catch (error) {
      setBulkRows([]);
      setBulkPreviewRows([]);
      setBulkFileName("");
      setBulkSummary(null);
      toast({
        variant: "destructive",
        title: "Error al leer CSV",
        description: error.message || "No se pudo procesar el archivo.",
      });
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkRows.length === 0) {
      toast({
        variant: "destructive",
        title: "Sin datos",
        description: "Carga un archivo CSV antes de emitir facturas masivas.",
      });
      return;
    }

    setIsBulkSubmitting(true);

    setBulkPreviewRows((prev) =>
      prev.map((row) => ({
        ...row,
        estado: "pendiente",
        error: "",
      }))
    );

    const errors = [];
    let successCount = 0;

    try {
      for (let index = 0; index < bulkRows.length; index += 1) {
        const rowItem = bulkRows[index];

        setBulkPreviewRows((prev) =>
          prev.map((row, rowIndex) =>
            rowIndex === index ? { ...row, estado: "procesando", error: "" } : row
          )
        );

        if (!validate(rowItem, false)) {
          errors.push(`Fila ${index + 2}: datos inválidos`);
          setBulkPreviewRows((prev) =>
            prev.map((row, rowIndex) =>
              rowIndex === index
                ? {
                    ...row,
                    estado: "error",
                    numeroFactura: "-",
                    descargaUrl: "",
                    descargaArchivo: "",
                    error: "Datos inválidos",
                  }
                : row
            )
          );
          continue;
        }

        try {
          const responseData = await emitirDte(rowItem);
          const numeroFactura = extractInvoiceNumber(responseData);
          const descargaUrl = responseData?.downloadUrl
            ? `${API_BASE_URL}${responseData.downloadUrl}`
            : "";

          setBulkPreviewRows((prev) =>
            prev.map((row, rowIndex) =>
              rowIndex === index
                ? {
                    ...row,
                    estado: "emitida",
                    numeroFactura,
                    descargaUrl,
                    descargaArchivo: responseData?.fileName || "factura.pdf",
                    error: "",
                  }
                : row
            )
          );

          if (index < bulkRows.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, BULK_REQUEST_DELAY_MS));
          }

          successCount += 1;
        } catch (error) {
          errors.push(`Fila ${index + 2}: ${error.message}`);
          setBulkPreviewRows((prev) =>
            prev.map((row, rowIndex) =>
              rowIndex === index
                ? {
                    ...row,
                    estado: "error",
                    numeroFactura: "-",
                    descargaUrl: "",
                    descargaArchivo: "",
                    error: error.message,
                  }
                : row
            )
          );

          if (isMaxSiiSessionError(error.message)) {
            errors.push("Proceso detenido: SII bloqueó por máximo de sesiones autenticadas.");
            break;
          }

          if (index < bulkRows.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, BULK_REQUEST_DELAY_MS));
          }
        }
      }

      setBulkSummary({
        total: bulkRows.length,
        successCount,
        errorCount: errors.length,
        errors,
      });

      if (errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Proceso finalizado con observaciones",
          description: `Emitidas ${successCount} de ${bulkRows.length}.`,
        });
      } else {
        toast({
          title: "Proceso completado",
          description: `Se emitieron ${successCount} facturas correctamente.`,
        });
      }
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if(!isSubmitting) setIsOpen(val); }}>
      <DialogContent className="sm:max-w-[980px] bg-zinc-900 border-white/10 text-white">
        {(isSubmitting || isFinished) && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
            <div className="flex flex-col items-center gap-6 p-10 text-center w-full max-w-sm">
              
              {isSubmitting ? (
                <>
                  <span className="h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />
                  <h3 className="text-xl font-bold text-white">Firmando con el SII...</h3>
                </>
              ) : (
                <>
                  <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white uppercase italic tracking-tighter">¡Factura Emitida!</h3>
                  
                  <div className="flex flex-col gap-3 w-full">
                    <a 
                      href={downloadInfo?.url}
                      download={downloadInfo?.archivo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-full h-12 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-900/20 cursor-pointer"
                    >
                      Descargar Factura PDF
                    </a>

                    <Button 
                      variant="ghost" 
                      onClick={() => { resetForm(); setIsOpen(false); }} 
                      className="text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-white"
                    >
                      Finalizar Operación
                    </Button>
                  </div>
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
            <Button
              type="button"
              variant={activeTab === FACTURA_TABS.UNICA ? "default" : "secondary"}
              onClick={() => setActiveTab(FACTURA_TABS.UNICA)}
              className="w-full"
            >
              Factura única
            </Button>
            <Button
              type="button"
              variant={activeTab === FACTURA_TABS.MASIVA ? "default" : "secondary"}
              onClick={() => setActiveTab(FACTURA_TABS.MASIVA)}
              className="w-full"
            >
              Factura masiva
            </Button>
          </div>

          {activeTab === FACTURA_TABS.UNICA && (
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rut_facturar">Rut a facturar</Label>
                <Input
                  id="rut_facturar"
                  value={item.rutFacturar}
                  onChange={(e) => setItem({ ...item, rutFacturar: e.target.value })}
                  placeholder="12345678-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ciudad_receptor">Ciudad receptor</Label>
                <Input
                  id="ciudad_receptor"
                  value={item.ciudadReceptor}
                  onChange={(e) => setItem({ ...item, ciudadReceptor: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="item_name">Nombre del ítem</Label>
                <Input id="item_name" value={item.name} onChange={(e) => setItem({...item, name: e.target.value})} maxLength={80} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_cantidad">Cantidad</Label>
                <Input id="item_cantidad" type="number" min="1" step="1" value={item.cantidad} onChange={(e) => setItem({...item, cantidad: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_precio">Precio</Label>
                <Input id="item_precio" type="number" min="1" step="1" value={item.precio} onChange={(e) => setItem({...item, precio: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_fecha">Fecha de Emisión</Label>
                <Input
                  id="item_fecha"
                  type="date"
                  value={item.fecha}
                  onChange={(e) => setItem({ ...item, fecha: e.target.value })}
                />
              </div>
          
              <div className="space-y-2">
                <Label>Forma de Pago</Label>
                <Select
                  value={item.metodo}
                  onValueChange={(val) => setItem({...item, metodo: val})}
                >
                  <SelectTrigger className="border-white/10">
                    <SelectValue placeholder="Seleccione método" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-white">
                    <SelectItem value="1">Contado</SelectItem>
                    <SelectItem value="2">Crédito</SelectItem>
                    <SelectItem value="3">Sin Costo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={toggleEditarDetalles}
                className="w-full md:w-auto"
              >
                {showEditarDetalles ? "Ocultar editar detalles" : "Editar detalles"}
              </Button>
            </div>

            {showEditarDetalles && (
              <div className="md:col-span-2 mt-2 p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ciudad_emisor">Ciudad emisor</Label>
                    <Input
                      id="ciudad_emisor"
                      value={item.ciudadEmisor}
                      onChange={(e) => setItem({ ...item, ciudadEmisor: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono_emisor">Teléfono emisor</Label>
                    <Input
                      id="telefono_emisor"
                      value={item.telefonoEmisor}
                      onChange={(e) => setItem({ ...item, telefonoEmisor: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contacto_receptor">Contacto Receptor</Label>
                    <Input
                      id="contacto_receptor"
                      value={item.contactoReceptor}
                      onChange={(e) => setItem({ ...item, contactoReceptor: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rut_solicita">Rut solicita</Label>
                    <Input
                      id="rut_solicita"
                      value={item.rutSolicita}
                      onChange={(e) => setItem({ ...item, rutSolicita: e.target.value })}
                      placeholder="12345678-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unidad_producto">Unidad del producto</Label>
                    <Input
                      id="unidad_producto"
                      value={item.unidadProducto}
                      onChange={(e) => setItem({ ...item, unidadProducto: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descuento_pct">% Descuento</Label>
                    <Input
                      id="descuento_pct"
                      type="number"
                      min="0"
                      max="100"
                      value={item.descuentoPct}
                      onChange={(e) => setItem({ ...item, descuentoPct: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="descripcion_producto">Descripción del producto</Label>
                    <textarea
                      id="descripcion_producto"
                      value={item.descripcionProducto}
                      onChange={(e) => setItem({ ...item, descripcionProducto: e.target.value })}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background min-h-[110px] resize-y"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={toggleTransporte}
                className="w-full md:w-auto"
              >
                {showTransporte ? "Quitar transporte" : "Agregar transporte"}
              </Button>
            </div>

            {showTransporte && (
              <div className="md:col-span-2 mt-2 p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transporte_rut">RUT Transporte</Label>
                    <Input
                      id="transporte_rut"
                      value={item.transporteRut}
                      onChange={(e) => setItem({ ...item, transporteRut: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transporte_patente">Patente</Label>
                    <Input
                      id="transporte_patente"
                      value={item.transportePatente}
                      onChange={(e) => setItem({ ...item, transportePatente: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transporte_rut_chofer">RUT Chofer</Label>
                    <Input
                      id="transporte_rut_chofer"
                      value={item.transporteRutChofer}
                      onChange={(e) => setItem({ ...item, transporteRutChofer: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transporte_chofer">Nombre Chofer</Label>
                    <Input
                      id="transporte_chofer"
                      value={item.transporteChofer}
                      onChange={(e) => setItem({ ...item, transporteChofer: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Emitir Factura</Button>
            </DialogFooter>
          </form>
          )}

          {activeTab === FACTURA_TABS.MASIVA && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="factura_masiva_csv">Archivo CSV</Label>
                <Input
                  id="factura_masiva_csv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  disabled={isBulkSubmitting}
                />
                <p className="text-xs text-zinc-400">
                  Usa columnas como: rutFacturar, ciudadReceptor, name, cantidad, precio, fecha, metodo y opcionales de detalle/transporte.
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
                <p className="text-sm"><span className="font-semibold">Archivo:</span> {bulkFileName || "Sin archivo cargado"}</p>
                <p className="text-sm"><span className="font-semibold">Filas detectadas:</span> {bulkRows.length}</p>
              </div>

              {bulkPreviewRows.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                  <p className="text-sm font-semibold">Personas a facturar</p>
                  <div className="max-h-56 overflow-auto rounded-md border border-white/10">
                    <table className="w-full text-xs">
                      <thead className="bg-white/10">
                        <tr>
                          <th className="text-left font-semibold p-2">PLAN</th>
                          <th className="text-left font-semibold p-2">NETO</th>
                          <th className="text-left font-semibold p-2">RUT</th>
                          <th className="text-left font-semibold p-2">CONTACTO</th>
                          <th className="text-left font-semibold p-2">N° FACTURA</th>
                          <th className="text-left font-semibold p-2">DESCARGA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreviewRows.map((row, index) => (
                          <tr key={`${row.rut}-${index}`} className="border-t border-white/10">
                            <td className="p-2">{row.plan}</td>
                            <td className="p-2">{row.neto}</td>
                            <td className="p-2">{row.rut}</td>
                            <td className="p-2">{row.contacto}</td>
                            <td className="p-2">{row.numeroFactura}</td>
                            <td className="p-2">
                              {row.descargaUrl ? (
                                <a
                                  href={row.descargaUrl}
                                  download={row.descargaArchivo || undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide hover:bg-blue-700"
                                >
                                  Descargar
                                </a>
                              ) : (
                                <span className="text-zinc-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {bulkSummary && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
                  <p className="text-sm font-semibold">Resultado de la emisión masiva</p>
                  <p className="text-sm">Total: {bulkSummary.total}</p>
                  <p className="text-sm text-green-400">Emitidas: {bulkSummary.successCount}</p>
                  <p className="text-sm text-red-400">Con error: {bulkSummary.errorCount}</p>
                  {bulkSummary.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded border border-white/10 p-2 text-xs text-red-300 space-y-1">
                      {bulkSummary.errors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isBulkSubmitting}>Cancelar</Button>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isBulkSubmitting || bulkRows.length === 0}
                  onClick={handleBulkSubmit}
                >
                  {isBulkSubmitting ? "Procesando..." : "Emitir facturas masivas"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}