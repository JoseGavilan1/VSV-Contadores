import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Plus, Upload, Bell, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import ConexionBanco from '@/components/bancos/ConexionBanco';
import MovimientosBancarios from '@/components/bancos/MovimientosBancarios';
import CargaCartolaModal from '@/components/bancos/modals/CargaCartolaModal';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMovimientosBancariosApi, uploadCartolaApi } from '@/services/bancoService';

const Bancos = () => {
  const { selectedCompany, user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';
  const empresaId = selectedCompany?.id;
  
  const queryClient = useQueryClient();
  const [isCartolaModalOpen, setIsCartolaModalOpen] = useState(false);

  const { data: movimientos = [], isLoading } = useQuery({
    queryKey: ['movimientos-bancarios', empresaId],
    queryFn: async () => {
      const res = await getMovimientosBancariosApi(user?.sessionId, empresaId);
      if (!res.ok) throw new Error("Error al obtener movimientos");
      return res.json();
    },
    enabled: !!empresaId && !!user?.sessionId,
  });

  const mutation = useMutation({
    mutationFn: (nuevosMovimientos) => 
      uploadCartolaApi(user?.sessionId, empresaId, nuevosMovimientos),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['movimientos-bancarios', empresaId]);
      toast({
        title: "Cartola Procesada",
        description: `Los movimientos han sido importados y guardados en el búnker.`,
        className: "bg-green-500 text-white font-bold"
      });
      setIsCartolaModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Error de Importación",
        description: "No se pudieron guardar los movimientos en la base de datos.",
        variant: "destructive"
      });
    }
  });

  const handleCartolaCargada = (nuevosMovimientos) => {
    mutation.mutate(nuevosMovimientos);
  };

  // GOD MODE
  if (!empresaId && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white uppercase tracking-tighter italic">Sincronizando Bóveda Bancaria</h2>
        <p className="text-gray-400 text-sm mt-2 font-bold uppercase tracking-widest">Selecciona una entidad para gestionar sus cuentas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CargaCartolaModal 
        isOpen={isCartolaModalOpen} 
        setIsOpen={setIsCartolaModalOpen} 
        onCartolaCargada={handleCartolaCargada}
        empresaId={empresaId}
        isUploading={mutation.isPending}
      />
      
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestión Bancaria</h1>
          <p className="text-gray-300">Conecta tus cuentas y gestiona tus movimientos bancarios.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            disabled={mutation.isPending}
            className="border-white/20 text-white hover:bg-white/10 font-bold"
            onClick={() => setIsCartolaModalOpen(true)}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {mutation.isPending ? "Procesando..." : "Cargar Cartola (Excel)"}
          </Button>
        </div>
      </div>

      <ConexionBanco empresaId={empresaId} />
      
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        </div>
      ) : (
        <MovimientosBancarios movimientos={movimientos} empresaId={empresaId} />
      )}

    </div>
  );
};

export default Bancos;