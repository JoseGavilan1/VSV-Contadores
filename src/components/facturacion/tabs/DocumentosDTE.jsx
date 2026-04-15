import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, FileWarning, Loader2, Search, Filter, Building2, FileText, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import { obtenerHistorialBunker } from '@/services/dteConsultasService';

// MAPEO DE NOMBRES TRIBUTARIOS PARA UNA MEJOR EXPERIENCIA DE USUARIO
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

  // ==========================================
  // ESTADOS DE FILTROS (INICIO GLOBAL)
  // ==========================================
  const [searchFolio, setSearchFolio] = useState("");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [filterMes, setFilterMes] = useState("TODOS");
  // CAMBIO: Ahora inicia en "TODOS" en lugar del año actual
  const [filterAnio, setFilterAnio] = useState("TODOS"); 

  // CARGA DE DATOS DESDE EL BACKEND (SUPABASE)
  const cargarHistorial = useCallback(async () => {
    if (!selectedCompany?.id) return;
    setLoading(true);
    try {
      const data = await obtenerHistorialBunker(selectedCompany.id);
      if (data.ok) {
        setDocumentos(data.documentos || []);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Falla al sincronizar con el búnker." });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  // RESET Y CARGA AL CAMBIAR DE EMPRESA
  useEffect(() => {
    setDocumentos([]);
    if (selectedCompany?.id) cargarHistorial();
  }, [selectedCompany, cargarHistorial]);

  // ==========================================
  // LÓGICA DE FILTRADO INSTANTÁNEO (useMemo)
  // ==========================================
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

  if (!selectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] opacity-30 text-white">
        <Building2 size={64} className="mb-4" />
        <h3 className="font-black uppercase tracking-widest text-sm text-center">Selecciona una empresa en el CRM</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* PANEL DE FILTROS AVANZADOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0f172a]/60 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-xl">
        
        {/* BUSCADOR POR FOLIO */}
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

        {/* FILTRO TIPO DTE */}
        <div className="relative">
            <select 
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
                <option value="TODOS">Todos los Tipos</option>
                <option value="33">Factura Electrónica (33)</option>
                <option value="34">Factura Exenta (34)</option>
                <option value="61">Nota de Crédito (61)</option>
                <option value="52">Guía de Despacho (52)</option>
            </select>
        </div>

        {/* FILTRO MES */}
        <select 
          value={filterMes}
          onChange={(e) => setFilterMes(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
        >
          <option value="TODOS">Todos los Meses</option>
          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
            <option key={m} value={(i + 1).toString()}>{m}</option>
          ))}
        </select>

        {/* FILTRO AÑO */}
        <select 
          value={filterAnio}
          onChange={(e) => setFilterAnio(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
        >
          <option value="TODOS">Todos los Años</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>

      {/* HEADER DE ESTADÍSTICA RÁPIDA */}
      <div className="flex items-center justify-between px-2">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <FileText size={12} className="text-blue-500" /> {documentosFiltrados.length} Documentos en vista actual
        </span>
        <Button onClick={cargarHistorial} variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase transition-colors">
          Refrescar Bóveda
        </Button>
      </div>

      {/* TABLA DE RESULTADOS "ESTILO BÚNKER" */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20 backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Tipo de Documento</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Folio</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Emisión</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Monto Neto</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 text-center">Archivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={5} className="py-24 text-center">
                      <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-4" />
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse italic">Abriendo bóveda de Supabase...</p>
                    </td>
                  </motion.tr>
                ) : documentosFiltrados.length > 0 ? (
                  documentosFiltrados.map((dte, idx) => (
                    <motion.tr 
                      key={dte.id || `dte-${idx}`} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-white/[0.03] group transition-colors border-b border-white/5 last:border-none"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                            dte.tipo_dte === 61 ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}>
                          {NOMBRES_DTE[dte.tipo_dte] || `DTE ${dte.tipo_dte}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-white italic tracking-tighter whitespace-nowrap">
                        #{dte.folio}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-medium whitespace-nowrap">
                        {new Date(dte.fecha_emision).toLocaleDateString('es-CL', { timeZone: 'UTC' })}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="text-sm text-emerald-400 font-black font-mono tracking-tighter">
                            ${Number(dte.monto_neto).toLocaleString('es-CL')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {dte.url_pdf ? (
                          <a 
                            href={dte.url_pdf} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 text-emerald-400 border border-white/10 hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-90"
                            title="Ver PDF"
                          >
                            <Download size={16} />
                          </a>
                        ) : (
                          <span className="text-[8px] text-gray-600 font-black uppercase italic bg-white/[0.02] px-2 py-1 rounded border border-white/5">Sin PDF</span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={5} className="py-24 text-center">
                      <FileWarning size={56} className="text-gray-700 mx-auto mb-4" />
                      <p className="text-white font-black uppercase tracking-tighter italic text-xl">Sin coincidencias</p>
                      <p className="text-xs text-gray-500 max-w-[300px] mx-auto uppercase tracking-widest mt-2 leading-relaxed">
                        No se encontraron registros para los filtros seleccionados.<br/>Intenta ajustando el año o el folio buscado.
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