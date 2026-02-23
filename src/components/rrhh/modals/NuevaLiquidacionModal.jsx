import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

const empleadosMock = [
    { id: 'EMP-001', nombre: 'Juan Carlos Pérez', sueldoBase: 1800000, afp: 'Capital', salud: { tipo: 'Isapre', valor: 2.5 } },
    { id: 'EMP-002', nombre: 'María Elena González', sueldoBase: 1500000, afp: 'Modelo', salud: { tipo: 'Fonasa' } },
];

const NuevaLiquidacionModal = ({ isOpen, setIsOpen, onAddLiquidacion, parametros }) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [periodo, setPeriodo] = useState('Julio 2025');
    const [calculo, setCalculo] = useState(null);
    
    const empleado = empleadosMock.find(e => e.id === selectedEmployeeId);

    useEffect(() => {
        if (empleado && parametros) {
            const { sueldoBase, afp, salud } = empleado;
            const comisionAfp = parametros.afpComisiones[afp] / 100;
            const tasaSIS = parametros.tasaSIS / 100;
            
            const cotizacionAfp = sueldoBase * (0.10 + comisionAfp + tasaSIS);

            let cotizacionSalud;
            const descSaludLegal = sueldoBase * 0.07;
            if(salud.tipo === 'Isapre') {
                const planEnPesos = salud.valor * parametros.uf;
                cotizacionSalud = Math.max(descSaludLegal, planEnPesos);
            } else {
                cotizacionSalud = descSaludLegal;
            }

            const seguroCesantia = sueldoBase * parametros.tasaSeguroCesantia;
            const totalDescuentos = cotizacionAfp + cotizacionSalud + seguroCesantia;
            const liquidoPagar = sueldoBase - totalDescuentos;

            setCalculo({
                sueldoBase,
                cotizacionAfp: {
                    monto: cotizacionAfp,
                    desglose: {
                        obligatorio: sueldoBase * 0.10,
                        comision: sueldoBase * comisionAfp,
                        sis: sueldoBase * tasaSIS
                    }
                },
                cotizacionSalud: { monto: cotizacionSalud, tipo: salud.tipo },
                seguroCesantia,
                totalDescuentos,
                liquidoPagar
            });
        } else {
            setCalculo(null);
        }
    }, [selectedEmployeeId, empleado, parametros]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!empleado || !periodo || !calculo) {
            toast({ variant: "destructive", title: "Error", description: "Completa todos los campos para generar la liquidación." });
            return;
        }
        onAddLiquidacion({ empleado: empleado.nombre, periodo, liquido: calculo.liquidoPagar });
    };
    
    const formatCurrency = (value) => value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[550px] bg-black/50 backdrop-blur-xl border-white/20 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Generar Liquidación de Sueldo</DialogTitle>
                    <DialogDescription>Calcula y genera una nueva liquidación basada en los parámetros legales y la ficha del empleado.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="empleado">Empleado</Label>
                            <select id="empleado" value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <option value="">Seleccionar...</option>
                                {empleadosMock.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="periodo">Período</Label>
                            <Input id="periodo" value={periodo} onChange={e => setPeriodo(e.target.value)} />
                        </div>
                    </div>
                    
                    {calculo && empleado && (
                        <div className="p-4 bg-white/10 rounded-lg space-y-2 border border-white/10">
                            <h4 className="font-semibold text-lg text-center mb-3">Resumen de Cálculo para {empleado.nombre}</h4>
                            <div className="flex justify-between font-medium"><span className="text-gray-200">Sueldo Base:</span><span>{formatCurrency(calculo.sueldoBase)}</span></div>
                            <hr className="border-white/10 my-2" />
                            <h5 className="font-semibold text-md text-gray-300">Descuentos Legales:</h5>
                            <div className="pl-4 space-y-1">
                                <div className="flex justify-between text-red-400">
                                    <span>AFP ({empleado.afp}):</span>
                                    <span>-{formatCurrency(calculo.cotizacionAfp.monto)}</span>
                                </div>
                                <div className="text-xs text-gray-400 pl-4">
                                  <div>10% Obligatorio: {formatCurrency(calculo.cotizacionAfp.desglose.obligatorio)}</div>
                                  <div>Comisión: {formatCurrency(calculo.cotizacionAfp.desglose.comision)}</div>
                                  <div>SIS: {formatCurrency(calculo.cotizacionAfp.desglose.sis)}</div>
                                </div>
                                <div className="flex justify-between text-red-400">
                                    <span>Salud ({calculo.cotizacionSalud.tipo}):</span>
                                    <span>-{formatCurrency(calculo.cotizacionSalud.monto)}</span>
                                </div>
                                <div className="flex justify-between text-red-400">
                                    <span>Seguro Cesantía:</span>
                                    <span>-{formatCurrency(calculo.seguroCesantia)}</span>
                                </div>
                            </div>
                            <hr className="border-white/10 my-2" />
                            <div className="flex justify-between text-xl font-bold text-white pt-1"><span >Líquido a Pagar:</span><span>{formatCurrency(calculo.liquidoPagar)}</span></div>
                        </div>
                    )}
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-white/20 text-white hover:bg-white/10">Cancelar</Button>
                    <Button type="submit" onClick={handleSubmit} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white" disabled={!calculo}>Generar Liquidación</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NuevaLiquidacionModal;