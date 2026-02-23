import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownCircle, ArrowUpCircle, Search, Filter, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MovimientosBancarios = ({ movimientos = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMovimientos = useMemo(() => {
        return movimientos.filter(mov => 
            mov.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mov.tipo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [movimientos, searchTerm]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl"
        >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tighter italic">Bóveda de Movimientos</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Registros sincronizados con el búnker</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar en el búnker..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-64"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest">
                        <Filter className="h-3 w-3 mr-2" />
                        Filtros
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full">
                    <thead className="border-b border-white/10">
                        <tr>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredMovimientos.map((mov, index) => {
                            const isAbono = mov.tipo?.toUpperCase() === 'ABONO' || mov.monto > 0;
                            const isConciliado = mov.estado === 'CONCILIADO';

                            return (
                                <motion.tr 
                                    key={mov.id || index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.03 }}
                                    className="group hover:bg-white/5 transition-colors"
                                >
                                    <td className="px-4 py-4 text-xs font-medium text-gray-400 tabular-nums">
                                        {mov.fecha}
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="text-sm font-bold text-white leading-none">{mov.descripcion}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter mt-1">{mov.banco || 'Búnker Central'}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                            isConciliado ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                                        }`}>
                                            {isConciliado ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                            {mov.estado || 'PENDIENTE'}
                                        </div>
                                    </td>
                                    <td className={`px-4 py-4 text-sm text-right font-black tabular-nums ${isAbono ? 'text-green-400' : 'text-red-400'}`}>
                                        <div className="flex items-center justify-end">
                                            {isAbono ? <ArrowUpCircle className="h-3 w-3 mr-2" /> : <ArrowDownCircle className="h-3 w-3 mr-2" />}
                                            {Math.abs(mov.monto).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
                
                {filteredMovimientos.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-gray-500 text-xs font-black uppercase tracking-widest">No se detectan movimientos en esta bóveda</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default MovimientosBancarios;