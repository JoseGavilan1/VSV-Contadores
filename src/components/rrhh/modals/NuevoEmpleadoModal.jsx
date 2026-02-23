import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { User, Briefcase, HeartPulse } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const NuevoEmpleadoModal = ({ isOpen, setIsOpen, onAddEmpleado, afpList }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        nombre: '',
        rut: '',
        fechaNacimiento: '',
        nacionalidad: 'Chilena',
        direccion: '',
        comuna: '',
        ciudad: '',
        telefono: '',
        email: '',
        estadoCivil: '',
        cargasFamiliares: 0,
        fechaInicio: '',
        cargo: '',
        tipoContrato: '',
        sueldoBase: 0,
        jornada: 'Completa',
        previsionSalud: 'fonasa',
        planIsapreUF: '',
        afp: '',
        afiliadoCaja: 'no',
        cajaCompensacion: '',
        apv: 0,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleRadioChange = (name, value) => {
      setFormData(prev => ({...prev, [name]: value}));
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        onAddEmpleado(formData);
        setFormData({
          nombre: '', rut: '', fechaNacimiento: '', nacionalidad: 'Chilena', direccion: '', comuna: '', ciudad: '', telefono: '', email: '', estadoCivil: '', cargasFamiliares: 0,
          fechaInicio: '', cargo: '', tipoContrato: '', sueldoBase: 0, jornada: 'Completa',
          previsionSalud: 'fonasa', planIsapreUF: '', afp: '', afiliadoCaja: 'no', cajaCompensacion: '', apv: 0,
        });
        setStep(1);
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <h3 className="col-span-full text-lg font-semibold text-white flex items-center"><User className="mr-2 h-5 w-5 text-cyan-400" />Datos Personales</h3>
                        <div className="space-y-1"><Label>Nombre Completo</Label><Input name="nombre" value={formData.nombre} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>RUT</Label><Input name="rut" value={formData.rut} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Fecha de Nacimiento</Label><Input name="fechaNacimiento" type="date" value={formData.fechaNacimiento} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Nacionalidad</Label><Input name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} /></div>
                        <div className="space-y-1 col-span-full"><Label>Dirección</Label><Input name="direccion" value={formData.direccion} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Comuna</Label><Input name="comuna" value={formData.comuna} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Ciudad</Label><Input name="ciudad" value={formData.ciudad} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Teléfono</Label><Input name="telefono" value={formData.telefono} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Email</Label><Input name="email" type="email" value={formData.email} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Estado Civil</Label><Input name="estadoCivil" value={formData.estadoCivil} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Cargas Familiares</Label><Input name="cargasFamiliares" type="number" value={formData.cargasFamiliares} onChange={handleChange} /></div>
                    </div>
                );
            case 2:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <h3 className="col-span-full text-lg font-semibold text-white flex items-center"><Briefcase className="mr-2 h-5 w-5 text-purple-400" />Datos Laborales</h3>
                        <div className="space-y-1"><Label>Fecha Inicio Contrato</Label><Input name="fechaInicio" type="date" value={formData.fechaInicio} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Cargo</Label><Input name="cargo" value={formData.cargo} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label>Tipo de Contrato</Label>
                            <select name="tipoContrato" value={formData.tipoContrato} onChange={handleChange} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <option value="">Seleccionar...</option>
                                <option>Indefinido</option>
                                <option>Plazo Fijo</option>
                                <option>Obra o Faena</option>
                            </select>
                        </div>
                        <div className="space-y-1"><Label>Jornada</Label><Input name="jornada" value={formData.jornada} onChange={handleChange} /></div>
                        <div className="space-y-1 col-span-full"><Label>Sueldo Base</Label><Input name="sueldoBase" type="number" value={formData.sueldoBase} onChange={handleChange} /></div>
                    </div>
                );
            case 3:
                return (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <h3 className="col-span-full text-lg font-semibold text-white flex items-center"><HeartPulse className="mr-2 h-5 w-5 text-rose-400" />Datos Previsionales</h3>
                        <div className="space-y-3">
                            <Label>Previsión de Salud</Label>
                             <RadioGroup name="previsionSalud" value={formData.previsionSalud} onValueChange={(v) => handleRadioChange('previsionSalud', v)} className="flex space-x-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="fonasa" id="fonasa" /><Label htmlFor="fonasa">FONASA</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="isapre" id="isapre" /><Label htmlFor="isapre">Isapre</Label></div>
                            </RadioGroup>
                            {formData.previsionSalud === 'isapre' && (
                                <div className="space-y-1"><Label>Plan Isapre (UF)</Label><Input name="planIsapreUF" type="number" step="0.01" value={formData.planIsapreUF} onChange={handleChange} /></div>
                            )}
                        </div>
                        <div className="space-y-1"><Label>AFP</Label>
                            <select name="afp" value={formData.afp} onChange={handleChange} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <option value="">Seleccionar AFP...</option>
                                {afpList.map(afp => <option key={afp} value={afp}>{afp}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                           <Label>Afiliado a Caja de Compensación</Label>
                            <RadioGroup name="afiliadoCaja" value={formData.afiliadoCaja} onValueChange={(v) => handleRadioChange('afiliadoCaja', v)} className="flex space-x-4">
                               <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="caja_no" /><Label htmlFor="caja_no">No</Label></div>
                               <div className="flex items-center space-x-2"><RadioGroupItem value="si" id="caja_si" /><Label htmlFor="caja_si">Sí</Label></div>
                           </RadioGroup>
                           {formData.afiliadoCaja === 'si' && (
                               <div className="space-y-1"><Label>¿Cuál?</Label><Input name="cajaCompensacion" value={formData.cajaCompensacion} onChange={handleChange} /></div>
                           )}
                        </div>
                         <div className="space-y-1"><Label>Ahorro Previsional Voluntario (APV)</Label><Input name="apv" type="number" value={formData.apv} onChange={handleChange} /></div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl bg-black/50 backdrop-blur-xl border-white/20 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Registrar Nuevo Empleado</DialogTitle>
                    <DialogDescription>Ingresa los datos del nuevo miembro del equipo. Paso {step} de 3.</DialogDescription>
                </DialogHeader>
                
                <div className="flex items-center justify-center my-4">
                    <div className="w-full h-2 bg-white/10 rounded-full">
                        <div className="h-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${(step/3)*100}%`}}></div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="py-4 min-h-[300px]">
                    {renderStep()}
                </form>

                <DialogFooter className="justify-between">
                    {step > 1 ? (
                      <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>Anterior</Button>
                    ) : <div></div>}

                    {step < 3 ? (
                        <Button type="button" onClick={() => setStep(s => s + 1)} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">Siguiente</Button>
                    ) : (
                       <Button type="submit" onClick={handleSubmit} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">Guardar Empleado</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NuevoEmpleadoModal;