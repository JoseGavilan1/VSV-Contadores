import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, BarChart3, GitMerge, TrendingUp, 
  Plus, FileDown, BookCopy, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

// Componentes hijos
import ContabilidadStats from '@/components/contabilidad/ContabilidadStats';
import AsientosContables from '@/components/contabilidad/AsientosContables';
import Balances from '@/components/contabilidad/Balances';
import ConciliacionBancaria from '@/components/contabilidad/ConciliacionBancaria';
import ReportesContables from '@/components/contabilidad/ReportesContables';
import NuevoAsientoModal from '@/components/contabilidad/modals/NuevoAsientoModal';
import PlanDeCuentas from '@/components/contabilidad/PlanDeCuentas';

const Contabilidad = () => {
  // CORRECCIÓN: Faltaba extraer 'user' de useAuth
  const { selectedCompany, user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';
  const empresaId = selectedCompany?.id;
  
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('asientos');
  const [isAsientoModalOpen, setIsAsientoModalOpen] = useState(false);

  // GOD MODE: Si no hay empresa y NO es admin, bloquea.
  if (!empresaId && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white uppercase tracking-tighter italic">
          Sincronizando Libro Mayor
        </h2>
        <p className="text-gray-400 text-sm mt-2 font-bold uppercase tracking-widest">
          Selecciona una entidad para acceder al búnker contable.
        </p>
      </div>
    );
  }

  const tabs = useMemo(() => [
    { id: 'asientos', name: 'Asientos Contables', icon: FileText, Component: AsientosContables },
    { id: 'planCuentas', name: 'Plan de Cuentas', icon: BookCopy, Component: PlanDeCuentas },
    { id: 'balances', name: 'Balances', icon: BarChart3, Component: Balances },
    { id: 'conciliacion', name: 'Conciliación Bancaria', icon: GitMerge, Component: ConciliacionBancaria },
    { id: 'reportes', name: 'Reportes', icon: TrendingUp, Component: ReportesContables }
  ], []);

  const handleAddAsiento = (asiento) => {
    queryClient.invalidateQueries(['asientos', empresaId]);
    queryClient.invalidateQueries(['contabilidad-stats', empresaId]);
    queryClient.invalidateQueries(['balances', empresaId]);

    toast({
      title: "Asiento Contable Creado",
      description: `El asiento ${asiento.descripcion || 'registrado'} ha sido mayorizado en el búnker.`,
    });
    setIsAsientoModalOpen(false);
  };

  const showNotImplementedToast = () => {
    toast({
      title: "🚧 Funcionalidad en desarrollo",
      description: "¡Esta característica no está implementada aún!",
      duration: 4000,
    });
  };

  const ActiveModule = tabs.find(t => t.id === activeTab)?.Component;

  return (
    <div className="space-y-8">
      <NuevoAsientoModal
        isOpen={isAsientoModalOpen}
        setIsOpen={setIsAsientoModalOpen}
        onAddAsiento={handleAddAsiento}
        empresaId={empresaId}
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Módulo de Contabilidad
          </h1>
          <p className="text-gray-300">Gestión completa de registros contables y reportes financieros</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Button 
            onClick={showNotImplementedToast}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 h-11 px-4 w-full sm:w-auto flex items-center justify-center text-sm font-bold transition-all"
          >
            <FileDown className="h-4 w-4 mr-2 shrink-0" />
            <span className="whitespace-nowrap">Generar desde DTE</span>
          </Button>

          <Button 
            onClick={() => setIsAsientoModalOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-11 px-4 w-full sm:w-auto flex items-center justify-center text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            <span className="whitespace-nowrap">Nuevo Asiento</span>
          </Button>
        </div>
      </div>

      <ContabilidadStats empresaId={empresaId} />

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
        <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center space-x-2 px-6 py-4 font-bold uppercase text-[10px] tracking-widest transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-500' : 'text-gray-500'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {ActiveModule && <ActiveModule empresaId={empresaId} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Contabilidad;