import React, { useMemo } from 'react';
import { PieChart, BarChart3, FileWarning, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getChartOfAccountsApi } from '@/services/accountingService';

const Balances = ({ empresaId
    
 }) => {
    const { user, logout } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['chart-of-accounts', empresaId
            
        ],
        queryFn: async () => {
            const res = await getChartOfAccountsApi(user.sessionId, empresaId
                
            );
            if (res.status === 401) { logout(); throw new Error("Sesión expirada"); }
            if (!res.ok) throw new Error("Error al obtener datos");
            return res.json();
        },
        enabled: !!empresaId
        ,
    });

    const formatCLP = (val) => new Intl.NumberFormat('es-CL', { 
        style: 'currency', currency: 'CLP', minimumFractionDigits: 0 
    }).format(val || 0);

    const balanceCalculado = useMemo(() => {
        const plan = data?.plan || [];
        
        const gruposPrincipales = plan.filter(c => c.nivel === 1 || !c.codigo.includes('.'));

        const ingresos = plan.find(c => c.nombre.toUpperCase() === 'INGRESOS')?.saldo || 0;
        const gastos = plan.find(c => c.nombre.toUpperCase() === 'GASTOS')?.saldo || 0;
        const resultadoEjercicio = ingresos - gastos;

        return {
            grupos: gruposPrincipales,
            ingresos,
            gastos,
            resultadoEjercicio
        };
    }, [data]);

    if (isLoading) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-500 opacity-40" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Calculando Estados Financieros...</p>
            </div>
        );
    }

    const { grupos, ingresos, gastos, resultadoEjercicio } = balanceCalculado;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-md">
                <h3 className="text-xl font-black text-white mb-6 uppercase italic tracking-tighter">
                    Balance General <span className="text-blue-500 text-xs ml-2">Resumen</span>
                </h3>
                
                {grupos.length > 0 ? (
                    <div className="space-y-3">
                        {grupos.map((cuenta) => (
                            <div key={cuenta.codigo} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
                                <div>
                                    <p className="text-white font-bold text-sm uppercase tracking-tight">{cuenta.nombre}</p>
                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Código: {cuenta.codigo}</p>
                                </div>
                                <span className={`text-sm font-black ${
                                    cuenta.nombre.toUpperCase().includes('ACTIVO') ? 'text-emerald-400' : 
                                    cuenta.nombre.toUpperCase().includes('PASIVO') ? 'text-red-400' : 'text-blue-400'
                                }`}>
                                    {formatCLP(cuenta.saldo)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500">
                        <FileWarning className="h-12 w-12 mb-4 opacity-20" />
                        <h4 className="text-xs font-black uppercase text-white/40">Sin datos de búnker</h4>
                        <p className="text-[10px] mt-2">Registra asientos para generar saldos.</p>
                    </div>
                )}
            </div>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-md">
                <h3 className="text-xl font-black text-white mb-6 uppercase italic tracking-tighter">
                    Estado de Resultados <span className="text-purple-500 text-xs ml-2">Acumulado</span>
                </h3>
                
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Ingresos</p>
                            <p className="text-lg font-bold text-white">{formatCLP(ingresos)}</p>
                        </div>
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Total Gastos</p>
                            <p className="text-lg font-bold text-white">{formatCLP(gastos)}</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Resultado del Ejercicio</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Utilidad / Pérdida Neta</p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-purple-500 opacity-50" />
                        </div>
                        <p className={`text-3xl font-black tracking-tighter ${resultadoEjercicio >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCLP(resultadoEjercicio)}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Balances;