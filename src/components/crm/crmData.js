import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getCrmDataApi } from '../../services/crmService.js';

// ==============================================================
// DATOS DE RESPALDO (MOCKS)
// ==============================================================
const FALLBACK_CLIENTS = [
  { 
    id: 9999, razonSocial: '⚠️ ERROR DE CONEXIÓN CON BACKEND', rut: '00.000.000-0', 
    plan: 'SIN DATOS', pagoServicio: 'SERVICIO SUSPENDIDO', type: 'Empresa', score: 0, neto: 0 
  },
  { 
    id: 9998, razonSocial: 'DATOS DE PRUEBA (PERSONA)', rut: '11.111.111-1', 
    plan: 'FREE', pagoServicio: 'AL DIA', type: 'Persona', score: 95, neto: 15000 
  }
];

const FALLBACK_CASH_FLOW = [
  { name: 'SEP', facturado: 1.8, recaudado: 1.7, dts: 45 }, 
  { name: 'OCT', facturado: 2.1, recaudado: 1.9, dts: 52 },
  { name: 'NOV', facturado: 2.5, recaudado: 2.2, dts: 49 }, 
];

const FALLBACK_SERVICES = [
  { name: 'Contabilidad', value: 45, color: '#3b82f6' }, 
  { name: 'RRHH', value: 25, color: '#8b5cf6' },
];

const FALLBACK_COMPLIANCE = [
  { name: 'Declarado OK', value: 65, color: '#10b981' }, 
  { name: 'Pendiente Info', value: 20, color: '#f59e0b' },
];

const FALLBACK_RISK = [
  { name: 'Suspendidos', monto: 2.1 }, 
  { name: 'No Pagados', monto: 0.8 }, 
];

// ==============================================================
// HOOK PRINCIPAL DEL BUNKER
// ==============================================================
export const useBunkerData = () => {
  const { user, selectedCompany } = useAuth();
  
  const [clients, setClients] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [services, setServices] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [risk, setRisk] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    if (!user?.sessionId) {
      setClients([]); setCashFlow([]); setServices([]); setCompliance([]); setRisk([]); setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const empresaId = selectedCompany?.id ?? selectedCompany?.empresaId ?? null;
      const response = await getCrmDataApi(user.sessionId, empresaId);
      const payload = await response.json();

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || 'No se pudo cargar CRM');
      }

      // 1. A PRUEBA DE BALAS: Buscamos el arreglo sin importar cómo lo llame el backend
      let rawClients = payload?.clients || payload?.companies || payload?.empresas || payload?.data || [];
      if (!Array.isArray(rawClients)) rawClients = [];

      // 2. EL TRADUCTOR: Mapeamos los nombres de la base de datos a los nombres que usa la tabla
      const normalizedClients = rawClients.map(client => ({
          ...client,
          id: client.id,
          // Traducimos campos de texto
          razonSocial: client.razonSocial || client.razon_social || client.nombre || 'Sin Nombre',
          rut: client.rut || client.rut_encrypted || 'Sin RUT',
          plan: client.plan || client.nombre_plan || 'Sin Plan',
          // Traducimos campos de estado
          pagoServicio: client.pagoServicio || client.estado_pago || 'AL DIA',
          type: client.type || client.tipo_cliente || client.tipoCliente || 'Empresa',
          // Traducimos métricas numéricas
          score: client.score || 100,
          neto: client.neto || client.impuesto_pagar || 0
      }));

      setClients(normalizedClients);
      
      setCashFlow(payload?.cashFlow?.length > 0 ? payload.cashFlow : FALLBACK_CASH_FLOW);
      setServices(payload?.services?.length > 0 ? payload.services : FALLBACK_SERVICES);
      setCompliance(payload?.compliance?.length > 0 ? payload.compliance : FALLBACK_COMPLIANCE);
      setRisk(payload?.risk?.length > 0 ? payload.risk : FALLBACK_RISK);

    } catch (error) {
      console.error("❌ Error conectando al Búnker CRM:", error.message);
      
      // 3. SI EL BACKEND FALLA: Inyectamos datos de alerta para que la tabla no se rompa
      setClients(FALLBACK_CLIENTS);
      setCashFlow(FALLBACK_CASH_FLOW);
      setServices(FALLBACK_SERVICES);
      setCompliance(FALLBACK_COMPLIANCE);
      setRisk(FALLBACK_RISK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadAll(); 
  }, [user?.sessionId, selectedCompany?.id]);

  return { clients, cashFlow, services, compliance, risk, loading, refresh: loadAll };
};