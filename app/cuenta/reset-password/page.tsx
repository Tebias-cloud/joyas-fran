'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // 1. SILENCIADOR DE ERRORES PARA "New password should be different"
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const msg = args[0] ? String(args[0]) : "";
      if (msg.includes('different from the old') || msg.includes('AuthApiError')) {
        return; // Silencio total
      }
      originalError(...args);
    };
    return () => { console.error = originalError; };
  }, []);

  // 2. Verificar que hay sesión (enlace válido)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
             router.replace('/login'); // Si no hay sesión, volver al login
             return;
        }
        setCheckingSession(false);
      } catch {
        router.replace('/login');
      }
    };
    checkSession();
  }, [router]);

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (password.length < minLength) return "Mínimo 8 caracteres.";
    if (!hasUpperCase) return "Falta una mayúscula.";
    if (!hasNumber) return "Falta un número.";
    return null;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validaciones Locales
    const errorMsg = validatePassword(passwords.newPassword);
    if (errorMsg) {
        toast.error(errorMsg);
        setLoading(false);
        return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        setLoading(false);
        return;
    }

    // --- MANEJO BLINDADO SIN THROW ---
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      if (error) {
          const msg = error.message;

          if (msg.includes('different from the old') || msg.includes('same as the old')) {
              toast.warning("Por seguridad, la nueva contraseña no puede ser igual a la anterior.");
          } 
          else if (msg.includes('Password should be')) {
              toast.warning("La contraseña es muy débil.");
          }
          else if (msg.includes('Auth session missing') || msg.includes('jwt')) {
              toast.error("El enlace expiró. Solicita uno nuevo.");
              router.replace('/login');
          } 
          else {
              toast.error("No se pudo actualizar la contraseña.");
          }
          // Importante: No lanzamos error, solo retornamos.
          setLoading(false);
          return; 
      }

      // Éxito
      toast.success("¡Contraseña actualizada correctamente!");
      router.replace('/cuenta'); // Ahora sí manda a la cuenta

    } catch (err) {
      // Este catch es solo para errores gravísimos (red, crash del navegador)
      console.warn("Error inesperado:", err);
      toast.error("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-white">
            <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white font-sans text-gray-900">
      <div className="hidden lg:block lg:w-1/2 relative bg-zinc-900 overflow-hidden">
        <Image src="/img/banner-login.webp" alt="Joyas Fran Lifestyle" fill priority className="object-cover opacity-80 grayscale transition-transform duration-[30s] hover:scale-105" sizes="50vw"/>
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-16 text-white">
          <h2 className="font-serif italic text-4xl mb-4">Seguridad y Confianza.</h2>
          <p className="text-white/80 text-sm tracking-widest uppercase">Recupera el acceso a tu colección</p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">
        <div className="max-w-sm w-full mx-auto animate-fade-in">
          <div className="mb-8">
            <Link href="/login" className="text-xs font-bold text-gray-400 hover:text-black flex items-center gap-2 mb-6 uppercase tracking-widest transition-colors"><ArrowLeft className="w-3 h-3"/> Cancelar</Link>
            <h1 className="text-2xl font-serif italic font-bold mb-2">Nueva Contraseña</h1>
            <p className="text-sm text-gray-500">Ingresa una contraseña distinta a la anterior.</p>
          </div>
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Nueva Contraseña</label>
                <div className="relative">
                    <Lock className="w-4 h-4 text-gray-300 absolute left-3 top-3" />
                    <input type={showPassword ? "text" : "password"} value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} className="w-full pl-10 pr-10 p-3 border border-gray-200 rounded-md text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300" placeholder="Mínimo 8 caracteres" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-black transition-colors">{showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                </div>
                <div className="flex gap-3 mt-2">
                    <span className={`text-[10px] flex items-center gap-1 transition-colors duration-300 ${passwords.newPassword.length >= 8 ? 'text-green-600 font-medium' : 'text-gray-300'}`}><CheckCircle className="w-3 h-3"/> 8+ Car</span>
                    <span className={`text-[10px] flex items-center gap-1 transition-colors duration-300 ${/[A-Z]/.test(passwords.newPassword) ? 'text-green-600 font-medium' : 'text-gray-300'}`}><CheckCircle className="w-3 h-3"/> Mayús</span>
                    <span className={`text-[10px] flex items-center gap-1 transition-colors duration-300 ${/[0-9]/.test(passwords.newPassword) ? 'text-green-600 font-medium' : 'text-gray-300'}`}><CheckCircle className="w-3 h-3"/> Núm</span>
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Confirmar Contraseña</label>
                <div className="relative">
                    <Lock className="w-4 h-4 text-gray-300 absolute left-3 top-3" />
                    <input type={showPassword ? "text" : "password"} value={passwords.confirmPassword} onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} className="w-full pl-10 p-3 border border-gray-200 rounded-md text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300" placeholder="Repite tu contraseña"/>
                </div>
            </div>
            <button type="submit" disabled={loading || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword} className="w-full bg-black text-white py-4 rounded-md text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 mt-6 disabled:opacity-50 disabled:cursor-not-allowed group">
                {loading ? <Loader2 className="animate-spin w-4 h-4"/> : 'Actualizar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}