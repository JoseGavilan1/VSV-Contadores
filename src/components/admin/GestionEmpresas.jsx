  import React, { useState, useEffect, useRef, useCallback } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { 
    ArrowLeft, Building2, Search, Pencil, Trash2, 
    X, MapPin, Mail, Loader2, Phone, Briefcase, Plus,
    ChevronRight, LayoutDashboard, Shield, Hash, Lock,
    FileText, Activity, Eye, EyeOff
  } from 'lucide-react';
  import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
  import { Button } from '@/components/ui/button';
  import { toast } from '@/components/ui/use-toast';

  import { useNavigate } from 'react-router-dom';

  import EmpresaFormModal from '@/components/admin/modals/EmpresaFormModal.jsx';
  import { useAuth } from '@/hooks/useAuth.jsx';
  import { cleanRut } from '@/lib/rut';
  import {
    getCompaniesApi,
    saveCompanyApi,
    deleteCompanyApi,
    getCompanyByIdApi
  } from '@/services/companyService';

  // Sub-componente para cada tarjeta de empresa en la lista
  const CompanyListCard = ({ company, isSelected, onClick, searchTerm }) => {
    const isRutMatch = searchTerm && cleanRut(company.rut).includes(cleanRut(searchTerm));

    return (
      <motion.div
        layout
        onClick={onClick}
        className={`relative p-5 rounded-[1.8rem] border transition-all duration-300 cursor-pointer flex items-center justify-between group
          ${isSelected 
            ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20' 
            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
          }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`p-3 rounded-xl border transition-colors ${isSelected ? 'bg-blue-600/20 border-blue-500/40' : 'bg-slate-900 border-white/5'}`}>
            <Building2 className={`h-5 w-5 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} />
          </div>

          <div className="min-w-0">
            <h3 className={`text-white font-black text-sm uppercase italic truncate transition-colors ${isSelected ? 'text-blue-400' : ''}`}>
              {company.razonSocial || company.razon_social}
            </h3>
            <p className={`font-mono text-[9px] tracking-widest uppercase mt-0.5 transition-colors ${isRutMatch ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
              {cleanRut(company.rut)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className={`h-2 w-2 rounded-full ${
            (company.activo === true || company.activo === 1 || String(company.activo) === 'true')
              ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' 
              : 'bg-red-500'
          }`} />
          <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'text-blue-400 translate-x-1' : 'text-gray-700'}`} />
        </div>
      </motion.div>
    );
  };

  // Sub-componente para el inspector de detalles en la columna derecha
  const CompanyInspector = ({ company, onEdit, onDelete }) => {
    const [showPass, setShowPass] = useState(false);

    if (!company) return (
      <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-20">
        <LayoutDashboard size={40} className="text-gray-500 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 italic">Seleccione una Entidad</p>
      </div>
    );

    return (
      <motion.div 
        initial={{ opacity: 0, x: 10 }} 
        animate={{ opacity: 1, x: 0 }} 
        key={company.id} 
        className="h-full flex flex-col"
      >
        {/* 1. HEADER: RAZÓN SOCIAL Y ESTADO */}
        <header className="p-6 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-slate-900 rounded-2xl border border-white/10 shadow-xl shrink-0">
                <Building2 size={24} className="text-blue-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-black text-xl uppercase italic tracking-tighter leading-none truncate">
                  {company.razonSocial || company.razon_social}
                </h2>
                <span className="text-[8px] text-gray-500 font-mono font-bold uppercase tracking-[0.2em] mt-2 block">
                  ID: {company.id?.split('-')[0] || '---'}
                </span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest ${
              company.activo ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}>
              {company.activo ? 'Activo' : 'Inactivo'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* 2. SECCIÓN: CREDENCIALES SII */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Shield size={12} className="text-amber-500" />
              <p className="text-[9px] uppercase font-black text-gray-600 tracking-[0.3em]">Credenciales SII</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DataField label="RUT EMPRESA" value={company.siiRut || company.sii_rut} icon={Hash} />
              <div className="relative group">
                <DataField 
                  label="Clave SII"
                  value={showPass ? (company.siiClave || company.sii_clave || company.sii_password || company.sii_password_encrypted || company.siiPassword) : '••••••••••••'}
                  icon={Lock}
                />
                <button 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-blue-400 transition-colors z-20 bg-slate-900/50 rounded-lg backdrop-blur-sm"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </section>

          {/* 3. SECCIÓN: DATOS CORPORATIVOS */}
          <section className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <DataField label="Giro" value={company.giro} icon={FileText} />
              <div className="grid grid-cols-2 gap-2">
                <DataField label="RUT Empresa" value={cleanRut(company.rut)} icon={Hash} />
                <DataField label="Régimen" value={company.regimenTributario || company.regimen_tributario} icon={Activity} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DataField label="Teléfono" value={company.telefonoCorporativo || company.telefono_corporativo} icon={Phone} />
                <DataField label="Email" value={company.emailCorporativo || company.email_corporativo} icon={Mail} />
              </div>
            </div>

            {/* REPRESENTANTE LEGAL */}
            <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <p className="text-[7px] font-black text-blue-500/40 uppercase tracking-widest mb-3">Representante Legal</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-gray-600 uppercase">Nombre</span>
                  <span className="text-[10px] text-gray-300 font-bold uppercase">
                    {company.nombreRep || company.nombre_rep || 'Sin Registro'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-gray-600 uppercase">RUT Rep.</span>
                  <span className="text-[10px] text-gray-300 font-mono font-bold">
                    {company.rutRep || company.rut_rep || '---'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 4. SECCIÓN: UBICACIÓN */}
          <section className="space-y-3 pb-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <MapPin size={12} className="text-emerald-500" />
              <p className="text-[9px] uppercase font-black text-gray-600 tracking-[0.3em]">Ubicación Matriz</p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] transition-all">
              <p className="text-[10px] text-gray-300 font-bold uppercase truncate">{company.direccion || 'Dirección no registrada'}</p>
              <p className="text-[8px] text-gray-500 font-black uppercase mt-1">
                {company.comuna || '---'}, {company.ciudad || '---'}
              </p>
            </div>
          </section>
        </div>

        {/* 5. ACCIONES */}
        <footer className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md">
          <div className="flex gap-3">
            <Button 
                variant="ghost" 
                onClick={() => onDelete(company)} 
                className="bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white h-12 w-12 rounded-xl border border-red-500/10 transition-all active:scale-95"
            >
                <Trash2 size={18} />
            </Button>
            <Button 
                onClick={() => onEdit(company)} 
                className="flex-1 bg-blue-600 hover:bg-blue-500 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
            >
                Editar Expediente
            </Button>
          </div>
        </footer>
      </motion.div>
    );
  };

  // Sub-componente para limpiar el código
  const DataField = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
      <Icon size={14} className="text-blue-400 shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest">{label}</span>
        <span className="text-[10px] text-gray-300 font-bold uppercase truncate">{value || '---'}</span>
      </div>
    </div>
  );

  // Componente principal de gestión de empresas
  const GestionEmpresas = () => {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [selectedCompany, setSelectedCompany] = useState(null); // Para el Modal de edición
    const [companyInView, setCompanyInView] = useState(null);    // Para el Visor (Inspector) derecho
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState(null);
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    const searchInputRef = useRef(null);
    const observer = useRef();

    useEffect(() => {
      const handler = setTimeout(() => {
        const trimmed = searchTerm.trim();
        if (!trimmed) {
          setDebouncedSearchTerm("");
          return;
        }

        const esNombre = /[a-jL-Z]/i.test(trimmed);
        setDebouncedSearchTerm(esNombre ? trimmed : cleanRut(trimmed));
      }, 400);
      return () => clearTimeout(handler);
    }, [searchTerm]);

    const {
      data,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading: initialLoading
    } = useInfiniteQuery({ // Utilizado para el scroll infinito
      queryKey: ['companies', debouncedSearchTerm],
      queryFn: async ({ pageParam = 0 }) => {
        const res = await getCompaniesApi(user?.sessionId, {
          page: pageParam,
          limit: 10,
          search: debouncedSearchTerm
        });

        if (res.status === 401) {
          logout();
          throw new Error("Sesión caducada");
        }

        if (!res.ok) throw new Error('Fallo de enlace con el búnker');
        return res.json();
      },
      getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
      initialPageParam: 0,
      enabled: !!user?.sessionId,
    });

    // Utilizado para inicializar y evitar errores en el renderizado del scroll infinito
    const allCompanies = data?.pages.flatMap(page => page.companies) || [];
      console.log("data", data);
      const lastCompanyRef = useCallback(node => {
      if (initialLoading || isFetchingNextPage) return;
      
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      }, { 
        rootMargin: '200px',
        threshold: 0.1 
      });

      if (node) observer.current.observe(node);
    }, [initialLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

    // Funcion para manejar la selección de una empresa y cargar sus detalles en el inspector derecho
    const handleSelectCompany = async (company) => {
      try {
        setIsLoadingDetail(true);
        const res = await getCompanyByIdApi(company.id, user.sessionId);
        if (!res.ok) throw new Error("Error de enlace");
        const fullData = await res.json();
        setCompanyInView(fullData); 
      } catch (err) {
        toast({ variant: "destructive", title: "Fallo de Carga", description: "No se pudo sincronizar el expediente." });
      } finally {
        setIsLoadingDetail(false);
      }
    };

    // Funcion para manejar la edición
    const handleEdit = async (company) => {
      try {
        const res = await getCompanyByIdApi(company.id, user.sessionId);
        if (!res.ok) throw new Error("No se pudo extraer el expediente completo");
        const fullData = await res.json();
        setSelectedCompany(fullData);
        setIsModalOpen(true);
      } catch (err) {
        toast({ variant: "destructive", title: "Error de Acceso", description: err.message });
      }
    };

    // Funcion para manejar el guardado
    const handleSave = async (formData) => {
      try {
        const res = await saveCompanyApi(formData, user.sessionId);
        if (res.ok) {
          toast({ title: "✅ Sincronización Exitosa", description: "Registros actualizados." });
          if (companyInView?.id === formData.id) {
            setCompanyInView({ ...companyInView, ...formData });
          }
          queryClient.invalidateQueries({ queryKey: ['companies'] });
          setIsModalOpen(false);
        } else {
          const error = await res.json();
          throw new Error(error.message || "Error en la operación");
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Fallo de Integridad", description: err.message });
      }
    };

    // Funcion para manejar la eliminación
    const handleConfirmDelete = async () => {
      if (confirmText !== "ELIMINAR" || isDeleting) return;
      setIsDeleting(true);
      try {
        const res = await deleteCompanyApi(companyToDelete.id, user.sessionId);
        if (res.ok) {
          toast({ title: "🗑️ Purgado Completado", description: "Entidad eliminada." });
          if (companyInView?.id === companyToDelete.id) {
            setCompanyInView(null);
          }
          queryClient.invalidateQueries({ queryKey: ['companies'] });
          setDeleteConfirmOpen(false);
        } else {
          throw new Error("El búnker denegó la eliminación.");
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error Crítico", description: e.message });
      } finally { setIsDeleting(false); }
    };

    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <header className="p-6 lg:px-0 lg:p-6 lg:pt-2 shrink-0">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto px-6">
            <div className="flex items-center gap-8">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/admin')} 
                className="text-white hover:bg-white/10 h-14 w-14 bg-white/5 border border-white/10 rounded-[1.5rem] transition-all"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div className="hidden sm:block">
                <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Gestión Empresas</h1>
                <p className="text-gray-500 text-[9px] uppercase tracking-[0.5em] font-black mt-2">Consola de Control Corporativo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* BARRA DE BÚSQUEDA */}
              <div className="flex items-center relative">
                <motion.div
                  animate={{ width: isSearchOpen ? '300px' : '48px' }}
                  className="h-12 border rounded-2xl flex items-center overflow-hidden bg-black/60 border-white/10 backdrop-blur-xl"
                >
                  <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="w-12 h-12 flex items-center justify-center shrink-0">
                    {isSearchOpen ? <X className="h-4 w-4 text-blue-500" /> : <Search className="h-4 w-4 text-gray-400" />}
                  </button>
                  <input 
                    ref={searchInputRef}
                    type="text"
                    placeholder="BUSCAR RAZÓN O RUT..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent border-none text-white text-[10px] outline-none uppercase font-black pr-4 tracking-widest"
                  />
                </motion.div>
              </div>
              <Button 
                onClick={() => { setSelectedCompany(null); setIsModalOpen(true); }} 
                className="h-12 w-12 bg-blue-600 hover:bg-blue-500 rounded-2xl shrink-0 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* 2. DOBLE COLUMNA */}
        <main className="flex-1 flex overflow-hidden max-w-[1600px] w-full mx-auto px-6 pb-10 gap-8">
          
          {/* COLUMNA IZQUIERDA: LISTADO DE EMPRESAS */}
          <div className="w-full max-w-[420px] flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
            {initialLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                <Loader2 className="h-10 w-10 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Búnker...</span>
              </div>
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  {allCompanies.map((c) => (
                    <CompanyListCard 
                      key={c.id} 
                      company={c} 
                      isSelected={companyInView?.id === c.id} 
                      onClick={() => handleSelectCompany(c)} 
                      searchTerm={searchTerm} 
                    />
                  ))}
                </AnimatePresence>

                {/* Empty State de Búsqueda */}
                {allCompanies.length === 0 && (
                  <div className="py-20 text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">
                    Sin registros localizados
                  </div>
                )}

                {/* Scroll Infinito */}
                {isFetchingNextPage && (
                  <div className="flex flex-col items-center gap-2 py-6 opacity-50">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                      Cargando más entidades...
                    </span>
                  </div>
                )}
              </>
            )}
            <div ref={lastCompanyRef} className="h-20 shrink-0" />
          </div>

          {/* COLUMNA DERECHA: INSPECTOR */}
          <div className="hidden md:block flex-1 bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden relative shadow-inner">
            {isLoadingDetail && (
              <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/50">Sincronizando Expediente...</span>
              </div>
            )}
            
            <CompanyInspector 
                company={companyInView} 
                onEdit={handleEdit} 
                onDelete={(c) => { setCompanyToDelete(c); setConfirmText(""); setDeleteConfirmOpen(true); }} 
            />
          </div>
        </main>

        {/* 3. MODALES */}
        <EmpresaFormModal
          isOpen={isModalOpen}
          setIsOpen={setIsModalOpen}
          onSave={handleSave}
          initialData={selectedCompany}
        />

        <AnimatePresence>
          {deleteConfirmOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0a0a0c] border border-white/10 rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
                <Trash2 className="h-16 w-16 text-red-600 mx-auto mb-6" />
                <h2 className="text-white font-black text-xl uppercase italic mb-2 tracking-tighter">¿Purgar Entidad?</h2>
                <p className="text-gray-500 text-[10px] uppercase mb-8 tracking-[0.2em] font-bold">{companyToDelete?.razonSocial}</p>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="ELIMINAR"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-white text-xs mb-8 outline-none focus:border-red-600 font-black tracking-[0.3em] transition-all"
                />

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)} className="flex-1 text-gray-500 uppercase font-black text-[10px] tracking-widest h-14 rounded-2xl">Abortar</Button>
                  <Button
                    onClick={handleConfirmDelete}
                    disabled={confirmText !== "ELIMINAR" || isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white uppercase font-black text-[10px] tracking-widest h-14 rounded-2xl shadow-lg shadow-red-900/40"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" /> : 'Confirmar'}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  export default GestionEmpresas;