import React from 'react';
import { Search, Filter, ChevronDown, Users, AlertTriangle, FileText, CheckCircle2, Building2, User } from 'lucide-react';
import { StatCard } from '../ui/CrmUI';

const CrmTableList = ({ 
    filteredClients, stats, onClientSelect, selectedClientId, 
    searchTerm, setSearchTerm, statusFilter, setStatusFilter, typeFilter, setTypeFilter 
}) => {
    
    const getScoreColor = (score) => {
        if(score >= 80) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if(score >= 50) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        return 'text-red-500 bg-red-500/10 border-red-500/20';
    };

    return (
        <div className={`flex flex-col gap-6 transition-all duration-500 ease-in-out h-full min-h-0 ${selectedClientId ? 'lg:w-3/5' : 'w-full'}`}>
            
            {/* KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
              <StatCard icon={Users} label="Global" value={stats.total} color="text-blue-500" onClick={() => setStatusFilter('Todos')} active={statusFilter === 'Todos'} />
              <StatCard icon={AlertTriangle} label="Suspendidos" value={stats.suspendidos} color="text-red-500" onClick={() => setStatusFilter('SERVICIO SUSPENDIDO')} active={statusFilter === 'SERVICIO SUSPENDIDO'} />
              <StatCard icon={FileText} label="No Pagados" value={stats.nopagados} color="text-amber-500" onClick={() => setStatusFilter('NO PAGADO')} active={statusFilter === 'NO PAGADO'} />
              <StatCard icon={CheckCircle2} label="Al Día" value={stats.aldia} color="text-emerald-500" onClick={() => setStatusFilter('AL DIA')} active={statusFilter === 'AL DIA'} />
            </div>

            {/* FILTROS */}
            <div className="flex flex-col lg:flex-row gap-4 bg-white/[0.03] p-4 rounded-[2rem] border border-white/10 items-center flex-shrink-0 backdrop-blur-xl">
              <div className="relative flex-1 w-full text-white">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" placeholder="BUSCAR POR NOMBRE O RUT..." 
                  className="w-full pl-10 pr-4 py-3 bg-black/20 text-white border border-white/10 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 uppercase tracking-widest transition-colors"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="flex gap-4">
                <div className="relative group min-w-[180px]">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Filter size={12} className="text-blue-400" /></div>
                  <select 
                    value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none w-full pl-9 pr-8 py-3 bg-[#0b0f17] text-white border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  >
                    <option value="Todos">Todos los Estados</option>
                    <option value="NO PAGADO">🟠 No Pagado</option>
                    <option value="SERVICIO SUSPENDIDO">🔴 Suspendidos</option>
                    <option value="AL DIA">🟢 Al Día</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10">
                  {['Todos', 'Empresa', 'Persona'].map((type) => (
                    <button key={type} onClick={() => setTypeFilter(type)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${typeFilter === type ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                      {type === 'Todos' ? 'Global' : type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TABLA CON SCROLL */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex-1 flex flex-col min-h-0 overflow-hidden relative backdrop-blur-md">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#0f172a] shadow-lg">
                    <tr>
                      <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Estado</th>
                      <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Cliente</th>
                      <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Plan & Score</th>
                      <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredClients.map((client) => (
                      <tr key={client.id} onClick={() => onClientSelect(client)} className={`hover:bg-white/[0.04] cursor-pointer transition-all ${selectedClientId === client.id ? 'bg-blue-600/10 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}>
                        <td className="p-5">
                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                            client.pagoServicio === 'AL DIA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            client.pagoServicio === 'NO PAGADO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                            'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {client.pagoServicio === 'SERVICIO SUSPENDIDO' ? 'SUSPENDIDO' : client.pagoServicio}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${client.type === 'Empresa' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                               {client.type === 'Empresa' ? <Building2 size={16}/> : <User size={16}/>}
                            </div>
                            <div className="flex flex-col">
                               <span className="font-bold text-white text-xs uppercase tracking-tight">{client.razonSocial}</span>
                               <span className="text-[10px] text-gray-500 font-mono tracking-wider">{client.rut}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                           <div className="flex flex-col items-start gap-1">
                              <span className="bg-white/10 text-gray-200 border border-white/10 px-2 py-0.5 rounded text-[9px] font-black uppercase">{client.plan}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getScoreColor(client.score)}`}>Score: {client.score}</span>
                           </div>
                        </td>
                        <td className="p-5 text-right">
                           <span className="text-emerald-400 font-mono font-bold text-xs">${client.neto.toLocaleString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
    );
};

export default CrmTableList;
