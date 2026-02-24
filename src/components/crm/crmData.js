/*
export const INITIAL_CLIENTS = [
  {
    id: 1, razonSocial: 'FARMACIAS HIGIA SPA', rut: '77.583.495-1', giro: 'FARMACIA Y VENTA DE MEDICAMENTOS',
    plan: 'GO', tramo: '$30.000', direccion: 'AVENIDA SIEMPRE VIVA 742', comuna: 'PROVIDENCIA', ciudad: 'SANTIAGO',
    telefono: '56 9 5016 7243', correo: 'karlafranv@gmail.com', claveWeb: 'Farma-cyk2:.', claveSII: 'tralalero',
    estadoFormulario: 'NO DECLARAR', impuestoPagar: 1539812, repNombre: 'KARLA VERA VERDUGO', repRut: '18.627.244-7',
    pagoServicio: 'SERVICIO SUSPENDIDO', type: 'Empresa', neto: 25210, dts: 12,
    score: 35, drive: 'https://drive.google.com/', 
    notas: [{ id: 101, fecha: '18/02/2026', texto: 'Se intentó contactar. Buzón de voz.' }]
  },
  {
    id: 2, razonSocial: 'GOK PRODUCCIONES LIMITADA', rut: '77.493.132-5', giro: 'PRODUCCION DE EVENTOS',
    plan: 'GO', tramo: '$30.000', direccion: 'GUARDIA VIEJA 202 OF 902 9P', comuna: 'PROVIDENCIA', ciudad: 'SANTIAGO',
    telefono: '946672273', correo: 'vsvconsultores9@gmail.com', claveWeb: 'poli2021', claveSII: 'SIN CLAVE',
    estadoFormulario: 'NO DECLARAR', impuestoPagar: 569871, repNombre: 'YESSICA ANDREA SILVA SUAREZ', repRut: '14.564.625-1',
    pagoServicio: 'SERVICIO SUSPENDIDO', type: 'Empresa', neto: 25210, dts: 5,
    score: 42, drive: 'https://drive.google.com/',
    notas: []
  },
  {
    id: 3, razonSocial: 'SANHUEZA MANSO SPA', rut: '76.916.588-6', giro: 'CONSULTORIA INFORMATICA',
    plan: 'GO', tramo: '$47.600', direccion: 'EL BOSQUE NORTE 500', comuna: 'LAS CONDES', ciudad: 'SANTIAGO',
    telefono: '', correo: 'anhueza@virttux.cl', claveWeb: 'Virttux2020', claveSII: 'SIN CLAVE',
    estadoFormulario: 'PENDIENTE', impuestoPagar: 341033, repNombre: 'LEONARDO HANSEL SANHUEZA', repRut: '14.340.421-8',
    pagoServicio: 'NO PAGADO', type: 'Empresa', neto: 40000, dts: 8,
    score: 68, drive: 'https://drive.google.com/',
    notas: [{ id: 102, fecha: '15/02/2026', texto: 'Promesa de pago para el viernes.' }]
  },
  {
    id: 4, razonSocial: 'MCB CONSULTORES SPA', rut: '77.871.935-5', giro: 'ASESORIAS INTEGRALES',
    plan: 'EXECUTIVE', tramo: '$59.500', direccion: 'HUERFANOS 1160', comuna: 'SANTIAGO', ciudad: 'SANTIAGO',
    telefono: '56 9 7827 8733', correo: 'alan@mcbconsultores.cl', claveWeb: 'CONSULT23', claveSII: 'MCB1234', 
    estadoFormulario: 'PENDIENTE', impuestoPagar: 0, repNombre: 'MAURICIO ANDRES CORVALAN', repRut: '14.143.766-6',
    pagoServicio: 'NO PAGADO', type: 'Empresa', neto: 50000, dts: 45,
    score: 75, drive: 'https://drive.google.com/',
    notas: []
  },
  {
    id: 5, razonSocial: 'ALEJANDRO PEREZ RODRIGUEZ', rut: '26.245.134-8', giro: 'SERVICIOS PERSONALES',
    plan: 'PYME', tramo: '$41.650', direccion: 'PASAJE LOS ALERYES 123', comuna: 'MAIPU', ciudad: 'SANTIAGO',
    telefono: '56 9 7161 8589', correo: 'alejandroperez170293@live.com', claveWeb: '17171717', claveSII: 'ALEJ17',
    estadoFormulario: 'DECLARADO', impuestoPagar: 2265000, repNombre: 'ALEJANDRO PEREZ', repRut: '26.245.134-8',
    pagoServicio: 'AL DIA', type: 'Persona', neto: 35000, dts: 0,
    score: 98, drive: 'https://drive.google.com/',
    notas: [{ id: 103, fecha: '01/02/2026', texto: 'Cliente excelente, todo al día.' }]
  },
  {
    id: 6, razonSocial: 'INVERSIONES SAN LUIS SPA', rut: '78.123.456-2', giro: 'INVERSIONES INMOBILIARIAS',
    plan: 'EXECUTIVE', tramo: '$80.000', direccion: 'AV APOQUINDO 3000 OF 502', comuna: 'LAS CONDES', ciudad: 'SANTIAGO',
    telefono: '56 9 8888 7777', correo: 'contacto@sanluisinversiones.cl', claveWeb: 'SL_Inv2026', claveSII: 'InverSL1',
    estadoFormulario: 'DECLARADO', impuestoPagar: 540000, repNombre: 'LUIS SANCHEZ', repRut: '12.345.678-9',
    pagoServicio: 'AL DIA', type: 'Empresa', neto: 65000, dts: 20,
    score: 90, drive: 'https://drive.google.com/', 
    notas: []
  },

  {
    id: 8, razonSocial: 'JUAN CARLOS SEPULVEDA EIRL', rut: '77.111.222-3', giro: 'TRANSPORTE DE CARGA',
    plan: 'PYME', tramo: '$50.000', direccion: 'PANAMERICANA NORTE KM 15', comuna: 'QUILICURA', ciudad: 'SANTIAGO',
    telefono: '56 9 2222 1111', correo: 'transportessepulveda@gmail.com', claveWeb: 'TransJC_2024', claveSII: 'SiiTransJC',
    estadoFormulario: 'NO DECLARAR', impuestoPagar: 0, repNombre: 'JUAN CARLOS SEPULVEDA', repRut: '10.987.654-3',
    pagoServicio: 'SERVICIO SUSPENDIDO', type: 'Empresa', neto: 45000, dts: 5,
    score: 25, drive: 'https://drive.google.com/',
    notas: [{ id: 105, fecha: '10/02/2026', texto: 'Cliente inubicable hace 2 meses.' }]
  },
  {
    id: 9, razonSocial: 'ASESORIAS LEGALES ROJAS Y CIA', rut: '76.444.555-4', giro: 'SERVICIOS JURIDICOS',
    plan: 'EXECUTIVE', tramo: '$100.000', direccion: 'AHUMADA 312 OF 405', comuna: 'SANTIAGO', ciudad: 'SANTIAGO',
    telefono: '56 2 2333 4444', correo: 'contacto@rojasabogados.cl', claveWeb: 'RojasLegal', claveSII: 'LegalRojas',
    estadoFormulario: 'DECLARADO', impuestoPagar: 1250000, repNombre: 'PEDRO ROJAS', repRut: '9.876.543-2',
    pagoServicio: 'AL DIA', type: 'Empresa', neto: 85000, dts: 30,
    score: 95, drive: 'https://drive.google.com/',
    notas: []
  },
  {
    id: 10, razonSocial: 'MARIA FERNANDA LOPEZ', rut: '17.555.666-7', giro: 'HONORARIOS MEDICOS',
    plan: 'PYME', tramo: '$30.000', direccion: 'AV VITACURA 5950', comuna: 'VITACURA', ciudad: 'SANTIAGO',
    telefono: '56 9 9999 8888', correo: 'dra.mflopez@gmail.com', claveWeb: 'MedicaMF', claveSII: 'SiiMedica',
    estadoFormulario: 'PENDIENTE', impuestoPagar: 0, repNombre: 'MARIA FERNANDA LOPEZ', repRut: '17.555.666-7',
    pagoServicio: 'AL DIA', type: 'Persona', neto: 25000, dts: 2,
    score: 88, drive: 'https://drive.google.com/',
    notas: []
  }
];

export const CASH_FLOW_DATA = [
  { name: 'SEP', facturado: 1.8, recaudado: 1.7, dts: 45 }, { name: 'OCT', facturado: 2.1, recaudado: 1.9, dts: 52 },
  { name: 'NOV', facturado: 2.5, recaudado: 2.2, dts: 49 }, { name: 'DIC', facturado: 3.4, recaudado: 3.1, dts: 80 },
  { name: 'ENE', facturado: 2.8, recaudado: 2.4, dts: 65 }, { name: 'FEB', facturado: 2.4, recaudado: 1.8, dts: 60 },
];

export const SERVICES_DATA = [
  { name: 'Contabilidad', value: 45, color: '#3b82f6' }, { name: 'RRHH', value: 25, color: '#8b5cf6' },
  { name: 'Renta', value: 20, color: '#10b981' }, { name: 'Auditoría', value: 10, color: '#f59e0b' },
];

export const COMPLIANCE_DATA = [
  { name: 'Declarado OK', value: 65, color: '#10b981' }, { name: 'Pendiente Info', value: 20, color: '#f59e0b' },
  { name: 'Sin Movimiento', value: 15, color: '#64748b' },
];

export const RISK_DATA = [
  { name: 'Suspendidos', monto: 2.1 }, { name: 'No Pagados', monto: 0.8 }, { name: 'Al Día', monto: 0 },
];
*/

import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getCrmDataApi } from '../../services/crmService.js';

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
      setClients([]);
      setCashFlow([]);
      setServices([]);
      setCompliance([]);
      setRisk([]);
      setLoading(false);
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

      setClients(payload?.clients || []);
      setCashFlow(payload?.cashFlow || []);
      setServices(payload?.services || []);
      setCompliance(payload?.compliance || []);
      setRisk(payload?.risk || []);
    } catch (error) {
      console.error("Error en el Búnker:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [user?.sessionId, selectedCompany?.id, selectedCompany?.empresaId]);

  return { clients, cashFlow, services, compliance, risk, loading, refresh: loadAll };
};