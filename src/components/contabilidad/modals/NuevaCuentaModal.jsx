import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NuevaCuentaModal = ({ isOpen, setIsOpen, onSave, cuenta }) => {
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState('Cuenta');

    useEffect(() => {
        if (cuenta) {
            setCodigo(cuenta.codigo);
            setNombre(cuenta.nombre);
            setTipo(cuenta.tipo);
        } else {
            setCodigo('');
            setNombre('');
            setTipo('Cuenta');
        }
    }, [cuenta, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!codigo || !nombre || !tipo) {
            toast({ variant: "destructive", title: "Error", description: "Todos los campos son obligatorios." });
            return;
        }
        onSave({ codigo, nombre, tipo, editable: true });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px] bg-black/50 backdrop-blur-xl border-white/20 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{cuenta ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}</DialogTitle>
                    <DialogDescription>Define los detalles de la cuenta contable.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="codigo">Código de Cuenta</Label>
                        <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: 1.1.01.002" disabled={!!cuenta} />
                        {cuenta && <p className="text-xs text-gray-400">El código no se puede editar.</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre de la Cuenta</Label>
                        <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Banco Estado" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tipo">Tipo de Cuenta</Label>
                        <Select onValueChange={setTipo} value={tipo}>
                            <SelectTrigger id="tipo" className="w-full">
                                <SelectValue placeholder="Seleccionar tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Subgrupo">Subgrupo</SelectItem>
                                <SelectItem value="Cuenta">Cuenta</SelectItem>
                                <SelectItem value="Subcuenta">Subcuenta</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button type="submit" onClick={handleSubmit} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">Guardar Cuenta</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NuevaCuentaModal;