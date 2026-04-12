import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, FileWarning, Loader2, Search, Calendar, Filter, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { API_BASE_URL } from "../../../../config.js";
import { useAuth } from '@/hooks/useAuth.jsx';

const DocumentosDTE = () => {
  const { selectedCompany } = useAuth(); // Monitor de empresa activa
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargado, setCargado] = useState(false);

  // Carga de datos reactiva
  const cargarHistorial = useCallback(async () => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/dte/historial?empresa_id=${selectedCompany.id}`);
      const data = await res.json();
      
      if (data.ok) {
        setDocumentos(data.documentos);
        setCargado(true);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial." });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  // Se dispara cada vez que cambias de empresa en el CRM
  useEffect(() => {
    setDocumentos([]); // Limpiamos la tabla para evitar mostrar datos de la empresa anterior
    setCargado(false);
    cargarHistorial();
  }, [selectedCompany, cargarHistorial]);

  return (
    <div className="space-y-6">
      {/* BARRA DE FILTROS */}
      <div className="flex flex-wrap items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl border border-white/10 text-xs font-bold text-gray-400">
           <Filter size={14} /> Filtros Activos
        </div>
        <div className="text-xs text-blue-400 font-mono font-bold uppercase tracking-widest">
            Entidad: {selectedCompany?.razon_social || 'Ninguna'}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={cargarHistorial} 
          disabled={loading}
          className="ml-auto bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Sincronizar Historial
        </Button>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Tipo</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Folio</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Fecha Emisión</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">RUT Receptor</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Monto Neto</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Archivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence>
              {documentos.length > 0 ? (
                documentos.map((dte) => (
                  <motion.tr 
                    key={dte.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[9px] font-black uppercase">
                            DTE {dte.tipo_dte}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-white italic">N° {dte.folio}</td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(dte.fecha_emision).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-300 font-mono">{dte.rut_cliente}</td>
                    <td className="px-6 py-4 text-right text-sm text-emerald-400 font-bold font-mono">
                        ${dte.monto_neto.toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {dte.url_pdf ? (
                        <a 
                          href={dte.url_pdf} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                        >
                          <Download size={14} />
                        </a>
                      ) : (
                        <span className="text-[9px] text-gray-600 italic">No disponible</span>
                      )}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                        {loading ? (
                            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                        ) : (
                            <>
                                <FileWarning size={48} className="text-gray-600" />
                                <div className="space-y-1">
                                    <p className="text-white font-bold uppercase tracking-tighter italic">Bóveda vacía</p>
                                    <p className="text-xs text-gray-500 max-w-[200px] mx-auto uppercase tracking-widest leading-relaxed">
                                        No hay registros en la base de datos para esta empresa.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentosDTE;