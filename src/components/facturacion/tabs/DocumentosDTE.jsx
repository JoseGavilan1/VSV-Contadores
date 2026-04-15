import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileWarning, Loader2, Search, Filter, Building2, FileText, Hash, ArrowUpRight, ArrowDownLeft, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import { obtenerHistorialBunker, obtenerComprasBunker } from '@/services/dteConsultasService';

const NOMBRES_DTE = {
  33: "Factura Electrónica",
  34: "Factura Exenta",
  61: "Nota de Crédito",
  56: "Nota de Débito",
  52: "Guía de Despacho",
  39: "Boleta Electrónica",
  110: "Factura Exportación"
};

const DocumentosDTE = () => {
  const { selectedCompany } = useAuth();
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [tipoVista, setTipoVista] = useState('VENTAS'); // 'VENTAS' o 'COMPRAS'
  const [vistaGlobal, setVistaGlobal] = useState(false); // NUEVO: Controla si vemos 1 empresa o todas

  const [searchFolio, setSearchFolio] = useState("");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [filterMes, setFilterMes] = useState("TODOS");
  const [filterAnio, setFilterAnio] = useState("TODOS");

  const cargarHistorial = useCallback(async () => {
    // Si no estamos en Vista Global y tampoco hay empresa seleccionada, no hacemos nada
    const targetId = vistaGlobal ? 'ALL' : selectedCompany?.id;
    if (!targetId) return;

    setLoading(true);
    setDocumentos([]);

    try {
      let data;
      if (tipoVista === 'VENTAS') {
        data = await obtenerHistorialBunker(targetId);
      } else {
        data = await obtenerComprasBunker(targetId);
      }

      if (data.ok) {
        setDocumentos(data.documentos || []);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error de Conexión", description: "Falla al sincronizar con el búnker." });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, tipoVista, vistaGlobal]);

  useEffect(() => {
    // Si desactivamos la vista global y no hay empresa seleccionada, limpiamos
    if (!vistaGlobal && !selectedCompany?.id) {
        setDocumentos([]);
        return;
    }
    cargarHistorial();
  }, [selectedCompany, tipoVista, vistaGlobal, cargarHistorial]);

  const documentosFiltrados = useMemo(() => {
    return documentos.filter(doc => {
      const fecha = new Date(doc.fecha_emision);
      const matchFolio = searchFolio === "" || doc.folio.toString().includes(searchFolio);
      const matchTipo = filterTipo === "TODOS" || doc.tipo_dte.toString() === filterTipo;
      const matchAnio = filterAnio === "TODOS" || fecha.getUTCFullYear().toString() === filterAnio;
      const matchMes = filterMes === "TODOS" || (fecha.getUTCMonth() + 1).toString() === filterMes;
      
      return matchFolio && matchTipo && matchAnio && matchMes;
    });
  }, [documentos, searchFolio, filterTipo, filterMes, filterAnio]);

  // Si NO estamos en vista global y NO hay empresa, mostramos el mensaje original
  if (!vistaGlobal && !selectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] opacity-30 text-white relative">
        <div className="absolute top-4 right-4">
            <Button onClick={() => setVistaGlobal(true)} variant="outline" className="border-white/10 hover:bg-white/10 text-xs text-gray-400">
                <Globe size={14} className="mr-2"/> Ver Todas las Empresas
            </Button>
        </div>
        <Building2 size={64} className="mb-4" />
        <h3 className="font-black uppercase tracking-widest text-sm text-center">Selecciona una empresa en el CRM</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER Y SELECTORES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0f172a]/60 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                <FileText size={20} />
            </div>
            <div>
                <h2 className="text-white font-black uppercase tracking-tighter text-lg">Bóveda de Documentos</h2>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                    {vistaGlobal ? '🌐 TODAS LAS EMPRESAS' : (selectedCompany?.razon_social || selectedCompany?.razonSocial)}
                </p>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
            {/* TOGGLE VISTA GLOBAL */}
            <Button 
                onClick={() => setVistaGlobal(!vistaGlobal)} 
                variant="outline" 
                className={`h-10 text-[10px] font-black uppercase tracking-widest ${vistaGlobal ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'bg-black/40 border-white/10 text-gray-400'}`}
            >
                <Globe size={14} className="mr-2" /> {vistaGlobal ? 'Ocultar Global' : 'Modo Global'}
            </Button>

            {/* INTERRUPTOR VENTAS/COMPRAS */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 w-full sm:w-auto h-10">
                <button
                    onClick={() => setTipoVista('VENTAS')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        tipoVista === 'VENTAS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <ArrowUpRight size={14} /> Ventas
                </button>
                <button
                    onClick={() => setTipoVista('COMPRAS')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        tipoVista === 'COMPRAS' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <ArrowDownLeft size={14} /> Compras
                </button>
            </div>
        </div>
      </div>

      {/* PANEL DE FILTROS AVANZADOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0f172a]/60 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-xl">
        <div className="relative group">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input 
            type="text"
            placeholder="Buscar Folio..."
            value={searchFolio}
            onChange={(e) => setSearchFolio(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
          />
        </div>
        <div className="relative">
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer">
                <option value="TODOS">Todos los Tipos</option>
                <option value="33">Factura Electrónica (33)</option>
                <option value="34">Factura Exenta (34)</option>
                <option value="61">Nota de Crédito (61)</option>
                <option value="52">Guía de Despacho (52)</option>
            </select>
        </div>
        <select value={filterMes} onChange={(e) => setFilterMes(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer">
          <option value="TODOS">Todos los Meses</option>
          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
            <option key={m} value={(i + 1).toString()}>{m}</option>
          ))}
        </select>
        <select value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer">
          <option value="TODOS">Todos los Años</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>

      {/* HEADER DE ESTADÍSTICA RÁPIDA */}
      <div className="flex items-center justify-between px-2">
        <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${tipoVista === 'VENTAS' ? 'text-blue-500' : 'text-emerald-500'}`}>
          <FileText size={12} /> {documentosFiltrados.length} {tipoVista} en vista actual
        </span>
        <Button onClick={cargarHistorial} variant="ghost" size="sm" className="text-gray-400 hover:text-white text-[10px] font-bold uppercase transition-colors">
          Refrescar Bóveda
        </Button>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20 backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Documento</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Folio</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                    {tipoVista === 'VENTAS' ? 'Cliente' : 'Proveedor'}
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Emisión</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Monto</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 text-center">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="py-24 text-center">
                      <Loader2 className={`h-10 w-10 animate-spin mx-auto mb-4 ${tipoVista === 'VENTAS' ? 'text-blue-500' : 'text-emerald-500'}`} />
                      <p className={`text-[10px] font-black uppercase tracking-widest animate-pulse italic ${tipoVista === 'VENTAS' ? 'text-blue-400' : 'text-emerald-400'}`}>
                        Cargando bóveda {vistaGlobal ? 'global' : 'local'}...
                      </p>
                    </td>
                  </motion.tr>
                ) : documentosFiltrados.length > 0 ? (
                  documentosFiltrados.map((dte, idx) => {
                    const nombreContraparte = tipoVista === 'VENTAS' 
                        ? (dte.razon_social || 'Cliente sin nombre') 
                        : (dte.razon_social_proveedor || 'Proveedor Desconocido');
                        
                    const rutContraparte = tipoVista === 'VENTAS' 
                        ? dte.rut_cliente 
                        : dte.rut_proveedor;

                    const montoPrincipal = tipoVista === 'VENTAS' 
                        ? dte.monto_neto 
                        : (dte.monto_total || dte.monto_neto);

                    return (
                        <motion.tr 
                          key={dte.id || `dte-${idx}`} 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-white/[0.03] group transition-colors border-b border-white/5 last:border-none"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                                tipoVista === 'VENTAS' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                              {NOMBRES_DTE[dte.tipo_dte] || `DTE ${dte.tipo_dte}`}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-white italic tracking-tighter whitespace-nowrap">
                            #{dte.folio}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-200 font-medium truncate max-w-[200px]" title={nombreContraparte}>
                                    {nombreContraparte}
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono">
                                    {rutContraparte}
                                </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400 font-medium whitespace-nowrap">
                            {dte.fecha_emision ? new Date(dte.fecha_emision).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : 'Sin Fecha'}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end">
                                <span className={`text-sm font-black font-mono tracking-tighter ${tipoVista === 'VENTAS' ? 'text-blue-400' : 'text-emerald-400'}`}>
                                    ${Number(montoPrincipal || 0).toLocaleString('es-CL')}
                                </span>
                                {tipoVista === 'COMPRAS' && dte.monto_iva > 0 && (
                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                                        IVA: ${Number(dte.monto_iva).toLocaleString('es-CL')}
                                    </span>
                                )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            {dte.url_pdf ? (
                              <a 
                                href={dte.url_pdf} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 text-gray-300 border border-white/10 hover:bg-white hover:text-black transition-all shadow-lg active:scale-90"
                                title="Ver PDF"
                              >
                                <Download size={16} />
                              </a>
                            ) : (
                              <span className="text-[8px] text-gray-600 font-black uppercase italic bg-white/[0.02] px-2 py-1 rounded border border-white/5">Sin PDF</span>
                            )}
                          </td>
                        </motion.tr>
                    );
                  })
                ) : (
                  <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={6} className="py-24 text-center">
                      <FileWarning size={56} className="text-gray-700 mx-auto mb-4" />
                      <p className="text-white font-black uppercase tracking-tighter italic text-xl">
                        Bóveda Vacía
                      </p>
                      <p className="text-xs text-gray-500 max-w-[300px] mx-auto uppercase tracking-widest mt-2 leading-relaxed">
                        No hay documentos tributarios para los filtros seleccionados.
                      </p>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocumentosDTE;