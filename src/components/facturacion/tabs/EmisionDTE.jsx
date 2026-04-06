import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Receipt, CreditCard, TrendingUp, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tiposDocumento = [
    { id: 'factura', codigo: '33', nombre: 'Factura Electrónica', icon: FileText, color: 'from-blue-500 to-cyan-600' },
    { id: 'exenta', codigo: '34', nombre: 'Exenta Electrónica', icon: Receipt, color: 'from-green-500 to-emerald-600' },
    { id: 'guia_despacho', codigo: '52', nombre: 'Guía de Despacho', icon: Building2, color: 'from-pink-500 to-rose-600' },
];

const EmisionDTE = ({ onEmitir }) => {
    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter">Emisión de Documentos</h3>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">Selecciona el tipo de DTE para iniciar el búnker de carga</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tiposDocumento.map((tipo, index) => {
                    const Icon = tipo.icon;
                    return (
                        <motion.div
                            key={tipo.codigo}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 transition-all border border-white/10 hover:border-blue-500/50 flex flex-col items-center text-center group"
                        >
                            <div className={`w-16 h-16 bg-gradient-to-br ${tipo.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                <Icon className="h-8 w-8 text-white" />
                            </div>
                            
                            <h3 className="text-white font-black uppercase text-xs tracking-widest mb-1">{tipo.nombre}</h3>
                            <p className="text-gray-500 text-[9px] font-mono mb-6 italic">CÓDIGO SII: {tipo.codigo}</p>
                            
                            <Button
                                onClick={() => onEmitir(tipo.id)}
                                className={`w-full mt-auto bg-gradient-to-r ${tipo.color} hover:opacity-90 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl shadow-lg`}
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