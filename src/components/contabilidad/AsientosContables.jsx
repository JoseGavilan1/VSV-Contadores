import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Download, Eye, Edit, Trash2, FileWarning, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getJournalEntriesApi } from '@/services/accountingService';

const AsientosContables = ({ empresaId }) => {
    const { user, logout } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['journal-entries', empresaId, page, searchTerm],
        queryFn: async () => {
            const res = await getJournalEntriesApi(user.sessionId, empresaId, page, searchTerm);
            if (res.status === 401) { logout(); throw new Error("Sesión expirada"); }
            if (!res.ok) throw new Error("Error al obtener asientos");
            return res.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        enabled: !!empresaId && !!user?.sessionId,
    });

    const showToast = () => toast({ title: "Funcionalidad en desarrollo" });

    const formatCLP = (val) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    const asientos = data?.asientos || [];
    const totalRegistros = data?.total || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                            placeholder="Buscar por glosa..."
                            className="bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 text-sm"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={showToast} className="border-white/20 text-white hover:bg-white/10 font-bold uppercase text-[10px] tracking-widest">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtros
                    </Button>
                </div>
                <Button onClick={showToast} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold uppercase text-[10px] tracking-widest">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Libro
                </Button>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/10">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">ID</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Descripción</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Debe</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Haber</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-8 w-8 text-blue-500 animate-spin opacity-40" />
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Consultando Libro Diario...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : asientos.length > 0 ? (
                                <AnimatePresence>
                                    {asientos.map((asiento, index) => (
                                        <motion.tr
                                            key={asiento.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.05 }}
                                            className="hover:bg-white/5 transition-colors group"
                                        >
                                            <td className="px-6 py-4 text-[11px] text-gray-500 font-mono">#{asiento.id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-300 font-medium">{asiento.fecha}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-white font-semibold">{asiento.descripcion}</div>
                                                <div className="text-[9px] text-gray-500 uppercase font-bold italic">{asiento.usuario || 'Sistema'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-emerald-400 font-bold tracking-tighter">
                                                {formatCLP(asiento.debe)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-red-400 font-bold tracking-tighter">
                                                {formatCLP(asiento.haber)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-2 py-1 text-[9px] font-black uppercase rounded-full ${
                                                    asiento.estado === 'Mayorizado' || asiento.estado === 'Aprobado' 
                                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                                    : 'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                    {asiento.estado}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center space-x-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" onClick={showToast} className="h-8 w-8 text-blue-400 hover:bg-blue-500/20"><Eye className="h-3.5 w-3.5" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={showToast} className="h-8 w-8 text-yellow-400 hover:bg-yellow-500/20"><Edit className="h-3.5 w-3.5" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={showToast} className="h-8 w-8 text-red-400 hover:bg-red-500/20"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center py-20">
                                        <div className="flex flex-col items-center text-gray-500">
                                            <FileWarning className="h-12 w-12 mb-4 opacity-20" />
                                            <h3 className="text-lg font-black uppercase italic text-white/40 tracking-tighter">Libro Diario Vacío</h3>
                                            <p className="text-xs uppercase tracking-widest font-bold">No se encontraron asientos contables en este búnker.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-black/20 px-6 py-4 flex items-center justify-between border-t border-white/5">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                        Total de Asientos: <span className="text-white">{totalRegistros}</span>
                    </p>
                    <div className="flex items-center space-x-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={page === 0} 
                            onClick={() => setPage(p => p - 1)}
                            className="text-white hover:bg-white/10 disabled:opacity-20"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-4">
                            Página {page + 1}
                        </span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={asientos.length < 10 && totalRegistros <= (page + 1) * 10} 
                            onClick={() => setPage(p => p + 1)}
                            className="text-white hover:bg-white/10 disabled:opacity-20"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AsientosContables;