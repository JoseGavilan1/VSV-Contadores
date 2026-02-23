import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { FileSpreadsheet } from 'lucide-react';

const CargaCartolaModal = ({ isOpen, setIsOpen, onCartolaCargada }) => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (!file) {
            toast({ variant: "destructive", title: "Error", description: "Debes seleccionar un archivo." });
            return;
        }
        setIsLoading(true);
        toast({ title: "Procesando archivo...", description: "Simulando lectura de cartola bancaria." });
        
        setTimeout(() => {
            const nuevosMovimientos = [
                { fecha: '2025-07-05', desc: 'Abono Cliente Z', monto: 150000, tipo: 'abono', banco: 'BCI (Cartola)' },
                { fecha: '2025-07-04', desc: 'Pago servicio de internet', monto: -35990, tipo: 'cargo', banco: 'BCI (Cartola)' },
            ];
            onCartolaCargada(nuevosMovimientos);
            setIsLoading(false);
            setFile(null);
        }, 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px] bg-black/50 backdrop-blur-xl border-white/20 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Cargar Cartola Bancaria</DialogTitle>
                    <DialogDescription>Sube tu cartola en formato Excel o CSV para importar movimientos.</DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                    <div>
                        <Label htmlFor="cartola-file" className="text-gray-300">Archivo Excel/CSV</Label>
                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-white/25 px-6 py-10">
                            <div className="text-center">
                                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="mt-4 flex text-sm leading-6 text-gray-400">
                                    <label htmlFor="cartola-file" className="relative cursor-pointer rounded-md font-semibold text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 hover:text-blue-300">
                                        <span>Sube un archivo</span>
                                        <Input id="cartola-file" name="cartola-file" type="file" className="sr-only" onChange={handleFileChange} accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                                    </label>
                                    <p className="pl-1">o arrástralo aquí</p>
                                </div>
                                <p className="text-xs leading-5 text-gray-500">{file ? file.name : 'Archivos .xlsx o .csv'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-white/20 text-white hover:bg-white/10">Cancelar</Button>
                    <Button onClick={handleUpload} disabled={isLoading || !file} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                        {isLoading ? 'Procesando...' : 'Cargar y Procesar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CargaCartolaModal;