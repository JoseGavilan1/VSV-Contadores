import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getRrhhMetricsApi } from '@/services/rrhhService';

const RrhhStats = ({ empresaId }) => {

    const { user, logout } = useAuth();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['rrhh-metrics', empresaId],
        queryFn: async () => {
            const res = await getRrhhMetricsApi(user.sessionId, empresaId);
            if (res.status === 401) { logout(); throw new Error("Sesión expirada"); }
            if (!res.ok) throw new Error("Error en métricas de RRHH");
            return res.json();
        },
        enabled: Boolean(empresaId) && empresaId !== 'undefined' && !!user?.sessionId,
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    const stats = useMemo(() => [
        { 
            title: 'Total Empleados', 
            value: data?.totalEmpleados ?? '0', 
            change: data?.variacionEmpleados ?? '+0', 
            icon: Users, 
            color: 'from-blue-500 to-cyan-600' 
        },
        { 
            title: 'Masa Salarial', 
            value: formatCurrency(data?.masaSalarial), 
            change: data?.variacionMasa ?? '+0.0%', 
            icon: DollarSign, 
            color: 'from-green-500 to-emerald-600' 
        },
        { 
            title: 'Nuevos Contratos', 
            value: data?.nuevosContratos ?? '0', 
            change: 'este mes', 
            icon: UserPlus, 
            color: 'from-purple-500 to-violet-600' 
        },
        { 
            title: 'Finiquitos', 
            value: data?.finiquitos ?? '0', 
            change: 'este mes', 
            icon: UserMinus, 
            color: 'from-red-500 to-pink-600' 
        }
    ], [data]);

    if (isError) return <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">Error al sincronizar métricas.</div>;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white/5 animate-pulse rounded-2xl border border-white/10 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-blue-500/20 animate-spin" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl group hover:bg-white/[0.12] transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                <Icon className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-1 tracking-tighter">
                            {stat.value}
                        </h3>
                        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                            {stat.title}
                        </p>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default RrhhStats;