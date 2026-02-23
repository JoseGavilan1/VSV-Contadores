import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Book, Award, Calendar, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { downloadReporteApi } from '@/services/rrhhService';

const reportes = [
    { id: 'libro_remuneraciones', name: 'Libro de Remuneraciones', icon: Book, color: 'from-blue-500 to-cyan-600' },
    { id: 'certificados', name: 'Certificados de Antigüedad', icon: Award, color: 'from-green-500 to-emerald-600' },
    { id: 'vacaciones', name: 'Reporte de Vacaciones', icon: Calendar, color: 'from-purple-500 to-violet-600' },
    { id: 'finiquitos', name: 'Informe de Finiquitos', icon: FileText, color: 'from-orange-500 to-red-600' }
];

const ReportesRrhh = ({ empresaId }) => {
    const { user } = useAuth();
    const [generating, setGenerating] = useState(null);

    const handleGenerateReport = async (reporte) => {
        setGenerating(reporte.id);
        
        toast({ 
            title: `Generando ${reporte.name}`, 
            description: `Solicitando datos al búnker para la empresa ${empresaId}...` 
        });

        try {
            // const response = await downloadReporteApi(user.sessionId, empresaId, reporte.id);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            toast({ 
                title: "🚧 En Desarrollo", 
                description: `El motor de PDF para ${reporte.name} se activará en la siguiente fase.` 
            });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo conectar con el generador de reportes.", variant: "destructive" });
        } finally {
            setGenerating(null);
        }
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
            {reportes.map((reporte, index) => {
                const Icon = reporte.icon;
                const isThisGenerating = generating === reporte.id;

                return (
                    <motion.div
                        key={reporte.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className={`bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors cursor-pointer border border-white/10 ${isThisGenerating ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={() => handleGenerateReport(reporte)}
                    >
                        <div className={`w-12 h-12 bg-gradient-to-r ${reporte.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                            {isThisGenerating ? (
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                            ) : (
                                <Icon className="h-6 w-6 text-white" />
                            )}
                        </div>
                        <h3 className="text-white font-bold mb-2">{reporte.name}</h3>
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-black">
                            {isThisGenerating ? 'Procesando...' : 'Generar PDF'}
                        </p>
                    </motion.div>
                );
            })}
        </motion.div>
    );
};

export default ReportesRrhh;