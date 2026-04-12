import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutList, BarChart3, Download, Upload, Building2, ChevronDown, Search, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import { useBunkerData } from './crm/crmData'; 
import { updateClienteApi } from '@/services/crmService';
import CrmTableList from './crm/views/CrmTableList';
import CrmAnalytics from './crm/modals/CrmAnalytics'; 
import ClientDetailDrawer from './crm/modals/ClientDetailDrawer';

import { useAuth } from '@/hooks/useAuth';

const cleanStr = (str) => {
  if (!str) return '';
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
};

const CRM = () => {
  const [activeTab, setActiveTab] = useState('list');
  
  const { clients: dbClients, cashFlow, services, compliance, risk, loading } = useBunkerData();
  const [clients, setClients] = useState([]);

  // =========================================
  // ÚNICA FUENTE DE VERDAD: ESTADO GLOBAL
  // =========================================
  const { selectedCompany, setSelectedCompany } = useAuth();
  
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos'); 
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    if (dbClients) setClients(dbClients);
  }, [dbClients]);

  // RECUPERACIÓN ESTRICTA AL CARGAR
  useEffect(() => {
    const savedCompanyStr = localStorage.getItem('empresaActivaCRM') || localStorage.getItem('selectedCompany');
    if (savedCompanyStr) {
        try {
            const parsed = JSON.parse(savedCompanyStr);
            // Solo actualizamos si el contexto no tiene empresa o tiene una diferente
            if (setSelectedCompany && (!selectedCompany || selectedCompany.id !== parsed.id)) {
                setSelectedCompany(parsed);
            }
        } catch (e) {}
    }
  }, []); 

  // Sincronizador maestro del panel lateral
  useEffect(() => {
      const handleGlobalClick = (e) => {
          const btn = e.target.closest('button');
          if (!btn || btn.id === 'top-selector-btn') return;
          
          const text = btn.textContent?.toUpperCase() || '';
          if (text.includes('SELECCIONAR EMPRESA') || text.includes('SELECCIONADA')) {
              if (selectedClient) {
                  if (setSelectedCompany) setSelectedCompany(selectedClient);
                  // Guardamos en ambas variables comunes por si useAuth usa la otra
                  localStorage.setItem('empresaActivaCRM', JSON.stringify(selectedClient));
                  localStorage.setItem('selectedCompany', JSON.stringify(selectedClient));
              }
          }
      };
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
  }, [selectedClient, setSelectedCompany]);

  // 🚨 LA CLAVE: El nombre del botón se saca SOLO de la variable global
  const activeCompanyName = selectedCompany?.razon_social || selectedCompany?.razonSocial || null;

  // STATS INTELIGENTES
  const stats = useMemo(() => {
      if (!clients) return { total: 0, criticos: 0, f29Pendientes: 0, alDia: 0 };
      return {
          total: clients.length,
          criticos: clients.filter(c => {
              const pago = String(c.estado_pago || c.pagoServicio || '').trim().toUpperCase();
              const dts = parseInt(c.dts_mensuales || c.dtAtrasados || 0);
              return pago === 'NO PAGADO' || pago === 'SERVICIO SUSPENDIDO' || dts > 0;
          }).length,
          f29Pendientes: clients.filter(c => {
              const f29 = String(c.estado_f29 || c.estadoFormulario || '').trim().toUpperCase();
              return f29 === 'PENDIENTE';
          }).length,
          alDia: clients.filter(c => {
              const pago = String(c.estado_pago || c.pagoServicio || '').trim().toUpperCase();
              const f29 = String(c.estado_f29 || c.estadoFormulario || '').trim().toUpperCase();
              return (pago === 'AL DIA' || pago === 'PAGADO') && (f29 === 'DECLARADO' || f29 === 'NO DECLARAR');
          }).length
      };
  }, [clients]);

  // FILTRO INTELIGENTE
  const filteredClients = useMemo(() => {
      return clients.filter(c => {
          const razonSocial = String(c.razon_social || c.razonSocial || '').toLowerCase();
          const rut = String(c.rut_encrypted || c.rut || '').toLowerCase();
          const tipo = String(c.tipo_cliente || c.type || '');
          const pago = String(c.estado_pago || c.pagoServicio || '').trim().toUpperCase();
          const f29 = String(c.estado_f29 || c.estadoFormulario || '').trim().toUpperCase();
          const dts = parseInt(c.dts_mensuales || c.dtAtrasados || 0);

          const matchSearch = cleanStr(razonSocial).includes(cleanStr(searchTerm.toLowerCase())) || rut.includes(searchTerm.toLowerCase());
          const matchType = typeFilter === 'Todos' || tipo === typeFilter;
          let matchStatus = true;
          if (statusFilter === 'Críticos') {
              matchStatus = pago === 'NO PAGADO' || pago === 'SERVICIO SUSPENDIDO' || dts > 0;
          } else if (statusFilter === 'F29 Pendientes') {
              matchStatus = f29 === 'PENDIENTE';
          } else if (statusFilter === 'Al Día') {
              matchStatus = (pago === 'AL DIA' || pago === 'PAGADO') && (f29 === 'DECLARADO' || f29 === 'NO DECLARAR');
          }
          return matchSearch && matchType && matchStatus;
      });
  }, [clients, searchTerm, statusFilter, typeFilter]);

  const handleUpdateClient = async (updatedClient) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.sessionId) throw new Error("Sesión inválida");
      
      const res = await updateClienteApi(user.sessionId, updatedClient.id, updatedClient);
      if(res.success || res){
          setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
          if(selectedClient?.id === updatedClient.id) {
              setSelectedClient(updatedClient);
          }
          toast({ title: "Cliente actualizado", description: "Los cambios se guardaron correctamente en la base de datos." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el cliente." });
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-white"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="h-full flex flex-col gap-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
            <h1 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">Panel de Gestión CRM</h1>
            <p className="text-gray-400 text-xs mt-1 font-bold tracking-widest uppercase">Monitoreo y Operaciones Financieras</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            
            {isSelectorOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsSelectorOpen(false)} />
            )}

            <div className="relative group z-50">
                <button 
                    id="top-selector-btn"
                    onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                    className={`relative flex items-center justify-between gap-2 bg-[#0f172a]/90 backdrop-blur-xl border text-sm font-bold px-4 py-2.5 rounded-xl w-64 md:w-[350px] shadow-lg hover:bg-[#1e293b] transition-all ${isSelectorOpen ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-white/10'} ${activeCompanyName ? 'text-white' : 'text-gray-400'}`}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Building2 size={16} className={activeCompanyName ? "text-emerald-400 shrink-0" : "text-gray-500 shrink-0"} />
                        <span className="truncate tracking-tight flex items-center gap-2">
                            {activeCompanyName ? activeCompanyName : 'SELECCIONAR EMPRESA...'}
                        </span>
                    </div>
                    <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${isSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {isSelectorOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-[calc(100%+8px)] right-0 w-[320px] md:w-[400px] bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-3 border-b border-white/5 bg-[#1e293b]/50">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        autoFocus
                                        placeholder="Buscar empresa por nombre o RUT..." 
                                        value={selectorSearch}
                                        onChange={(e) => setSelectorSearch(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-500"
                                    />
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                
                                <button 
                                    onClick={() => {
                                        if (setSelectedCompany) setSelectedCompany(null);
                                        localStorage.removeItem('empresaActivaCRM');
                                        localStorage.removeItem('selectedCompany');
                                        
                                        setIsSelectorOpen(false);
                                        setSelectorSearch('');
                                        toast({ title: "Modo Global", description: "Se ha desmarcado la empresa activa." });
                                    }}
                                    className={`w-full text-left px-5 py-4 text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${!activeCompanyName ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'}`}
                                >
                                    <LayoutList size={14} /> SELECCIONAR EMPRESA
                                </button>

                                {clients
                                    .filter(c => cleanStr(c.razon_social || c.razonSocial).includes(cleanStr(selectorSearch)) || cleanStr(c.rut_encrypted || c.rut).includes(cleanStr(selectorSearch)))
                                    .sort((a, b) => (a.razon_social || a.razonSocial || '').localeCompare(b.razon_social || b.razonSocial || ''))
                                    .map(c => {
                                        const isThisSelected = selectedCompany?.id === c.id;
                                        return (
                                            <button 
                                                key={c.id}
                                                onClick={() => {
                                                    // GUARDADO DIRECTO AL ESTADO GLOBAL
                                                    if (setSelectedCompany) setSelectedCompany(c);
                                                    localStorage.setItem('empresaActivaCRM', JSON.stringify(c));
                                                    localStorage.setItem('selectedCompany', JSON.stringify(c));
                                                    
                                                    setActiveTab('list');
                                                    setIsSelectorOpen(false);
                                                    setSelectorSearch('');
                                                    toast({ title: "Empresa Seleccionada", description: `Has activado a ${c.razon_social || c.razonSocial}` });
                                                }}
                                                className={`w-full flex flex-col items-start px-5 py-3 transition-all border-t border-white/5 ${isThisSelected ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : 'hover:bg-white/5 border-l-2 border-l-transparent hover:pl-6'}`}
                                            >
                                                <div className="flex justify-between w-full items-center mb-1">
                                                    <span className={`text-sm font-black tracking-tight truncate pr-2 ${isThisSelected ? 'text-blue-400' : 'text-white'}`}>
                                                        {c.razon_social || c.razonSocial}
                                                    </span>
                                                    {isThisSelected && <CheckCircle2 size={16} className="text-blue-400 shrink-0" />}
                                                </div>
                                                <span className="text-[10px] font-mono font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                                                    {c.rut_encrypted || c.rut}
                                                </span>
                                            </button>
                                        );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 relative z-10">
                <button onClick={() => setActiveTab('list')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <LayoutList size={14} /> Clientes
                </button>
                <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <BarChart3 size={14} /> Métricas
                </button>
            </div>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="flex gap-6 relative items-start h-full">
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