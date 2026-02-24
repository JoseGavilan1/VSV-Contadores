import React, { useState, useMemo, useEffect } from 'react'; // Añadido useEffect
import { AnimatePresence } from 'framer-motion';
import { LayoutList, BarChart3, Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// 1. CAMBIO: Importar el Hook en lugar de la constante estática
import { useBunkerData } from './crm/crmData'; 
import { updateClienteApi } from '@/services/crmService';
import CrmTableList from './crm/views/CrmTableList';
import CrmAnalytics from './crm/modals/CrmAnalytics'; // Asegura que la ruta sea /views
import ClientDetailDrawer from './crm/modals/ClientDetailDrawer';

const CRM = () => {
  const [activeTab, setActiveTab] = useState('list');
  
  // 2. CAMBIO: Usar el Hook para obtener datos reales y el estado de carga
  const { clients: dbClients, cashFlow, services, compliance, risk, loading, refresh } = useBunkerData();
  
  // Estado local para cuando editamos (mantiene la fluidez de la UI)
  const [clients, setClients] = useState([]);

  // Sincronizar el estado local con los datos de la DB cuando cargan
  useEffect(() => {
    if (dbClients) setClients(dbClients);
  }, [dbClients]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos'); 
  const [typeFilter, setTypeFilter] = useState('Todos');     
  
  const [selectedClient, setSelectedClient] = useState(null);

  // Lógica Filtrado (Se mantiene igual, pero usa 'clients' del estado local)
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = (client.razonSocial || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (client.rut || '').includes(searchTerm);
      const matchesStatus = statusFilter === 'Todos' || client.pagoServicio === statusFilter;
      const matchesType = typeFilter === 'Todos' || client.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [clients, searchTerm, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: clients.length,
      suspendidos: clients.filter(c => c.pagoServicio === 'SERVICIO SUSPENDIDO').length,
      nopagados: clients.filter(c => c.pagoServicio === 'NO PAGADO').length,
      aldia: clients.filter(c => c.pagoServicio === 'AL DIA').length,
    };
  }, [clients]);

  const handleUpdateClient = async (updatedData) => {
    try {
      // Obtener sessionId del contexto o localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const sessionId = user.sessionId;
      
      if (!sessionId) {
        toast({ title: "Error", description: "Sesión expirada." });
        return;
      }

      // Llamar API para guardar cambios
      const response = await updateClienteApi(sessionId, updatedData.id, updatedData);
      const result = await response.json();

      if (result.success) {
        // Actualizar estado local
        const updatedClients = clients.map(c => c.id === updatedData.id ? updatedData : c);
        setClients(updatedClients);
        setSelectedClient(updatedData);
        toast({ title: "Éxito", description: "Empresa actualizada correctamente." });
        refresh(); // Sincronizar con BD
      } else {
        toast({ title: "Error", description: result.message || "Fallo al actualizar." });
      }
    } catch (error) {
      console.error("Error actualizando cliente:", error);
      toast({ title: "Error", description: "No se pudo guardar los cambios." });
    }
  };

  const exportCSV = () => {
      const headers = "ID,Razon Social,RUT,Plan,Tramo,Estado Pago,Neto\n";
      const rows = filteredClients.map(c => `${c.id},"${c.razonSocial}",${c.rut},${c.plan},"${c.tramo}",${c.pagoServicio},${c.neto}`).join("\n");
      const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "cartera_clientes.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Exportado", description: "Archivo CSV generado." });
  };

  // 3. CAMBIO: Pantalla de carga para evitar errores de undefined
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-blue-500/25 border-t-blue-500 animate-spin" />
            <p className="text-white/90 text-sm font-semibold tracking-wide">
              Cargando CRM...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-10">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter flex items-center gap-2">
            CRM & Cobranza <span className="text-blue-500 text-xs bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">V4.0</span>
          </h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em]">Sistema de Gestión Optimizada</p>
        </div>
        
        <div className="flex items-center gap-4">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                <Download size={14} /> Exportar CSV
            </button>
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-sm">
                <button onClick={() => setActiveTab('list')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <LayoutList size={14} /> Gestión
                </button>
                <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <BarChart3 size={14} /> Métricas
                </button>
            </div>
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      {activeTab === 'list' && (
        <div className="flex gap-6 relative items-start">
            
            <CrmTableList 
                filteredClients={filteredClients} stats={stats} 
                onClientSelect={setSelectedClient} selectedClientId={selectedClient?.id}
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            />

            <AnimatePresence>
                {selectedClient && (
                    <ClientDetailDrawer 
                        client={selectedClient} 
                        onClose={() => setSelectedClient(null)} 
                        onUpdateClient={handleUpdateClient} 
                    />
                )}
            </AnimatePresence>
        </div>
      )}

      {/* 4. CAMBIO: Pasar los datos reales a las analíticas */}
      {activeTab === 'analytics' && (
        <CrmAnalytics 
          cashFlow={cashFlow}
          services={services}
          compliance={compliance}
          risk={risk}
        />
      )}
      
    </div>
  );
};

export default CRM;