import React from 'react';
import { motion } from 'framer-motion';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const RecepcionDTE = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center py-12"
        >
            <Download className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Recepción Automática de DTE</h3>
            <p className="text-gray-300 mb-6">Sincronización automática con el SII para recibir documentos emitidos a tu empresa</p>
            <div className="flex justify-center space-x-4">
                <Button onClick={() => toast({ title: "Próximamente", description: "Sincronización automática en desarrollo"})} className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Sincronizar Ahora
                </Button>
                <Button variant="outline" onClick={() => toast({ title: "Próximamente", description: "Carga manual de XML en desarrollo"})} className="border-white/20 text-white hover:bg-white/10">
                    <Upload className="h-4 w-4 mr-2" />
                    Cargar XML
                </Button>
            </div>
        </motion.div>
    );
};

export default RecepcionDTE;