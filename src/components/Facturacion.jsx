import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, FileText, Loader2 
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useSii } from '@/contexts/SiiContext.jsx';
import { useAuth } from '@/hooks/useAuth.jsx'; // Faltaba esto

import SIILoginModal from '@/components/facturacion/modals/SIILoginModal';
import EmisionDTE from '@/components/facturacion/EmisionDTE';
import DocumentosDTE from '@/components/facturacion/DocumentosDTE';
// import ReportesSII from '@/components/facturacion/ReportesSII';

import FacturaElectronicaModal from '@/components/facturacion/modals/dte/FacturaElectronicaModal';
import ExentaElectronicaModal from '@/components/facturacion/modals/dte/ExentaElectronicaModal';
import GuiaDespachoModal from '@/components/facturacion/modals/dte/GuiaDespachoModal';

const Facturacion = () => {
  const { dtes } = useSii();
  
  // Agregamos la validación de Auth
  const { selectedCompany, user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';
  const empresaId = selectedCompany?.id;

  const [activeTab, setActiveTab] = useState('emision');
  const [isSIILoginModalOpen, setIsSIILoginModalOpen] = useState(false);
  const [isDocumentoModalOpen, setIsDocumentoModalOpen] = useState(false);
  const [tipoDocumentoSeleccionado, setTipoDocumentoSeleccionado] = useState(null);

  // GOD MODE
  if (!empresaId && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white uppercase tracking-tighter italic">Sincronizando Facturación</h2>
        <p className="text-gray-400 text-sm mt-2 font-bold uppercase tracking-widest">Selecciona una entidad para emitir documentos.</p>
      </div>
    );
  }

  const handleAddFactura = (dteJson) => {
    toast({ title: "Borrador Guardado", description: "El documento está listo en el búnker." });
  };

  const renderModal = () => {
    if (!tipoDocumentoSeleccionado || typeof tipoDocumentoSeleccionado !== 'string') return null;

    const tipo = tipoDocumentoSeleccionado.toLowerCase();

    if (tipo === 'factura') {
      return (
        <FacturaElectronicaModal 
          isOpen={isDocumentoModalOpen} 
          setIsOpen={setIsDocumentoModalOpen} 
          onAddFactura={handleAddFactura}
        />
      );
    }
    
    if (tipo === 'exenta') {
      return (
        <ExentaElectronicaModal 
          isOpen={isDocumentoModalOpen} 
          setIsOpen={setIsDocumentoModalOpen}
          onAddFactura={handleAddFactura}
        />
      );
    }

    if (tipo === 'guia_despacho') {
      return (
        <GuiaDespachoModal 
          isOpen={isDocumentoModalOpen} 
          setIsOpen={setIsDocumentoModalOpen}
          onAddFactura={handleAddFactura}
        />
      );
    }

    return null;
  };

  const tabs = [
    { id: 'emision', name: 'Emitir DTE', icon: Send },
    { id: 'documentos', name: 'Documentos', icon: FileText },
   // { id: 'reportes', name: 'Reportes SII', icon: TrendingUp }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 italic uppercase tracking-tighter">Facturación SII</h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em]">Gestión de Documentos Tributarios Electrónicos</p>
        </div>
      </div>

    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
        <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-8 py-5 font-black text-[10px] uppercase tracking-widest transition-all relative ${
                  isActive ? 'text-white bg-white/5' : 'text-gray-500 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-500' : ''}`} />
                <span>{tab.name}</span>
                {isActive && (
                  <motion.div layoutId="activeTabFact" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {activeTab === 'emision' && <EmisionDTE onEmitir={(tipo) => { setTipoDocumentoSeleccionado(tipo); setIsDocumentoModalOpen(true); }} />}
              {activeTab === 'documentos' && <DocumentosDTE dteData={dtes || []} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <SIILoginModal isOpen={isSIILoginModalOpen} onClose={() => setIsSIILoginModalOpen(false)} />
      
      {renderModal()}
    </div>
  );
};

export default Facturacion;