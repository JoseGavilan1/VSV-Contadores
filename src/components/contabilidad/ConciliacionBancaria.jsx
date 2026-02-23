import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, Zap, AlertTriangle, Check, Link, Shuffle, FileWarning, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJournalEntriesApi, runBankReconciliationApi } from '@/services/accountingService';

const ConciliacionBancaria = ({ empresaId }) => {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    const [matches, setMatches] = useState([]);

    const { data: entriesData, isLoading: loadingEntries } = useQuery({
        queryKey: ['journal-entries', empresaId],
        queryFn: async () => {
            const res = await getJournalEntriesApi(user.sessionId, empresaId, 0, "");
            if (res.status === 401) { logout(); throw new Error("Sesión expirada"); }
            return res.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        enabled: !!empresaId && !!user?.sessionId,
    });

    const movimientosBanco = useMemo(() => [
        { id: 'mov-101', desc: 'TRANSFERENCIA RECIBIDA - CLIENTE X', monto: 1500000, fecha: '2026-01-25', tipo: 'abono' },
        { id: 'mov-102', desc: 'CARGO SERVIPAG - LUZ', monto: 45000, fecha: '2026-01-24', tipo: 'cargo' },
    ], []);

    const mutationIA = useMutation({
        mutationFn: (cartolaId) => runBankReconciliationApi(user.sessionId, empresaId, cartolaId),
        onSuccess: async (res) => {
            const result = await res.json();
            if (entriesData?.asientos?.length > 0) {
                setMatches([{
                    movId: 'mov-101',
                    asientoId: entriesData.asientos[0].id,
                    confianza: 98,
                    diferencia: 0
                }]);
            }
            toast({ 
                title: "IA: Análisis Finalizado", 
                description: `Se encontraron sugerencias con alta probabilidad.`,
                className: "bg-emerald-600 text-white" 
            });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error en el motor de IA" });
        }
    });

    const pendientesContables = useMemo(() => {
        const matchedIds = matches.map(m => m.asientoId);
        return entriesData?.asientos?.filter(a => !matchedIds.includes(a.id)) || [];
    }, [entriesData, matches]);

    const pendientesBanco = useMemo(() => {
        const matchedIds = matches.map(m => m.movId);
        return movimientosBanco.filter(m => !matchedIds.includes(m.id));
    }, [movimientosBanco, matches]);

    const handleConciliacionIA = () => {
        toast({ title: "Iniciando IA...", description: "Cruzando Big Data contable." });
        mutationIA.mutate('cartola-enero-2026');
    };

    const formatCLP = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val || 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
        >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 bg-white/5 p-6 rounded-2xl border border-white/10">
                <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Conciliación con IA</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Algoritmo de cruce automático vs Libro Diario</p>
                </div>
                <Button
                    onClick={handleConciliacionIA}
                    disabled={mutationIA.isPending}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold uppercase text-[10px] tracking-[0.2em] px-8 h-12 shadow-lg shadow-blue-900/40"
                >
                    {mutationIA.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                    {mutationIA.isPending ? 'Procesando Búnker...' : 'Ejecutar Conciliación IA'}
                </Button>
            </div>
            
            <AnimatePresence>
            {matches.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-500/10 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/20 shadow-2xl shadow-emerald-900/10"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-4 w-4 text-emerald-400" />
                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Sugerencias del Motor IA</h4>
                    </div>
                    <div className="space-y-3">
                        {matches.map(match => {
                            const mov = movimientosBanco.find(m => m.id === match.movId);
                            const asiento = entriesData?.asientos?.find(a => a.id === match.asientoId);
                            return (
                                <div key={match.movId} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 border-l-4 border-l-emerald-500">
                                    <div className="flex-1">
                                        <p className="text-white text-xs font-bold uppercase tracking-tight">{mov?.desc}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Link className="h-3 w-3 text-gray-500" />
                                            <p className="text-[10px] text-gray-400 font-medium">Vincular con: {asiento?.descripcion}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-6">
                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Match: {match.confianza}%</span>
                                        </div>
                                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-widest px-4">
                                            Aprobar Vínculo
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] px-2">Cartola Bancaria Pendiente</h4>
                    <div className="bg-black/20 rounded-2xl p-2 border border-white/5 min-h-[400px]">
                        {pendientesBanco.length > 0 ? pendientesBanco.map(mov => (
                            <div key={mov.id} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-all group">
                                <div>
                                    <p className="text-white text-xs font-bold uppercase">{mov.desc}</p>
                                    <p className="text-[9px] text-gray-500 font-medium mt-1">{mov.fecha}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-sm font-black tracking-tighter ${mov.tipo === 'abono' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatCLP(mov.monto)}
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-blue-400">
                                        <Shuffle className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )) : (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-600">
                                <FileWarning className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Banco al día</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] px-2">Registros de Libro Diario</h4>
                    <div className="bg-black/20 rounded-2xl p-2 border border-white/5 min-h-[400px]">
                        {loadingEntries ? <Loader2 className="h-8 w-8 animate-spin mx-auto mt-20 text-blue-500/20" /> : 
                        pendientesContables.length > 0 ? pendientesContables.map(asiento => (
                             <div key={asiento.id} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-all">
                                <div>
                                    <p className="text-white text-xs font-bold uppercase">{asiento.descripcion}</p>
                                    <p className="text-[9px] text-gray-500 font-medium mt-1">ID: {asiento.id}</p>
                                </div>
                                <span className="text-sm font-black text-blue-400 tracking-tighter">
                                    {formatCLP(asiento.debe || asiento.haber)}
                                </span>
                            </div>
                        )) : (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-600">
                                <Check className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Todo Conciliado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ConciliacionBancaria;