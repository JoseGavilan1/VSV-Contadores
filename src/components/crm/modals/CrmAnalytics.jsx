// src/components/crm/views/CrmAnalytics.jsx
import React from 'react';
import { TrendingUp, PieChart as PieIcon, Activity, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area, Line, ComposedChart } from 'recharts';
import { CASH_FLOW_DATA, SERVICES_DATA, COMPLIANCE_DATA, RISK_DATA } from '../crmData';

const CrmAnalytics = () => {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 animate-in fade-in duration-500">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
           
           {/* Flujo de Caja */}
           <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[3rem] h-[450px] flex flex-col backdrop-blur-md">
             <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
               <TrendingUp className="text-blue-500" size={16}/> Flujo de Caja & Estimación
             </h3>
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={CASH_FLOW_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0f172a', color: '#fff'}} />
                  <Legend />
                  <Bar dataKey="facturado" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} name="Facturado (M$)" />
                  <Bar dataKey="recaudado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Recaudado (M$)" />
                  <Line type="monotone" dataKey="dts" stroke="#f59e0b" strokeWidth={2} name="Carga Operativa (DTs)" />
                </ComposedChart>
             </ResponsiveContainer>
          </div>

          {/* Distribución de Servicios */}
          <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[3rem] h-[450px] flex flex-col backdrop-blur-md">
             <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
               <PieIcon className="text-purple-500" size={16}/> Distribución de Servicios
             </h3>
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SERVICES_DATA} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" stroke="none">
                    {SERVICES_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#ffffff', color: '#fff'}} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8'}} />
                </PieChart>
             </ResponsiveContainer>
          </div>

          {/* Cumplimiento Tributario */}
          <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[3rem] h-[400px] flex flex-col backdrop-blur-md">
             <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
               <Activity className="text-emerald-500" size={16}/> Cumplimiento Tributario (F29)
             </h3>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={COMPLIANCE_DATA} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} width={100} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0f172a', color: '#fff'}} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={25}>
                    {COMPLIANCE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>

          {/* Riesgo de Cartera */}
           <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[3rem] h-[400px] flex flex-col backdrop-blur-md">
             <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
               <AlertTriangle className="text-red-500" size={16}/> Riesgo de Deuda (M$)
             </h3>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={RISK_DATA}>
                  <defs>
                    <linearGradient id="colorDeuda" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0f172a', color: '#fff'}} />
                  <Area type="monotone" dataKey="monto" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDeuda)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
       </div>
    </div>
  );
};

export default CrmAnalytics;
