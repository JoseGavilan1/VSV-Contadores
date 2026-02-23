import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, Eye, Edit, Trash2, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getEmployeesApi } from '@/services/rrhhService';

const GestionEmpleados = ({ empresaId }) => {
    const { user, logout } = useAuth();

    const { data: empleadosData = [], isLoading } = useQuery({
        queryKey: ['employees', empresaId],
        queryFn: async () => {
            const res = await getEmployeesApi(user?.sessionId, empresaId);
            
            if (res.status === 401) { logout(); throw new Error("Sesión expirada"); }
            if (!res.ok) throw new Error("Error al obtener empleados");
            
            return res.json();
        },
        enabled: Boolean(empresaId) && !!user?.sessionId,
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });

    const showToast = (accion) => toast({ 
        title: "Acción en búnker", 
        description: `${accion} para la empresa ID: ${empresaId}` 
    });

    if (isLoading) return null; 

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type="text" placeholder="Buscar empleados..." className="bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => showToast("Filtros")} className="border-white/20 text-white hover:bg-white/10"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
                </div>
                <Button onClick={() => showToast("Exportar")} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"><Download className="h-4 w-4 mr-2" />Exportar</Button>
            </div>
            <div className="bg-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/10">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Nombre</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">RUT</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Cargo</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Estado</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empleadosData.length > 0 ? (
                                empleadosData.map((empleado, index) => (
                                    <motion.tr key={empleado.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.1 }} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm text-white font-medium">{empleado.nombre}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300">{empleado.rut}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300">{empleado.cargo}</td>
                                        <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${empleado.estado === 'Activo' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>{empleado.estado}</span></td>
                                        <td className="px-6 py-4"><div className="flex items-center space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => showToast("Ver")} className="text-blue-400 hover:bg-blue-500/20"><Eye className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => showToast("Editar")} className="text-yellow-400 hover:bg-yellow-500/20"><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => showToast("Borrar")} className="text-red-400 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /></Button>
                                        </div></td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-12">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <FileWarning className="h-12 w-12 mb-4" />
                                            <h3 className="text-lg font-semibold text-white">No hay empleados registrados</h3>
                                            <p>Agrega un nuevo empleado para comenzar.</p>
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

export default GestionEmpleados;