import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

const NuevoAsientoModal = ({ isOpen, setIsOpen, onAddAsiento }) => {
    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
    const [descripcion, setDescripcion] = useState('');
    const [cuentaDebe, setCuentaDebe] = useState('');
    const [montoDebe, setMontoDebe] = useState('');
    const [cuentaHaber, setCuentaHaber] = useState('');
    const [montoHaber, setMontoHaber] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!fecha || !descripcion || !cuentaDebe || !montoDebe || !cuentaHaber || !montoHaber) {
            toast({ variant: "destructive", title: "Error", description: "Todos los campos son requeridos." });
            return;
        }
        if (montoDebe !== montoHaber) {
            toast({ variant: "destructive", title: "Error de Partida Doble", description: "El Debe y el Haber deben ser iguales." });
            return;
        }
        onAddAsiento({ fecha, descripcion, debe: montoDebe, haber: montoHaber });
        setDescripcion('');
        setCuentaDebe('');
        setMontoDebe('');
        setCuentaHaber('');
        setMontoHaber('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[600px] bg-black/50 backdrop-blur-xl border-white/20 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Nuevo Asiento Contable</DialogTitle>
                    <DialogDescription>Ingresa los detalles del asiento manual.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fecha" className="text-right">Fecha</Label>
                        <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="descripcion" className="text-right">Descripción</Label>
                        <Input id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="col-span-3" placeholder="Ej: Compra de insumos" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 border rounded-lg border-green-500/50 bg-green-500/10">
                            <h4 className="font-semibold text-green-300 mb-2">Debe</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="Cuenta Contable (ej: 510101)" value={cuentaDebe} onChange={(e) => setCuentaDebe(e.target.value)} />
                                <Input type="number" placeholder="Monto" value={montoDebe} onChange={(e) => setMontoDebe(e.target.value)} />
                            </div>
                        </div>
                        <div className="p-4 border rounded-lg border-red-500/50 bg-red-500/10">
                            <h4 className="font-semibold text-red-300 mb-2">Haber</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="Cuenta Contable (ej: 110201)" value={cuentaHaber} onChange={(e) => setCuentaHaber(e.target.value)} />
                                <Input type="number" placeholder="Monto" value={montoHaber} onChange={(e) => setMontoHaber(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button type="submit" onClick={handleSubmit} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">Guardar Asiento</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NuevoAsientoModal;