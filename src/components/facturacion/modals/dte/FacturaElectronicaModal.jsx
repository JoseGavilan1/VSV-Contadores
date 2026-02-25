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

// Tomar la fecha local en formato ISO (YYYY-MM-DD) para el campo de fecha de emisión
const todayLocalISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
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

export default function FacturaElectronicaModal({ isOpen, setIsOpen }) {
  const [item, setItem] = useState(createEmptyItem());
  const [showTransporte, setShowTransporte] = useState(false);
  const [showEditarDetalles, setShowEditarDetalles] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState(null);

  // Resetear el formulario cada vez que se abra el modal
  useEffect(() => {
    if (isOpen) {
      setItem(createEmptyItem());
      setShowTransporte(false);
      setShowEditarDetalles(false);
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
    setIsFinished(false);
    setDownloadInfo(null);
  };

  // Función de validación del formulario antes de enviar
  const validate = () => {
    const errors = [];
    const cantidadNum = Number(item.cantidad);
    const precioNum = Number(item.precio);

    if (!item.rutFacturar.trim() || !cleanRut(item.rutFacturar).includes("-")) errors.push("Rut a facturar");
    if (!item.ciudadReceptor.trim()) errors.push("Ciudad receptor");
    if (!item.name.trim()) errors.push("Nombre del ítem");
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) errors.push("Cantidad");
    if (!Number.isFinite(precioNum) || precioNum <= 0) errors.push("Precio");

    const hasDetalleExtraData = [
      item.ciudadEmisor,
      item.telefonoEmisor,
      item.contactoReceptor,
      item.rutSolicita,
      item.unidadProducto,
      item.descuentoPct,
      item.descripcionProducto,
    ].some((value) => String(value || "").trim() !== "");

    if (hasDetalleExtraData) {
      const descuentoNum = Number(item.descuentoPct || 0);
      if (!item.ciudadEmisor.trim()) errors.push("Ciudad emisor");
      if (item.descuentoPct !== "" && (descuentoNum < 0 || descuentoNum > 100)) {
        errors.push("% Descuento (debe estar entre 0 y 100)");
      }
    }

    const metodosValidos = ["1", "2", "3"]; 
    if (!metodosValidos.includes(String(item.metodo))) {
      errors.push("Forma de pago inválida (1: Contado, 2: Crédito, 3: Sin Costo)");
    }

    if (!item.fecha) errors.push("Fecha de emisión");

    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Faltan campos",
        description: `Error en: ${errors.join(", ")}.`,
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const rutReceptor = cleanRut(item.rutFacturar);
      const rutSolicita = cleanRut(item.rutSolicita);
      const descuentoNum = Number(item.descuentoPct || 0);
      const hasTransporteData = [
        item.transportePatente,
        item.transporteRut,
        item.transporteChofer,
        item.transporteRutChofer,
      ].some((value) => value?.trim());
      const hasDetalleExtraData = [
        item.ciudadEmisor,
        item.telefonoEmisor,
        item.contactoReceptor,
        item.rutSolicita,
        item.unidadProducto,
        item.descuentoPct,
        item.descripcionProducto,
      ].some((value) => String(value || "").trim() !== "");

      const dteJson = buildDteJson({
        TipoDTE: 33,
        Receptor: {
          RUTRecep: rutReceptor,
          CdadRecep: item.ciudadReceptor.trim(),
        },
        Detalle: {
          NmbItem: item.name.trim(),
          QtyItem: Number(item.cantidad),
          UniItem: (item.unidadProducto || "UN").trim(),
          PrcItem: Number(item.precio),
          Metodo: item.metodo,
          FchEmis: item.fecha,
          ...(descuentoNum > 0 ? { DescuentoPct: descuentoNum } : {}),
          ...(item.descripcionProducto.trim()
            ? { Descripcion: item.descripcionProducto.trim() }
            : {}),
          ...(hasTransporteData
            ? {
                Transporte: {
                  Patente: item.transportePatente,
                  RUTTrans: item.transporteRut,
                  Chofer: item.transporteChofer,
                  RUTChofer: item.transporteRutChofer,
                },
              }
            : {}),
        },
      });

      if (hasDetalleExtraData) {
        dteJson.Encabezado = dteJson.Encabezado || {};
        dteJson.Encabezado.Receptor = {
          ...(dteJson.Encabezado.Receptor || {}),
          ...(item.contactoReceptor.trim() ? { Contacto: item.contactoReceptor.trim() } : {}),
        };
        dteJson.Encabezado.Emisor = {
          ...(item.ciudadEmisor.trim() ? { CiudadOrigen: item.ciudadEmisor.trim() } : {}),
          ...(item.telefonoEmisor.trim() ? { Telefono: item.telefonoEmisor.trim() } : {}),
          ...(rutSolicita.includes("-") ? { RUTSolicita: rutSolicita } : {}),
        };
      }

      console.log("DTE JSON a enviar:", dteJson);

      const res = await fetch(`${API_BASE_URL}/dte/emitir-dte`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dteJson }),
      });

      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Error al emitir el documento");
      }

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

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if(!isSubmitting) setIsOpen(val); }}>
      <DialogContent className="sm:max-w-[650px] bg-zinc-900 border-white/10 text-white">
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

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}