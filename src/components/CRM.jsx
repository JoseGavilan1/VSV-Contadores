import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LayoutList, BarChart3, Download, Upload } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import { useBunkerData } from './crm/crmData'; 
import { updateClienteApi } from '@/services/crmService';
import CrmTableList from './crm/views/CrmTableList';
import CrmAnalytics from './crm/modals/CrmAnalytics'; 
import ClientDetailDrawer from './crm/modals/ClientDetailDrawer';
 
// Limpiador de texto global
const cleanStr = (str) => {
  if (!str) return '';
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
};

const CRM = () => {
  const [activeTab, setActiveTab] = useState('list');
  const fileInputRef = useRef(null);
  
  const { clients: dbClients, cashFlow, services, compliance, risk, loading, refresh } = useBunkerData();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (dbClients) setClients(dbClients);
  }, [dbClients]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos'); 
  const [typeFilter, setTypeFilter] = useState('Todos');     
  const [selectedClient, setSelectedClient] = useState(null);

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
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const sessionId = user.sessionId;
      
      if (!sessionId) {
        toast({ title: "ERROR", description: "SESION EXPIRADA." });
        return;
      }

      const response = await updateClienteApi(sessionId, updatedData.id, updatedData);
      const result = await response.json();

      if (result.success) {
        const updatedClients = clients.map(c => c.id === updatedData.id ? updatedData : c);
        setClients(updatedClients);
        setSelectedClient(updatedData);
        toast({ title: "EXITO", description: "EMPRESA ACTUALIZADA CORRECTAMENTE." });
        refresh(); 
      } else {
        toast({ title: "ERROR", description: cleanStr(result.message) || "FALLO AL ACTUALIZAR." });
      }
    } catch (error) {
      console.error("Error actualizando cliente:", error);
      toast({ title: "ERROR", description: "NO SE PUDO GUARDAR LOS CAMBIOS." });
    }
  };

  // Lógica para Procesar el CSV de subida
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    toast({ 
        title: "CSV DETECTADO", 
        description: `EL ARCHIVO ${cleanStr(file.name)} ESTA SIENDO PROCESADO...`,
        className: "bg-blue-500 text-white font-bold border-none"
    });

    // Aquí en el futuro se conecta con tu API para procesar el archivo.
    // Por ahora simulamos la carga:
    setTimeout(() => {
        toast({ 
            title: "IMPORTACION EXITOSA", 
            description: "LOS DATOS HAN SIDO INGRESADOS AL BUNKER.", 
            className: "bg-emerald-500 text-white font-bold border-none" 
        });
        refresh(); // Refresca los datos de la base de datos
    }, 1500);

    e.target.value = null; // Resetea el input para poder subir el mismo archivo otra vez si se requiere
  };

  const exportCSV = () => {
      const headers = "ID,RAZON SOCIAL,RUT,PLAN,TRAMO,ESTADO PAGO,NETO\n";
      // Formateamos las filas para que salgan limpias, sin tildes y en mayúsculas
      const rows = filteredClients.map(c => 
          `${c.id},"${cleanStr(c.razonSocial)}",${c.rut},${cleanStr(c.plan)},"${c.tramo}",${cleanStr(c.pagoServicio)},${c.neto}`
      ).join("\n");
      
      const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "BUNKER_CARTERA_CLIENTES.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "EXPORTACION EXITOSA", description: "ARCHIVO CSV GENERADO CORRECTAMENTE." });
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-blue-500/25 border-t-blue-500 animate-spin" />
            <p className="text-white/90 text-sm font-semibold tracking-wide uppercase">
              CARGANDO BUNKER CRM...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-10">
      
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter flex items-center gap-2">
            CRM & Cobranza <span className="text-blue-500 text-xs bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">V4.0</span>
          </h1>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em]">Sistema de Gestión Optimizada</p>
        </div>
        
        <div className="flex items-center gap-4">
            {/* Botón Oculto de Importación */}
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
            
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                <Upload size={14} /> IMPORTAR CSV
            </button>

            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                <Download size={14} /> EXPORTAR CSV
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