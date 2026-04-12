import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Receipt, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tiposDocumento = [
    { id: 'factura', codigo: '33', nombre: 'Factura Electrónica', icon: FileText, color: 'from-blue-500 to-cyan-600', shadow: 'shadow-blue-500/20' },
    { id: 'exenta', codigo: '34', nombre: 'Exenta Electrónica', icon: Receipt, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { id: 'guia_despacho', codigo: '52', nombre: 'Guía de Despacho', icon: Building2, color: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/20' },
];

const EmisionDTE = ({ onEmitir }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center max-w-5xl mx-auto space-y-10 py-10">
            
            <div className="text-center space-y-2">
                <h3 className="text-2xl md:text-4xl font-black text-white italic uppercase tracking-tighter">
                    Emisión de Documentos
                </h3>
                <p className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                    Selecciona el tipo de DTE que deseas generar para la empresa activa
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {tiposDocumento.map((tipo, index) => {
                    const Icon = tipo.icon;
                    return (
                        <motion.div
                            key={tipo.codigo}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="bg-white/[0.02] backdrop-blur-xl rounded-[2rem] p-8 transition-all border border-white/5 hover:bg-white/[0.04] hover:border-white/20 flex flex-col items-center text-center group cursor-pointer relative overflow-hidden"
                            onClick={() => onEmitir(tipo.id)}
                        >
                            {/* Brillo de fondo al hacer hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${tipo.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                            <div className={`w-20 h-20 bg-gradient-to-br ${tipo.color} rounded-2xl flex items-center justify-center mb-6 shadow-xl ${tipo.shadow} group-hover:scale-110 transition-transform duration-500`}>
                                <Icon className="h-10 w-10 text-white" />
                            </div>
                            
                            <h3 className="text-white font-black uppercase text-sm tracking-widest mb-2 relative z-10">{tipo.nombre}</h3>
                            <p className="text-gray-500 text-[10px] font-mono mb-8 italic relative z-10">CÓDIGO SII: {tipo.codigo}</p>
                            
                            <Button
                                className={`w-full mt-auto bg-white/5 hover:bg-gradient-to-r hover:${tipo.color} text-gray-300 hover:text-white border border-white/10 hover:border-transparent font-black uppercase text-[10px] tracking-widest h-12 rounded-xl transition-all duration-300 relative z-10`}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Documento
                            </Button>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default EmisionDTE;