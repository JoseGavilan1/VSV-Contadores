import React, { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from 'framer-motion';
import { Search, Download, FileWarning, Loader2, RotateCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { API_BASE_URL, RUT_EMPRESA_LOCAL, IVA_RATE } from "../../../config.js";
import { useAuth } from '@/hooks/useAuth.jsx';

const mesesBase = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const tiposDte = [
  { value: '33', label: 'Factura Electrónica' },
  { value: '34', label: 'Exenta Electrónica' },
  { value: '52', label: 'Guía de Despacho' },
  { value: '56', label: 'Nota de Débito' },
  { value: '61', label: 'Nota de Crédito' },
];

const DocumentosDTE = () => {
  const { selectedCompany } = useAuth();
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [tipoDeDTE, setTipoDeDTE] = useState('');
  const [cargado, setCargado] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingFolio, setDownloadingFolio] = useState(null);

  const [cacheDtes, setCacheDtes] = useState({});
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const rutEmpresa = '18408812-8'; // Para rut dinamico usar selectedCompany?.rut // SelectedCompany

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'normal' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = 'normal';
    }
    setSortConfig({ key: direction === 'normal' ? null : key, direction });
  };

  const filteredRows = useMemo(() => {
    let processedRows = rows.filter(row => {
      const coincideTipo = filtroTipo === 'todos' || row.tipo.toLowerCase().includes(filtroTipo.toLowerCase());
      const coindiceBusqueda =
        row.folio.toString().includes(busqueda) ||
        row.rutEmisor?.toLowerCase().includes(busqueda.toLowerCase()) ||
        row.rutReceptor?.toLowerCase().includes(busqueda.toLowerCase());
      return coincideTipo && coindiceBusqueda;
    });

    if (sortConfig.key && sortConfig.direction !== 'normal') {
      processedRows.sort((a, b) => {
        let valA, valB;

        if (sortConfig.key === 'fechaEmision') {
          // Parseamos DD/MM/YYYY a objeto Date para comparar correctamente
          const [dA, mA, yA] = a.fechaEmision.split('/').map(Number);
          const [dB, mB, yB] = b.fechaEmision.split('/').map(Number);
          valA = new Date(yA, mA - 1, dA);
          valB = new Date(yB, mB - 1, dB);
        } else if (sortConfig.key === 'monto') {
          // Limpiamos el formato CLP "$ 50.000" a número puro
          valA = Number(a.monto.replace(/[^\d]/g, ""));
          valB = Number(b.monto.replace(/[^\d]/g, ""));
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return processedRows;
  }, [rows, filtroTipo, busqueda, sortConfig]);

  const mesesVisibles = useMemo(() => {
    const now = new Date();
    const mesActual = now.getMonth() + 1;
    const anioActual = String(now.getFullYear());

    if (anio === anioActual) {
      return mesesBase.filter(m => Number(m.value) <= mesActual);
    }
    
    return mesesBase;
  }, [anio]);

  const anios = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 2 }, (_, i) => String(currentYear - i));
  }, []);

  const formatCLP = (value) => {
    return value != null
      ? value.toLocaleString("es-CL", { style: "currency", currency: "CLP" })
      : '-';
  };

  const handleCargarFacturas = async (force = false) => {
    if (!mes || !anio || !tipoDeDTE) {
      toast({
        title: 'Selección incompleta',
        description: 'Selecciona tipo de DTE, año y mes antes de cargar las facturas.',
        variant: 'destructive',
      });
      return;
    }

    const cacheKey = `${mes}-${anio}-${rutEmpresa}`;

    if (!force && cacheDtes && cacheDtes[cacheKey]) {
      const cachedRegistros = cacheDtes[cacheKey];
      
      const mapped = cachedRegistros.map((r, i) => {
        const montoTotal = r.monto_total || 0;
        const valorNeto = Math.round(montoTotal / (1 + IVA_RATE));

        const valorIva = montoTotal - valorNeto;

        const item = {
          id: `${r.tipo_registro}-${r.folio}-${i}`,
          tipo: r.tipo_registro,
          folio: r.folio,
          rutEmisor: r.rut_emisor,
          rutReceptor: r.rut_receptor,
          fechaEmision: r.fecha_emision,
          montoNeto: formatCLP(valorNeto),
          iva: formatCLP(valorIva),
          monto: formatCLP(r.monto_total),
        };
        return item;
      });

      setRows(mapped);
      setCargado(true);
      return;
    }

    setLoading(true);
    setCargado(false);
    setRows([]);

    try {
      if(selectedCompany == null) throw new Error("No se detectó la empresa seleccionada.");

      const queryParams = new URLSearchParams({
        mes,
        anio,
        rutEmpresa: rutEmpresa, // Para rut dinamico usar selectedCompany?.rut // SelectedCompany
        rutB: RUT_EMPRESA_LOCAL,                                                // Empresa Local
        tipoDoc: tipoDeDTE
      });

      console.log(tipoDeDTE);
      const res = await fetch(`${API_BASE_URL}/dte-consulta/consultar?${queryParams}`);
      const data = await res.json();

      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Error consultando");

      setCacheDtes(prev => ({ ...prev, [cacheKey]: data.registros }));

      const mapped = (data.registros || []).map((r, i) => {

      const montoTotal = r.monto_total || 0;
      const valorNeto = Math.round(montoTotal / (1 + IVA_RATE));
      const valorIva = montoTotal - valorNeto;

      const item = {
        id: `${r.tipo_registro}-${r.folio}-${i}`,
        tipo: r.tipo_registro,
        folio: r.folio,
        rutEmisor: r.rut_emisor,
        rutReceptor: r.rut_receptor,
        fechaEmision: r.fecha_emision,
        montoNeto: formatCLP(valorNeto),
        iva: formatCLP(valorIva),
        monto: formatCLP(r.monto_total),
      };

      if (!item.rutEmisor || !item.rutReceptor) {
        console.error(`❌ [DEBUG] Folio ${item.folio} incompleto. Falta contraparte.`, {
          emisor: item.rutEmisor,
          receptor: item.rutReceptor
        });
      }

      return item;
    });
      setRows(mapped);
      setCargado(true);
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setRows([]);
      setCargado(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarFolio = async (dte) => {
    if (downloadingFolio || !selectedCompany?.rut) {
      console.warn("⚠️ Descarga cancelada: Falta empresa o ya hay proceso activo.");
      return;
    }

    console.log('este es el dte:', dte);

    setDownloadingFolio(dte.folio);

    const esVenta = dte.tipo && dte.tipo.toLowerCase().includes('venta');
    const rutContraparte = esVenta ? dte.rutReceptor : dte.rutEmisor;

    console.log(`🔍 Preparando descarga para Folio ${dte.folio}. Tipo: ${dte.tipo}, EsVenta: ${esVenta}, RUT Contraparte: ${rutContraparte}`);

    try {
      const res = await fetch(`${API_BASE_URL}/dte-consulta/descargar-folio`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // 'x-company-rut': selectedCompany.rut 
          'x-company-rut': rutEmpresa // Para rut dinamico usar selectedCompany?.rut // SelectedCompany
        },
        body: JSON.stringify({ 
          folio: dte.folio, 
          tipoDTE: tipoDeDTE, 
          rutContraparte: rutContraparte,
          tipoRegistro: dte.tipo
        }),
      });
      
      const data = await res.json();
      console.log('Respuesta de descarga:', data);
      
      if (!res.ok) throw new Error(data.error || "Error al capturar PDF");

      const link = document.createElement('a');
      link.href = `${API_BASE_URL}${data.downloadUrl}`;
      link.setAttribute('download', data.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({ title: "Éxito", description: `Folio ${dte.folio} descargado.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error de Búnker", description: err.message });
    } finally {
      setDownloadingFolio(null);
    }
  };

  const periodoCompleto = Boolean(mes && anio && tipoDeDTE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">

          <Select value={tipoDeDTE} onValueChange={(v) => { setTipoDeDTE(v); setCargado(false); }}>
            <SelectTrigger className="w-full sm:w-[170px] bg-white/10 border border-white/20 text-white">
              <SelectValue placeholder="Tipo DTE" />
            </SelectTrigger>

            <SelectContent className="bg-slate-900 border-white/20 text-white shadow-2xl">
              {tiposDte.map((dte) => (
                <SelectItem key={dte.value} value={dte.value}>
                  {dte.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selector de Año */}
          <Select value={anio} onValueChange={(v) => { setAnio(v); setCargado(false); setRows([]); }}>
            <SelectTrigger className="w-full sm:w-[80px] bg-white/10 border border-white/20 text-white">
              <SelectValue placeholder="Año" />
            </SelectTrigger>

            <SelectContent 
              position="popper" 
              side="bottom" 
              sideOffset={5}
              className="max-h-[280px] w-[110px] overflow-y-auto bg-slate-900 border-white/20 text-white shadow-2xl"
              style={{ overflowY: 'auto' }}
            >
              {anios.map((y) => (
                <SelectItem key={y} value={y} className="cursor-pointer">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={mes} onValueChange={(v) => { setMes(v); setCargado(false); setRows([]); }}>
            <SelectTrigger className="w-full sm:w-[120px] bg-white/10 border border-white/20 text-white">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>

            <SelectContent 
              position="popper" 
              side="bottom" 
              sideOffset={5}
              className="max-h-[280px] w-[140px] overflow-y-auto bg-slate-900 border-white/20 text-white shadow-2xl"
              style={{ overflowY: 'auto' }} 
            >
              {mesesVisibles.map((m) => (
                <SelectItem key={m.value} value={m.value} className="cursor-pointer">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => handleCargarFacturas(false)}
            disabled={!periodoCompleto || loading}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Cargando..." : "Cargar DTEs"}
          </Button>
          {/* Botón de Refrescar */}
          <Button
            variant="outline"
            onClick={() => handleCargarFacturas(true)}
            disabled={!periodoCompleto || loading}
            className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </div>

        {rows.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/5"
          >
            {/* Input de Búsqueda Rápida */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                placeholder="Buscar Folio"
                className="w-full pl-10 pr-4 h-10 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-500"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {/* Selector de Filtro por Tipo */}
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full sm:w-[140px] bg-white/5 border border-white/10 text-white">
                <SelectValue placeholder="Filtrar por..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/20 text-white shadow-2xl">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="venta">Solo Ventas</SelectItem>
                <SelectItem value="compra">Solo Compras</SelectItem>
              </SelectContent>
            </Select>

            {/* Contador de registros filtrados */}
            <div className="ml-auto text-xs text-gray-400 italic">
              Mostrando {filteredRows.length} de {rows.length} documentos
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabla con Ordenamiento Interactivo */}
      <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Tipo registro</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Folio</th>
                
                {/* 🎯 Encabezado Fecha Emisión Ordenable */}
                <th 
                  className="px-6 py-4 text-left text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort('fechaEmision')}
                >
                  <div className="flex items-center gap-2">
                    Fecha emisión
                    {sortConfig.key === 'fechaEmision' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-400" /> : <ArrowDown className="h-4 w-4 text-blue-400" />
                    ) : <ArrowUpDown className="h-4 w-4 opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>

                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Monto Neto</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">IVA</th>

                {/* 🎯 Encabezado Monto Total Ordenable */}
                <th 
                  className="px-6 py-4 text-left text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort('monto')}
                >
                  <div className="flex items-center gap-2">
                    Monto Total
                    {sortConfig.key === 'monto' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 text-green-400" /> : <ArrowDown className="h-4 w-4 text-green-400" />
                    ) : <ArrowUpDown className="h-4 w-4 opacity-20 group-hover:opacity-100" />}
                  </div>
                </th>

                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 text-center">Descargar</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {filteredRows.length > 0 ? (
                filteredRows.map((dte, index) => (
                  <motion.tr key={dte.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.03 }} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{dte.tipo ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-white">{dte.folio ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-white">{dte.fechaEmision ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-white">{dte.montoNeto ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-purple-400 font-medium">{dte.iva ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-green-400 font-medium">{dte.monto ?? '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleDescargarFolio(dte)} disabled={downloadingFolio === dte.folio} className="text-green-400 hover:bg-green-500/20">
                        {downloadingFolio === dte.folio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center text-gray-400">
                      <FileWarning className="h-12 w-12 mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold text-white">{cargado ? "No se encontraron documentos" : "Selecciona un período y carga las facturas"}</h3>
                      <p className="text-sm">{cargado ? "Intenta ajustar los filtros o el ordenamiento." : "Luego presiona “Cargar facturas” para ver resultados."}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocumentosDTE;
