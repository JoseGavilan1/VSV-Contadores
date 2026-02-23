import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  Fingerprint, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { cleanRut, validateRut } from '@/lib/rut';

const RegisterPage = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    email: '',
    clave: '',
    confirmClave: '',
    rol: 'Cliente'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === 'rut') {
      const formatted = cleanRut(value);
      if (formatted.replace(/-/g, '').length <= 9) {
        setFormData({ ...formData, [id]: formatted });
      }
    } else {
      setFormData({ ...formData, [id]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { nombre, rut, email, clave, confirmClave, rol } = formData;

    // Validaciones básicas
    if (!validateRut(rut)) {
      toast({ 
        title: "Identidad Inválida", 
        description: "El RUT ingresado no es válido.", 
        variant: "destructive" 
      });
      return;
    }

    if (clave.length < 8) {
      toast({ 
        title: "Seguridad", 
        description: "La clave debe tener al menos 8 caracteres.", 
        variant: "destructive" 
      });
      return;
    }

    if (clave !== confirmClave) {
      toast({ 
        title: "Error", 
        description: "Las contraseñas no coinciden.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await onRegister({ 
        nombre: nombre.trim(), 
        rut: rut, 
        email: email.toLowerCase().trim(),
        clave, 
        rol 
      });
      
      if (result.success) {
        toast({
          title: "¡Registro Exitoso!",
          description: "Tu cuenta personal ha sido creada correctamente.",
          className: "bg-emerald-500 border-none text-white", 
        });
        navigate('/login');
      } else {
        toast({
          title: "Fallo de Registro",
          description: result.message || "No se pudo crear el perfil.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error de Conexión",
        description: "Hubo un problema al conectar con el servidor.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Registro de Usuario - VSV Pro</title>
      </Helmet>
      
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] p-4 font-sans relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/15 blur-[120px] rounded-full" />

        <div className="w-full max-w-lg relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl"
          >
            <div className="flex flex-col items-center mb-8">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20"
              >
                <UserPlus className="h-9 w-9 text-white" />
              </motion.div>
              <h1 className="text-4xl font-black text-white text-center tracking-tighter uppercase italic leading-none">
                CREAR <span className="text-blue-400 text-3xl">CUENTA</span>
              </h1>
              <p className="text-gray-300 text-[10px] font-bold uppercase tracking-[0.4em] mt-3">Registro de Usuario Individual</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* CAMPO NOMBRE */}
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-xs font-bold text-gray-300 uppercase ml-1 tracking-wider">Nombre Completo</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  <Input 
                    id="nombre" 
                    type="text" 
                    placeholder="Ej: Juan Pérez" 
                    value={formData.nombre} 
                    onChange={handleChange} 
                    className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-blue-500/50 transition-all" 
                    required 
                  />
                </div>
              </div>

              {/* CAMPO RUT */}
              <div className="space-y-2">
                <Label htmlFor="rut" className="text-xs font-bold text-gray-300 uppercase ml-1 tracking-wider">RUT Personal</Label>
                <div className="relative group">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  <Input 
                    id="rut" 
                    type="text" 
                    placeholder="12.345.678-9" 
                    value={formData.rut} 
                    onChange={handleChange} 
                    className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12 rounded-xl font-mono uppercase focus:border-blue-500/50 transition-all" 
                    required 
                  />
                </div>
              </div>

              {/* CAMPO EMAIL */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-gray-300 uppercase ml-1 tracking-wider">Correo Electrónico</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="ejemplo@vsv.cl" 
                    value={formData.email} 
                    onChange={handleChange} 
                    className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-blue-500/50 transition-all" 
                    required 
                  />
                </div>
              </div>

              {/* CAMPO CONTRASEÑA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clave" className="text-xs font-bold text-gray-300 uppercase ml-1 tracking-wider">Contraseña</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                    <Input 
                      id="clave" 
                      type={showPassword ? 'text' : 'password'} 
                      value={formData.clave} 
                      onChange={handleChange} 
                      className="pl-11 pr-10 bg-white/5 border-white/10 text-white h-11 rounded-xl text-sm focus:border-blue-500/50" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmClave" className="text-xs font-bold text-gray-300 uppercase ml-1 tracking-wider">Verificar</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                    <Input 
                      id="confirmClave" 
                      type={showPassword ? 'text' : 'password'} 
                      value={formData.confirmClave} 
                      onChange={handleChange} 
                      className="pl-11 bg-white/5 border-white/10 text-white h-11 rounded-xl text-sm focus:border-blue-500/50" 
                      required 
                    />
                  </div>
                </div>
              </div>

              <motion.div whileTap={{ scale: 0.98 }} className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-bold uppercase text-sm tracking-widest shadow-lg shadow-blue-900/30 transition-all active:scale-95" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Validando Datos...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Registrar Usuario</span>
                      <ArrowRight size={18} />
                    </div>
                  )}
                </Button>
              </motion.div>
            </form>

            <div className="text-center mt-10">
              <p className="text-gray-400 text-xs font-medium">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-bold underline underline-offset-4">
                  Inicia Sesión aquí
                </Link>
              </p>
            </div>
          </motion.div>
          
          <div className="mt-8 flex items-center justify-center gap-4 text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em]">
             <span>VSV IDENTITY</span>
             <div className="w-1 h-1 bg-gray-700 rounded-full" />
             <span>PERSONAL ACCOUNT</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;