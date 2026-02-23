import React from 'react';
import { motion } from 'framer-motion';
import { Download, Plus, Eye, FileWarning, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getLiquidacionesApi } from '@/services/rrhhService';

const GestionLiquidaciones = ({ empresaId, onAddLiquidation }) => {
    const { user, logout } = useAuth();

    const { data: liquidacionesData = [], isLoading, isError } = useQuery({
        queryKey: ['liquidaciones', empresaId],
        queryFn: async () => {
            const res = await getLiquidacionesApi(user?.sessionId, empresaId);
            
            if (res.status === 401) { logout(); throw new Error("Sesión expirada"); }
            if (!res.ok) throw new Error("Error al obtener liquidaciones");
            
            return res.json();
        },
        enabled: Boolean(empresaId) && !!user?.sessionId,
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });

    const showToast = (accion) => toast({ 
        title: `Procesando ${accion}`, 
        description: `Acción ejecutada para la empresa ID: ${empresaId}` 
    });

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-white">
                <Loader2 className="h-10 w-10 text-green-500 animate-spin mb-4" />
                <p className="text-gray-400 animate-pulse uppercase tracking-widest text-[10px] font-black">Sincronizando haberes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                    <select className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="" className="bg-slate-900">Seleccionar período</option>
                    </select>
                    <Button onClick={onAddLiquidation} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-green-900/20">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Liquidación
                    </Button>
                </div>
                <Button onClick={() => showToast("Exportar Previred")} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold shadow-lg shadow-blue-900/20">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Previred
                </Button>
            </div>
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/10">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">ID</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Empleado</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Período</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Líquido a Pagar</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Estado</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {liquidacionesData.length > 0 ? (
                                liquidacionesData.map((liquidacion, index) => (
                                    <motion.tr key={liquidacion.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.1 }} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm text-white font-medium">#{liquidacion.id.toString().slice(-4)}</td>
                                        <td className="px-6 py-4 text-sm text-white">{liquidacion.empleado}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300 font-mono">{liquidacion.periodo}</td>
                                        <td className="px-6 py-4 text-sm text-green-400 font-bold">{formatCurrency(liquidacion.liquido)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${
                                                liquidacion.estado === 'Pagado' ? 'bg-green-500/20 text-green-400' 
                                                : liquidacion.estado === 'Pendiente' ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {liquidacion.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <Button variant="ghost" size="sm" onClick={() => showToast("Ver")} className="text-blue-400 hover:bg-blue-500/20"><Eye className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => showToast("Descargar PDF")} className="text-green-400 hover:bg-green-500/20"><Download className="h-4 w-4" /></Button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-20">
                                        <div className="flex flex-col items-center text-gray-500">
                                            <FileWarning className="h-12 w-12 mb-4 opacity-20" />
                                            <h3 className="text-lg font-semibold text-white">No hay liquidaciones generadas</h3>
                                            <p className="text-sm">Crea una nueva liquidación para el período actual.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GestionLiquidaciones;