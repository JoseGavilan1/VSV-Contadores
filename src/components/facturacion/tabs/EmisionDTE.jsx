import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Receipt, Building2, Plus, ArrowDownUp, ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tiposDocumento = [
    { id: 'factura', codigo: '33', nombre: 'Factura Electrónica', icon: FileText, color: 'from-blue-500 to-cyan-600', shadow: 'shadow-blue-500/20' },
    { id: 'exenta', codigo: '34', nombre: 'Factura Exenta', icon: Receipt, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { id: 'guia_despacho', codigo: '52', nombre: 'Guía de Despacho', icon: Building2, color: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/20' },
    { id: 'nota_credito_debito', codigo: '61 / 56', nombre: 'Notas de C/D', icon: ArrowDownUp, color: 'from-purple-500 to-fuchsia-600', shadow: 'shadow-purple-500/20' },
    { id: 'boleta', codigo: '39', nombre: 'Boleta Electrónica', icon: Receipt, color: 'from-yellow-400 to-yellow-600', shadow: 'shadow-yellow-500/20' },
];

const EmisionDTE = ({ onEmitir }) => {
    const [showNotaOptions, setShowNotaOptions] = useState(false);

    const handleEmitir = (tipo) => {
        if (tipo === 'nota_credito_debito') {
            setShowNotaOptions(true);
        } else {
            onEmitir(tipo);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-start max-w-6xl mx-auto space-y-8 py-8 relative">
            
            {/* Cabecera */}
            <div className="text-center space-y-2 w-full">
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">
                    Emisión de Documentos
                </h3>
                <p className="text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest">
                    Selecciona el tipo de DTE que deseas generar
                </p>
            </div>
            
            {/* Grilla Ordenada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-4">
                {tiposDocumento.map((tipo, index) => {
                    const Icon = tipo.icon;
                    return (
                        <motion.div
                            key={tipo.codigo}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:bg-[#1e293b] hover:border-white/20 transition-all flex flex-col items-center text-center group cursor-pointer shadow-lg relative overflow-hidden min-h-[250px] flex-1"
                            onClick={() => handleEmitir(tipo.id)}
                        >
                            {/* Brillo de fondo al hacer hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${tipo.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                            {/* Contenedor del Icono Centrado */}
                            <div className={`w-16 h-16 bg-gradient-to-br ${tipo.color} rounded-xl flex items-center justify-center mb-4 shadow-lg ${tipo.shadow} group-hover:scale-110 transition-transform duration-500 flex-shrink-0`}>
                                <Icon className="h-8 w-8 text-white" />
                            </div>
                            
                            {/* Textos */}
                            <div className="flex-1 flex flex-col justify-center items-center relative z-10 w-full">
                                <h3 className="text-white font-bold uppercase text-sm tracking-widest mb-1 leading-tight">{tipo.nombre}</h3>
                                <p className="text-gray-400 text-[10px] font-mono tracking-widest">CÓDIGO SII: {tipo.codigo}</p>
                            </div>
                            
                            {/* Botón Alineado al Fondo */}
                            <Button
                                className={`w-full mt-4 bg-white/5 hover:bg-gradient-to-r hover:${tipo.color} text-gray-300 hover:text-white border border-white/10 hover:border-transparent font-bold uppercase text-[10px] tracking-widest h-10 rounded-lg transition-all duration-300 relative z-10 flex items-center justify-center`}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Documento
                            </Button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Modal para Notas de Crédito/Débito (Se mantiene igual) */}
            <AnimatePresence>
                {showNotaOptions && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0f172a] border border-white/10 p-8 rounded-3xl shadow-2xl relative w-full max-w-sm"
                        >
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowNotaOptions(false); }}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <h3 className="text-xl font-black text-white text-center mb-6 uppercase tracking-tighter">
                                Seleccione DTE
                            </h3>
                            
                            <div className="flex flex-col gap-4">
                                <Button 
                                    onClick={() => { onEmitir('nota_credito'); setShowNotaOptions(false); }}
                                    className="h-16 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white font-bold uppercase tracking-widest flex items-center justify-start px-6 gap-4 group rounded-xl"
                                >
                                    <ArrowDownToLine className="h-6 w-6 group-hover:-translate-y-1 transition-transform" />
                                    <div className="text-left">
                                        <div className="text-sm">Nota de Crédito</div>
                                        <div className="text-[10px] font-mono opacity-70">CÓDIGO SII: 61</div>
                                    </div>
                                </Button>
                                
                                <Button 
                                    onClick={() => { onEmitir('nota_debito'); setShowNotaOptions(false); }}
                                    className="h-16 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold uppercase tracking-widest flex items-center justify-start px-6 gap-4 group rounded-xl"
                                >
                                    <ArrowUpFromLine className="h-6 w-6 group-hover:translate-y-1 transition-transform" />
                                    <div className="text-left">
                                        <div className="text-sm">Nota de Débito</div>
                                        <div className="text-[10px] font-mono opacity-70">CÓDIGO SII: 56</div>
                                    </div>
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EmisionDTE;