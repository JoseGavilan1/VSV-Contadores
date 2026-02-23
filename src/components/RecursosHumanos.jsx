import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, DollarSign, FileText, TrendingUp, UserPlus, Calculator, Settings, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import RrhhStats from '@/components/rrhh/RrhhStats';
import GestionEmpleados from '@/components/rrhh/GestionEmpleados';
import GestionLiquidaciones from '@/components/rrhh/GestionLiquidaciones';
import GestionContratos from '@/components/rrhh/GestionContratos';
import ReportesRrhh from '@/components/rrhh/ReportesRrhh';
import NuevoEmpleadoModal from '@/components/rrhh/modals/NuevoEmpleadoModal';
import NuevaLiquidacionModal from '@/components/rrhh/modals/NuevaLiquidacionModal';
import ConfiguracionRrhh from '@/components/rrhh/ConfiguracionRrhh';
import ControlAsistencia from '@/components/rrhh/ControlAsistencia';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getRrhhConfigApi } from '@/services/rrhhService'; 

const RecursosHumanos = () => {
  const { selectedCompany, user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';
  const empresaId = selectedCompany?.id;
  const [activeTab, setActiveTab] = useState('empleados');
  const [isEmpleadoModalOpen, setIsEmpleadoModalOpen] = useState(false);
  const [isLiquidacionModalOpen, setIsLiquidacionModalOpen] = useState(false);

  const [parametros, setParametros] = useState({
    sueldoMinimo: 560000,
    uf: 38750,
    utm: 69200,
    tasaSeguroCesantia: 0.006,
    tasaSIS: 1.78,
    afpComisiones: {
        'Capital': 1.44, 'Cuprum': 1.44, 'Habitat': 1.27,
        'Modelo': 0.58, 'Planvital': 1.16, 'Provida': 1.45, 'Uno': 0.69,
    },
  });

  const { isLoading: loadingConfig } = useQuery({
    queryKey: ['rrhh-config', empresaId],
    queryFn: async () => {
        if (!empresaId) return null;
        const res = await getRrhhConfigApi(user?.sessionId, empresaId);
        if (res.ok) {
            const data = await res.json();
            setParametros(data);
        }
        return res;
    },
    enabled: Boolean(empresaId) && !!user?.sessionId,
  });

  const tabs = useMemo(() => [
    { id: 'empleados', name: 'Empleados', icon: Users, component: <GestionEmpleados empresaId={empresaId} onAddEmployee={() => setIsEmpleadoModalOpen(true)} /> },
    { id: 'liquidaciones', name: 'Liquidaciones', icon: DollarSign, component: <GestionLiquidaciones empresaId={empresaId} onAddLiquidation={() => setIsLiquidacionModalOpen(true)} /> },
    { id: 'contratos', name: 'Documentos', icon: FileText, component: <GestionContratos empresaId={empresaId} /> },
    { id: 'asistencia', name: 'Control Asistencia', icon: Clock, component: <ControlAsistencia empresaId={empresaId} /> },
    { id: 'reportes', name: 'Reportes RRHH', icon: TrendingUp, component: <ReportesRrhh empresaId={empresaId} /> },
    { id: 'configuracion', name: 'Configuración', icon: Settings, component: <ConfiguracionRrhh parametros={parametros} setParametros={setParametros} empresaId={empresaId} /> }
  ], [empresaId, parametros]);

  const handleAddEmpleado = (empleado) => {
    toast({ title: "Empleado Registrado", description: `${empleado.nombre} ha sido agregado al búnker.` });
    setIsEmpleadoModalOpen(false);
  };
  
  const handleAddLiquidacion = (liquidacion) => {
    toast({ title: "Liquidación Generada", description: `Periodo ${liquidacion.periodo} procesado correctamente.` });
    setIsLiquidacionModalOpen(false);
  };

  // GOD MODE
  if (!empresaId && !isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-purple-500" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Esperando selección de búnker empresarial...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <NuevoEmpleadoModal 
        isOpen={isEmpleadoModalOpen} 
        setIsOpen={setIsEmpleadoModalOpen} 
        onAddEmpleado={handleAddEmpleado}
        empresaId={empresaId}
        afpList={Object.keys(parametros.afpComisiones)}
      />
      <NuevaLiquidacionModal 
        isOpen={isLiquidacionModalOpen} 
        setIsOpen={setIsLiquidacionModalOpen} 
        onAddLiquidacion={handleAddLiquidacion}
        empresaId={empresaId}
        parametros={parametros}
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 italic uppercase tracking-tighter">
            Recursos Humanos
          </h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em]">
            Gestión integral de personal y remuneraciones
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => setIsEmpleadoModalOpen(true)}
            className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white h-11 px-4 font-bold shadow-lg shadow-purple-900/20"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Empleado
          </Button>

          <Button 
            onClick={() => setIsLiquidacionModalOpen(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-11 px-4 font-bold shadow-lg shadow-green-900/20"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Liquidar Sueldos
          </Button>
        </div>
      </div>

      <RrhhStats empresaId={empresaId} />

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
        <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center space-x-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-white border-b-2 border-purple-500'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
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
              {tabs.find(t => t.id === activeTab)?.component}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default RecursosHumanos;