import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Building2, User, Edit, Folder, FileSignature, BookOpen, Key, Phone, MapPin, MessageSquare, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { EditableField, SecureField } from '../ui/CrmUI';

const ClientDetailDrawer = ({ client, onClose, onUpdateClient }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(client);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        setFormData(client);
        setIsEditing(false);
    }, [client]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdateClient(formData);
        setIsEditing(false);
        toast({ title: "Guardado", description: "Datos actualizados correctamente." });
    };

    const addNote = () => {
        if(!newNote.trim()) return;
        const dateStr = new Date().toLocaleDateString('es-CL');
        const noteObj = { id: Date.now(), fecha: dateStr, texto: newNote };
        
        const updatedFormData = { ...formData, notas: [noteObj, ...(formData.notas || [])] };
        setFormData(updatedFormData);
        onUpdateClient(updatedFormData);
        setNewNote('');
    };

    return (
        <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-y-0 right-0 w-full md:w-2/5 md:min-w-[400px] h-full min-h-0 bg-[#0b0f17] border-l border-white/10 md:border md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden z-50 md:relative"
        >
            {/* Header Panel */}
            <div className="p-6 md:p-8 border-b border-white/10 bg-white/[0.02] shrink-0">
               <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          ID #{formData.id}
                      </span>
                      <a href="https://zeus.sii.cl/cvc_cgi/stc/go_menu_sii" target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all hover:scale-105 shadow-lg ${
                              formData.type === 'Empresa' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          }`}
                      >
                          {formData.type === 'Empresa' ? <Building2 size={12}/> : <User size={12}/>} Login SII
                      </a>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white bg-white/5 p-2 rounded-full"><X size={20} /></button>
               </div>
               
               {isEditing ? (
                   <input name="razonSocial" value={formData.razonSocial} onChange={handleInputChange} className="w-full text-xl font-black text-white bg-transparent border-b border-blue-500 outline-none uppercase italic mb-2" />
               ) : (
                   <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{formData.razonSocial}</h2>
               )}
               <div className="flex gap-3 items-center">
                  <p className="text-sm text-blue-500 font-mono font-bold tracking-widest">{formData.rut}</p>
                  {isEditing ? (
                    <input name="giro" value={formData.giro} onChange={handleInputChange} className="text-[10px] bg-white/5 border-b border-white/10 text-gray-400 w-full" />
                  ) : (
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">{formData.giro}</p>
                  )}
               </div>
            </div>

            {/* Toolbar Acciones Rápida */}
            {!isEditing && (
                <div className="grid grid-cols-4 gap-1 p-3 border-b border-white/10 bg-white/[0.02] shrink-0">
                    <Button variant="ghost" className="flex flex-col h-auto py-2 text-gray-400 hover:text-white" onClick={() => setIsEditing(true)}>
                        <Edit size={16} /> <span className="text-[7px] md:text-[8px] uppercase font-black mt-1">Editar</span>
                    </Button>
                    <Button variant="ghost" className="flex flex-col h-auto py-2 text-blue-400 hover:text-white" onClick={() => window.open(formData.drive, '_blank')}>
                        <Folder size={16} /> <span className="text-[7px] md:text-[8px] uppercase font-black mt-1">Drive</span>
                    </Button>
                    <Button variant="ghost" className="flex flex-col h-auto py-2 text-amber-400 hover:text-white" onClick={() => toast({title: "Generando...", description: "Contrato en proceso"})}>
                        <FileSignature size={16} /> <span className="text-[7px] md:text-[8px] uppercase font-black mt-1">Contrato</span>
                    </Button>
                    <Button variant="ghost" className="flex flex-col h-auto py-2 text-emerald-400 hover:text-white" onClick={() => toast({title: "Abriendo...", description: "Libros contables"})}>
                        <BookOpen size={16} /> <span className="text-[7px] md:text-[8px] uppercase font-black mt-1">Libros</span>
                    </Button>
                </div>
            )}

            {/* Cuerpo Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Gestión Tributaria */}
                <div className="bg-amber-500/5 rounded-3xl p-5 border border-amber-500/10">
                    <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Key size={14}/> Gestión Tributaria</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <SecureField label="Clave Web (Previred)" name="claveWeb" value={formData.claveWeb} isEditing={isEditing} onChange={handleInputChange} />
                        <SecureField label="Clave SII" name="claveSII" value={formData.claveSII} isEditing={isEditing} onChange={handleInputChange} />
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex flex-col gap-3">
                         <EditableField label="Impuesto a Pagar" name="impuestoPagar" value={formData.impuestoPagar} isEditing={isEditing} onChange={handleInputChange} isMono/>
                         <div className="mt-1">
                             <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Estado F29</span>
                             {isEditing ? (
                                 <select name="estadoFormulario" value={formData.estadoFormulario} onChange={handleInputChange} className="w-full bg-black/40 border border-white/20 rounded-lg p-2 text-xs text-white uppercase font-bold outline-none">
                                     <option value="DECLARADO">Declarado</option>
                                     <option value="PENDIENTE">Pendiente</option>
                                     <option value="NO DECLARAR">No Declarar</option>
                                 </select>
                             ) : (
                                 <div className="w-full bg-black/20 rounded-lg p-2 text-center text-xs font-bold text-white uppercase border border-white/5">{formData.estadoFormulario}</div>
                             )}
                         </div>
                    </div>
                </div>

                {/* Contacto Oficial */}
                <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
                    <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Phone size={14}/> Contacto Oficial</h3>
                    <div className="space-y-4">
                       <EditableField label="Teléfono" name="telefono" value={formData.telefono} isEditing={isEditing} onChange={handleInputChange} isMono />
                       <EditableField label="Correo Electrónico" name="correo" value={formData.correo} isEditing={isEditing} onChange={handleInputChange} />
                    </div>
                </div>

                {/* Sede & Representante */}
                <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={14}/> Sede & Representante</h3>
                    <div className="space-y-4">
                       <EditableField label="Dirección" name="direccion" value={formData.direccion} isEditing={isEditing} onChange={handleInputChange} />
                       <div className="grid grid-cols-2 gap-4">
                          <EditableField label="Comuna" name="comuna" value={formData.comuna} isEditing={isEditing} onChange={handleInputChange} />
                          <EditableField label="Ciudad" name="ciudad" value={formData.ciudad} isEditing={isEditing} onChange={handleInputChange} />
                       </div>
                       <div className="pt-2 border-t border-white/10 mt-2">
                         <EditableField label="Representante Legal" name="repNombre" value={formData.repNombre} isEditing={isEditing} onChange={handleInputChange} />
                       </div>
                    </div>
                </div>

                {/* Bitácora / Notas */}
                {!isEditing && (
                    <div className="bg-blue-500/5 rounded-3xl p-5 border border-blue-500/10">
                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MessageSquare size={14}/> Bitácora de Gestión</h3>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} 
                                placeholder="Nueva nota o gestión..." 
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
                                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                            />
                            <button onClick={addNote} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg"><Save size={14}/></button>
                        </div>
                        <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                            {formData.notas && formData.notas.length > 0 ? (
                                formData.notas.map(nota => (
                                    <div key={nota.id} className="bg-black/30 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-1.5 mb-1 text-gray-500">
                                            <Clock size={10} /> <span className="text-[9px] font-black tracking-widest">{nota.fecha}</span>
                                        </div>
                                        <p className="text-xs text-gray-200">{nota.texto}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-500 italic text-center">Sin gestiones registradas.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Edición */}
            {isEditing && (
                <div className="p-4 md:p-6 border-t border-white/10 bg-[#0f172a] flex gap-4 shrink-0">
                    <Button variant="ghost" onClick={() => { setIsEditing(false); setFormData(client); }} className="flex-1 uppercase font-black text-[10px] tracking-widest text-gray-400 h-10 md:h-12 rounded-xl bg-white/5">Cancelar</Button>
                    <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white uppercase font-black text-[10px] tracking-widest h-10 md:h-12 rounded-xl flex items-center justify-center gap-2"><Save size={16} /> Guardar</Button>
                </div>
            )}
        </motion.div>
    );
};

export default ClientDetailDrawer;