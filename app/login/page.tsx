'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Loader2, Mail, Lock, User, 
  ArrowLeft, ArrowRight, CheckCircle, Chrome, 
  AlertTriangle, MailOpen 
} from 'lucide-react';
import { toast } from 'sonner';

type AuthMode = 'login' | 'register' | 'recovery';

// 1. Renombramos el componente principal a AuthContent
function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/cuenta';

  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  // Silenciador de errores
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (/Invalid login credentials/.test(args[0]) || /AuthApiError/.test(args[0])) return; 
      originalError(...args);
    };
    return () => { console.error = originalError; };
  }, []);

  // Verificar sesión
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace(redirectPath);
    };
    checkUser();
  }, [router, redirectPath]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (password.length < minLength) return "La contraseña debe tener al menos 8 caracteres.";
    if (!hasUpperCase) return "La contraseña debe incluir al menos una mayúscula.";
    if (!hasNumber) return "La contraseña debe incluir al menos un número.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
            toast.error('Correo o contraseña incorrectos.');
            setLoading(false);
            return;
        }
        
        toast.success('¡Bienvenido de vuelta!');
        router.replace(redirectPath);
        router.refresh();
      } 
      else if (mode === 'register') {
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            toast.error("Nombre y Apellido son requeridos");
            setLoading(false);
            return;
        }
        
        const passwordError = validatePassword(formData.password);
        if (passwordError) {
            toast.error(passwordError);
            setLoading(false);
            return;
        }
        
        const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectPath)}`;

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              full_name: `${formData.firstName} ${formData.lastName}`,
            },
            emailRedirectTo: redirectTo,
          },
        });

        if (error) {
            toast.error(error.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                updated_at: new Date().toISOString(),
            });
        }

        if (data.session) {
             router.replace(redirectPath);
             router.refresh();
        } else {
             setPendingVerification(true);
             toast.success('Cuenta creada. Revisa tu correo.');
        }
      }
      else if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/cuenta/reset-password`,
        });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Correo de recuperación enviado.');
            setMode('login');
        }
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectPath)}`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
        toast.error('Error al conectar con Google');
        setGoogleLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="min-h-screen flex bg-white font-sans text-gray-900 items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto shadow-xl shadow-black/10">
            <MailOpen className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif italic font-bold">Verifica tu correo</h1>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Hemos enviado un enlace de confirmación a <span className="font-bold text-black">{formData.email}</span>.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-xs text-gray-600 text-left space-y-2">
            <p className="font-bold text-black flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-600"/> Pasos:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Abre el correo.</li>
              <li>Haz clic en confirmar.</li>
              <li>Serás redirigido automáticamente a la tienda.</li>
            </ol>
          </div>
          <button onClick={() => setPendingVerification(false)} className="text-xs text-gray-400 hover:text-black font-bold underline decoration-gray-300 underline-offset-4">Volver al login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white font-sans text-gray-900">
      <div className="hidden lg:block lg:w-1/2 relative bg-zinc-900 overflow-hidden">
        <Image src="/img/banner-login.webp" alt="Joyas Fran Lifestyle" fill priority className="object-cover opacity-90 transition-transform duration-[30s] hover:scale-110" sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-16 text-white">
          <h2 className="font-serif italic text-5xl mb-6 leading-tight drop-shadow-lg">La elegancia es la única belleza que no se marchita.</h2>
          <p className="text-white/90 text-sm max-w-md tracking-widest uppercase border-l-2 border-white pl-4">Únete a nuestra comunidad exclusiva</p>
        </div>
        <Link href="/" className="absolute top-10 left-10 text-white/70 hover:text-white flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:pl-2 z-10"><ArrowLeft className="w-4 h-4"/> Volver a la tienda</Link>
      </div>
      
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 relative bg-white">
        <div className="lg:hidden absolute top-6 left-6">
            <Link href="/" className="text-gray-400 hover:text-black flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors"><ArrowLeft className="w-4 h-4"/> Volver</Link>
        </div>
        <div className="max-w-sm w-full mx-auto animate-fade-in">
          <div className="mb-10 text-center lg:text-left">
            <span className="font-serif italic text-4xl block mb-3 text-black">Joyas Fran</span>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              {mode === 'login' && 'Bienvenido de nuevo'}
              {mode === 'register' && 'Crear cuenta nueva'}
              {mode === 'recovery' && 'Recuperar acceso'}
            </h1>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {mode === 'login' && 'Ingresa tus credenciales para acceder.'}
              {mode === 'register' && 'Completa tus datos para registrarte.'}
              {mode === 'recovery' && 'Te enviaremos un enlace de recuperación.'}
            </p>
          </div>
          
          {mode !== 'recovery' && (
              <>
                <button onClick={handleGoogleLogin} disabled={googleLoading || loading} className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-3 rounded-md hover:bg-gray-50 transition-all shadow-sm font-medium text-xs uppercase tracking-wider disabled:opacity-50 group mb-6">
                    {googleLoading ? <Loader2 className="animate-spin w-4 h-4"/> : (
                    <>
                        <Chrome className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                        Continuar con Google
                    </>
                    )}
                </button>
                <div className="relative flex items-center mb-6">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink-0 mx-4 text-[9px] text-gray-300 uppercase tracking-widest font-bold">O con tu email</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                </div>
              </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Nombre</label>
                        <div className="relative"><User className="w-4 h-4 text-gray-300 absolute left-3 top-3" /><input name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="Juan" className="w-full pl-10 p-2.5 border border-gray-200 rounded-md text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300"/></div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Apellido</label>
                        <div className="relative"><User className="w-4 h-4 text-gray-300 absolute left-3 top-3" /><input name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Pérez" className="w-full pl-10 p-2.5 border border-gray-200 rounded-md text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300"/></div>
                    </div>
                </div>
            )}
            <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Email</label>
                <div className="relative"><Mail className="w-4 h-4 text-gray-300 absolute left-3 top-3" /><input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="hola@ejemplo.com" className="w-full pl-10 p-2.5 border border-gray-200 rounded-md text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300" /></div>
            </div>
            {mode !== 'recovery' && (
                <div className="space-y-1.5 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Contraseña</label>
                        {mode === 'login' && <button type="button" onClick={() => setMode('recovery')} className="text-[10px] text-gray-400 font-bold hover:text-black underline decoration-gray-300 transition-colors">Recuperar clave</button>}
                    </div>
                    <div className="relative"><Lock className="w-4 h-4 text-gray-300 absolute left-3 top-3" /><input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full pl-10 p-2.5 border border-gray-200 rounded-md text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-gray-300" /></div>
                    {mode === 'register' && <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Mínimo 8 caracteres, mayúscula y número.</p>}
                </div>
            )}
            <button type="submit" disabled={loading || googleLoading} className="w-full bg-black text-white py-3.5 rounded-md text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 mt-6 disabled:opacity-70 disabled:cursor-not-allowed group">
                {loading ? <Loader2 className="animate-spin w-4 h-4"/> : (
                    <> {mode === 'login' ? 'Iniciar Sesión' : mode === 'register' ? 'Registrarme' : 'Enviar Enlace'} {!loading && <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform"/>} </>
                )}
            </button>
            <div className="pt-6 text-center">
                {mode === 'login' && <p className="text-xs text-gray-500">¿Primera vez aquí? <button type="button" onClick={() => setMode('register')} className="text-black font-bold hover:underline">Crear una cuenta</button></p>}
                {mode === 'register' && <p className="text-xs text-gray-500">¿Ya tienes cuenta? <button type="button" onClick={() => setMode('login')} className="text-black font-bold hover:underline">Iniciar Sesión</button></p>}
                {mode === 'recovery' && <button type="button" onClick={() => setMode('login')} className="text-xs font-bold text-gray-500 hover:text-black flex items-center justify-center gap-2 mx-auto uppercase tracking-wider"><ArrowLeft className="w-3 h-3"/> Volver al Login</button>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// 2. Exportamos un componente por defecto que envuelve todo en <Suspense>
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}