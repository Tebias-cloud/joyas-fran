'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Package, Truck, ChevronDown, ChevronUp, Loader2, 
  LogOut, User as UserIcon, Save, MapPin, Clock, CheckCircle,
  Store, Tag // Importamos iconos nuevos
} from 'lucide-react';
import { toast } from 'sonner';
import { REGIONES_Y_COMUNAS } from '@/lib/chile-data';

// --- TIPOS ---
interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  apartment?: string;
  region?: string;
  city?: string;      
  rut?: string;
}

// Actualizamos ShippingInfo para incluir el método
interface ShippingInfo {
  firstName?: string;
  lastName?: string;
  address?: string;
  addressDetails?: string; 
  apartment?: string;
  city?: string;
  region?: string;
  phone?: string;
  rut?: string;
  shipping_method?: 'pickup' | 'shipping'; // Nuevo campo
}

// Nueva interfaz para el descuento
interface DiscountInfo {
  code: string;
  type: string;
  value: number;
  amount: number;
}

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  selectedSize: string;
}

interface DatabaseOrder {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  items: OrderItem[];
  shipping_info: ShippingInfo;
  discount_info?: DiscountInfo; // Agregamos info de descuento
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  items: OrderItem[];
  shipping_info: ShippingInfo;
  discount_info?: DiscountInfo;
}

interface RegionData {
  region: string;
  comunas: string[];
}

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
  
  const [user, setUser] = useState<UserProfile | null>(null);
  
  const [profileForm, setProfileForm] = useState<UserProfile>({ 
    id: '', first_name: '', last_name: '', rut: '', phone: '', 
    address: '', apartment: '', region: '', city: '' 
  });
  
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<DatabaseOrder[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const regionData = REGIONES_Y_COMUNAS.find((r: RegionData) => r.region === profileForm.region);
  const comunasDisponibles: string[] = regionData ? regionData.comunas : [];

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) { 
        router.replace('/login'); 
        return; 
      }

      // 1. Obtener Perfil
      let userData: UserProfile = {
          id: session.user.id,
          email: session.user.email
      };

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle(); 
      
      if (profile) {
        userData = { 
            ...userData, 
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone || '',
            address: profile.address || '',
            apartment: profile.apartment || '', 
            region: profile.region || '',
            city: profile.city || '',
            rut: profile.rut || ''
        };
      }
      setUser(userData);
      setProfileForm(userData);

      // 2. Obtener Pedidos (Incluyendo discount_info)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData as DatabaseOrder[]);
      }
      setLoading(false);
    };
    getData();
  }, [router]);

  const handleLogout = async () => { 
      await supabase.auth.signOut(); 
      router.replace('/login'); 
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setSaving(true);

      const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          phone: profileForm.phone,
          address: profileForm.address,
          apartment: profileForm.apartment,
          city: profileForm.city,
          region: profileForm.region,
          rut: profileForm.rut,
          updated_at: new Date().toISOString()
      });

      if (error) {
          console.error(error);
          toast.error("Error al guardar perfil");
      } else {
          toast.success("Perfil actualizado correctamente");
          setUser(profileForm);
      }
      setSaving(false);
  };

  const getStatusBadge = (status: string) => {
      const s = status ? status.toLowerCase() : '';
      if (s === 'pagado') return <span className="flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"><CheckCircle className="w-3 h-3"/> Pagado</span>;
      if (s === 'enviado') return <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"><Truck className="w-3 h-3"/> Enviado</span>;
      if (s === 'entregado') return <span className="flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"><Package className="w-3 h-3"/> Entregado</span>;
      return <span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"><Clock className="w-3 h-3"/> {status || 'Pendiente'}</span>;
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setProfileForm({ 
          ...profileForm, 
          region: e.target.value, 
          city: '' 
      });
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin w-8 h-8 text-gray-300"/></div>;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
      <Header />
      
      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-12">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-gray-100 pb-8 gap-4">
            <div>
                <h1 className="text-3xl font-serif italic text-black">Hola, {user?.first_name || 'Cliente'}</h1>
                <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="group text-xs font-bold text-red-500 border border-red-100 px-5 py-2.5 rounded-sm hover:bg-red-50 transition-colors flex items-center gap-2">
                <LogOut className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform"/> Cerrar Sesión
            </button>
        </div>

        {/* Tabs Móvil */}
        <div className="flex lg:hidden gap-2 mb-8 border-b border-gray-100 pb-1 overflow-x-auto">
            <button onClick={() => setActiveTab('orders')} className={`pb-3 px-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>
                Mis Pedidos
            </button>
            <button onClick={() => setActiveTab('profile')} className={`pb-3 px-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>
                Mi Perfil
            </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
            
            {/* Sidebar */}
            <div className="hidden lg:block lg:col-span-3 space-y-1">
                <button onClick={() => setActiveTab('orders')} className={`w-full text-left p-3 rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'orders' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Package className="w-4 h-4"/> Mis Pedidos
                </button>
                <button onClick={() => setActiveTab('profile')} className={`w-full text-left p-3 rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'profile' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <UserIcon className="w-4 h-4"/> Mi Perfil
                </button>
            </div>

            {/* Contenido */}
            <div className="lg:col-span-9">
                
                {/* --- MIS PEDIDOS --- */}
                {activeTab === 'orders' && (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="font-medium text-lg mb-6 flex items-center gap-2"><Package className="w-5 h-5"/> Historial de Compras</h2>
                        
                        {orders.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Package className="w-8 h-8 text-gray-300"/>
                                </div>
                                <p className="text-gray-500 text-sm font-medium">Aún no has realizado ninguna compra.</p>
                                <Link href="/catalogo" className="text-xs font-bold bg-black text-white px-6 py-3 rounded-sm mt-4 inline-block hover:bg-zinc-800 transition-colors uppercase tracking-widest">
                                    Ir a la Tienda
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => (
                                    <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow duration-200">
                                        <div 
                                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} 
                                            className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-gray-50/50 transition-colors gap-4"
                                        >
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-3 mb-1">
                                                    <span className="font-mono text-sm text-gray-500">#{order.id.slice(0,8).toUpperCase()}</span>
                                                    {getStatusBadge(order.status)}
                                                    
                                                    {/* INDICADOR DE MÉTODO DE ENVÍO EN LA LISTA */}
                                                    {order.shipping_info?.shipping_method === 'pickup' ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full">
                                                            <Store className="w-3 h-3"/> Retiro
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-0.5 rounded-full">
                                                            <Truck className="w-3 h-3"/> Despacho
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 capitalize flex items-center gap-1">
                                                    <Clock className="w-3 h-3"/> {new Date(order.created_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                                <div className="text-right">
                                                    {/* MOSTRAR DESCUENTO SI EXISTE */}
                                                    {order.discount_info && (
                                                        <div className="mb-1">
                                                            <p className="text-[9px] font-bold text-green-600 uppercase tracking-wider flex items-center justify-end gap-1">
                                                                <Tag className="w-3 h-3"/> {order.discount_info.code}
                                                            </p>
                                                            <p className="text-xs font-bold text-green-600">
                                                                -${order.discount_info.amount.toLocaleString('es-CL')}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
                                                    <p className="font-serif italic font-bold text-lg">${order.total_amount.toLocaleString('es-CL')}</p>
                                                </div>
                                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`}/>
                                            </div>
                                        </div>

                                        {expandedOrder === order.id && (
                                            <div className="border-t border-gray-100 bg-gray-50/30 p-6 animate-fade-in">
                                                <div className="grid md:grid-cols-2 gap-10">
                                                    <div>
                                                        <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2"><Package className="w-3 h-3"/> Productos</h3>
                                                        <div className="space-y-3">
                                                            {order.items.map((item, i) => (
                                                                <div key={i} className="flex gap-4 bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                                                                    <div className="w-14 h-14 relative bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-100">
                                                                        <Image src={item.image_url} alt="" fill className="object-cover"/>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-bold truncate">{item.name}</p>
                                                                        <p className="text-[10px] text-gray-500 uppercase font-medium mt-0.5">Talla: {item.selectedSize} • Cant: {item.quantity}</p>
                                                                        <p className="text-sm font-medium text-gray-900 mt-1">${(item.price * item.quantity).toLocaleString('es-CL')}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2">
                                                            {/* Cambia el título según el método */}
                                                            {order.shipping_info?.shipping_method === 'pickup' 
                                                                ? <><Store className="w-3 h-3"/> Retiro en Tienda</> 
                                                                : <><MapPin className="w-3 h-3"/> Datos de Envío</>
                                                            }
                                                        </h3>
                                                        <div className="bg-white p-5 rounded-md border border-gray-100 text-sm space-y-3 shadow-sm">
                                                            <div>
                                                                <p className="font-bold text-gray-900">{order.shipping_info?.firstName} {order.shipping_info?.lastName}</p>
                                                                
                                                                {/* Si es despacho, mostramos dirección completa */}
                                                                {order.shipping_info?.shipping_method !== 'pickup' && (
                                                                    <>
                                                                        <p className="text-gray-600">{order.shipping_info?.address}</p>
                                                                        {(order.shipping_info?.addressDetails || order.shipping_info?.apartment) && (
                                                                            <p className="text-gray-500 text-xs">
                                                                                Depto/Block: {order.shipping_info.addressDetails || order.shipping_info.apartment}
                                                                            </p>
                                                                        )}
                                                                        <p className="text-gray-600">{order.shipping_info?.city}, {order.shipping_info?.region}</p>
                                                                    </>
                                                                )}

                                                                {/* Si es retiro, mostramos mensaje */}
                                                                {order.shipping_info?.shipping_method === 'pickup' && (
                                                                    <p className="text-blue-600 text-xs font-medium bg-blue-50 p-2 rounded-sm mt-1">
                                                                        El cliente retirará en la tienda de Iquique.
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-4">
                                                                <div><p className="text-[10px] text-gray-400 uppercase font-bold">Teléfono</p><p className="text-xs font-medium">{order.shipping_info?.phone || '--'}</p></div>
                                                                <div><p className="text-[10px] text-gray-400 uppercase font-bold">RUT</p><p className="text-xs font-medium">{order.shipping_info?.rut || '--'}</p></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- MI PERFIL --- */}
                {activeTab === 'profile' && (
                    <div className="animate-fade-in">
                        <h2 className="font-medium text-lg mb-6 flex items-center gap-2"><UserIcon className="w-5 h-5"/> Mis Datos Personales</h2>
                        <form onSubmit={handleSaveProfile} className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm space-y-8">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Nombre</label>
                                    <input type="text" value={profileForm.first_name || ''} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-sm text-sm outline-none focus:border-black transition-colors"/>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Apellido</label>
                                    <input type="text" value={profileForm.last_name || ''} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-sm text-sm outline-none focus:border-black transition-colors"/>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">RUT</label>
                                    <input type="text" value={profileForm.rut || ''} onChange={e => setProfileForm({...profileForm, rut: e.target.value})} className="w-full p-3 border border-gray-200 rounded-sm text-sm outline-none focus:border-black transition-colors"/>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Teléfono</label>
                                    <input type="text" value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-sm text-sm outline-none focus:border-black transition-colors"/>
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Dirección</label>
                                    <input type="text" value={profileForm.address || ''} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="w-full p-3 border border-gray-200 rounded-sm text-sm outline-none focus:border-black transition-colors"/>
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Depto / Block / Detalle</label>
                                    <input 
                                        type="text" 
                                        value={profileForm.apartment || ''} 
                                        onChange={e => setProfileForm({...profileForm, apartment: e.target.value})} 
                                        className="w-full p-3 border border-gray-200 rounded-sm text-sm outline-none focus:border-black transition-colors bg-gray-50/50 focus:bg-white"
                                        placeholder="Ej: Depto 304"
                                    />
                                </div>
                                
                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Región</label>
                                    <div className="relative">
                                        <select value={profileForm.region || ''} onChange={handleRegionChange} className="w-full p-3 border border-gray-200 rounded-sm text-sm outline-none focus:border-black transition-colors appearance-none cursor-pointer">
                                            <option value="">Selecciona Región</option>
                                            {REGIONES_Y_COMUNAS.map(r => (
                                                <option key={r.region} value={r.region}>{r.region}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                                    </div>
                                </div>

                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Comuna</label>
                                    <div className="relative">
                                        <select value={profileForm.city || ''} onChange={e => setProfileForm({...profileForm, city: e.target.value})} disabled={!profileForm.region} className="w-full p-3 border border-gray-200 rounded-sm text-sm outline-none focus:border-black transition-colors appearance-none cursor-pointer disabled:bg-gray-100">
                                            <option value="">Selecciona Comuna</option>
                                            {comunasDisponibles.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end">
                                <button type="submit" disabled={saving} className="bg-black text-white px-8 py-3.5 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-black/10">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}