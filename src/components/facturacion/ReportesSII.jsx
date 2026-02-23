/* import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Receipt, Building2, TrendingUp, CheckCircle, CreditCard } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import DeclaracionF29Modal from './modals/DeclaracionF29Modal';

const reportes = [
    { name: 'Libro de Ventas', icon: FileText, color: 'from-green-500 to-emerald-600' },
    { name: 'Libro de Compras', icon: Receipt, color: 'from-blue-500 to-cyan-600' },
    { name: 'Declaración F29', icon: Building2, color: 'from-purple-500 to-violet-600', action: 'f29' },
    { name: 'Resumen Mensual', icon: TrendingUp, color: 'from-orange-500 to-red-600' },
    { name: 'Estado de DTE', icon: CheckCircle, color: 'from-pink-500 to-rose-600' },
    { name: 'Folios Disponibles', icon: CreditCard, color: 'from-indigo-500 to-blue-600' }
];

const ReportesSII = () => {
    const [isF29ModalOpen, setIsF29ModalOpen] = useState(false);

    const handleReportClick = (action) => {
        if (action === 'f29') {
            setIsF29ModalOpen(true);
        } else {
            toast({
                title: "Reporte en Desarrollo",
                description: "Este reporte estará disponible próximamente.",
            });
        }
    };
    
    return (
        <>
            <DeclaracionF29Modal isOpen={isF29ModalOpen} setIsOpen={setIsF29ModalOpen} />
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {reportes.map((reporte, index) => {
                    const Icon = reporte.icon;
                    return (
                        <motion.div
                            key={reporte.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => handleReportClick(reporte.action)}
                        >
                            <div className={`w-12 h-12 bg-gradient-to-r ${reporte.color} rounded-xl flex items-center justify-center mb-4`}>
                                <Icon className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-white font-semibold mb-2">{reporte.name}</h3>
                            <p className="text-gray-400 text-sm">Generar reporte para el SII</p>
                        </motion.div>
                    );
                })}
            </motion.div>
        </>
    );
};

export default ReportesSII; */