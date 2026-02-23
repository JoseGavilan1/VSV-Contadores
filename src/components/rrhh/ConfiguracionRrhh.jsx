import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Percent, TrendingUp, Save, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRrhhConfigApi } from '@/services/rrhhService';

const ConfiguracionRrhh = ({ parametros, setParametros, empresaId }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (nuevosParametros) => 
            updateRrhhConfigApi(user?.sessionId, empresaId, nuevosParametros),
        onSuccess: () => {
            queryClient.invalidateQueries(['rrhh-metrics', empresaId]);
            toast({
                title: "Configuración Guardada",
                description: "Los parámetros de RRHH han sido actualizados en el búnker.",
                className: "bg-green-500 text-white font-bold"
            });
        },
        onError: () => {
            toast({
                title: "Error Crítico",
                description: "No se pudo sincronizar la configuración con el servidor.",
                variant: "destructive"
            });
        }
    });

    const handleSave = () => {
        mutation.mutate(parametros);
    };

    const handleChange = (e, isAfp = false) => {
        const { name, value } = e.target;
        if (isAfp) {
            setParametros(prev => ({
                ...prev,
                afpComisiones: {
                    ...prev.afpComisiones,
                    [name]: parseFloat(value) || 0,
                }
            }));
        } else {
             setParametros(prev => ({
                ...prev,
                [name]: parseFloat(value) || 0
            }));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
        >
            <div>
                <h3 className="text-2xl font-semibold text-white mb-2">Configuración de Parámetros de RRHH</h3>
                <p className="text-gray-300">Mantén actualizados los valores y tasas para cálculos precisos de remuneraciones.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/5 p-6 rounded-xl space-y-4 border border-white/10">
                    <h4 className="text-lg font-semibold text-white flex items-center">
                        <TrendingUp className="mr-2 h-5 w-5 text-cyan-400" /> Indicadores
                    </h4>
                    <div className="space-y-2">
                        <Label htmlFor="uf">Valor UF</Label>
                        <Input className="bg-white/5 border-white/10 text-white" name="uf" id="uf" type="number" step="0.01" value={parametros.uf} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="utm">Valor UTM</Label>
                        <Input className="bg-white/5 border-white/10 text-white" name="utm" id="utm" type="number" step="0.01" value={parametros.utm} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="sueldoMinimo">Sueldo Mínimo</Label>
                        <Input className="bg-white/5 border-white/10 text-white" name="sueldoMinimo" id="sueldoMinimo" type="number" value={parametros.sueldoMinimo} onChange={handleChange} />
                    </div>
                </div>

                <div className="bg-white/5 p-6 rounded-xl space-y-4 border border-white/10">
                    <h4 className="text-lg font-semibold text-white flex items-center">
                        <Percent className="mr-2 h-5 w-5 text-purple-400" /> Comisiones AFP (%)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(parametros.afpComisiones).map(([afp, comision]) => (
                             <div className="space-y-1" key={afp}>
                                <Label className="text-[10px] uppercase text-gray-400" htmlFor={afp}>{afp}</Label>
                                <Input className="bg-white/5 border-white/10 text-white text-xs" name={afp} id={afp} type="number" step="0.01" value={comision} onChange={(e) => handleChange(e, true)} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 p-6 rounded-xl space-y-4 border border-white/10">
                     <h4 className="text-lg font-semibold text-white flex items-center">
                        <Shield className="mr-2 h-5 w-5 text-orange-400" /> Seguros y Otros (%)
                    </h4>
                    <div className="space-y-2">
                        <Label htmlFor="tasaSIS">Tasa SIS (Seguro Invalidez)</Label>
                        <Input className="bg-white/5 border-white/10 text-white" name="tasaSIS" id="tasaSIS" type="number" step="0.01" value={parametros.tasaSIS} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="tasaSeguroCesantia">Seguro Cesantía (Trabajador)</Label>
                        <Input 
                            className="bg-white/5 border-white/10 text-white" 
                            name="tasaSeguroCesantia" 
                            id="tasaSeguroCesantia" 
                            type="number" 
                            step="0.001"
                            value={parametros.tasaSeguroCesantia * 100} 
                            onChange={(e) => setParametros(prev => ({...prev, tasaSeguroCesantia: parseFloat(e.target.value) / 100}))} 
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end mt-8">
                <Button 
                    onClick={handleSave} 
                    disabled={mutation.isPending}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 font-bold shadow-lg shadow-blue-900/20"
                >
                    {mutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    {mutation.isPending ? "Sincronizando..." : "Guardar Cambios"}
                </Button>
            </div>
        </motion.div>
    );
};

export default ConfiguracionRrhh;