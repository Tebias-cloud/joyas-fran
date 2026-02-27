'use client';

import { useEffect, useState, KeyboardEvent, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { 
  X, Plus, Edit, Trash2, Clock, Eye, Settings, 
  Package, ShoppingBag, Search, AlertTriangle, 
  Mail, Phone, MapPin, Copy, User, Truck, Store, Tag, UploadCloud
} from 'lucide-react';
import { toast } from 'sonner';

// --- 1. DEFINICIONES DE TIPOS ESTRICTOS ---
const ADMIN_EMAIL = 'esteban.contacto14@gmail.com';

type TabView = 'resumen' | 'pedidos' | 'productos' | 'config';
type OrderStatus = 'Pagado' | 'Preparando' | 'Enviado' | 'Entregado';

type SizeMap = Record<string, string[]>;
type SettingValue = string[] | SizeMap; 

interface StoreSettingRow {
  key: string;
  value: SettingValue;
}

interface Inventory { [size: string]: number; }

interface OrderItem {
  id: string; 
  name: string; 
  quantity: number;
  selectedSize: string; 
  price: number; 
  image_url: string;
}

interface DBShippingInfo {
  firstName: string; 
  lastName: string; 
  phone: string;
  address: string; 
  addressDetails?: string; 
  apartment?: string;      
  region: string; 
  city: string; 
  rut?: string;
  email?: string;
  shipping_method?: 'pickup' | 'shipping'; 
}

interface DiscountInfo {
  code: string;
  type: string;
  value: number;
  amount: number;
}

interface Order {
  id: string; 
  created_at: string; 
  user_id: string;
  total_amount: number; 
  status: OrderStatus; 
  items: OrderItem[]; 
  shipping_info: DBShippingInfo;
  discount_info?: DiscountInfo;
  email?: string; 
}

interface Product {
  id: string; 
  name: string; 
  price: number; 
  stock: number;
  category: string; 
  image_url: string; 
  images: string[];
  slug: string; 
  inventory: Inventory; 
  compare_at_price: number | null;
}

interface ProductForm {
  name: string;
  price: string;
  compare_at_price: string;
  category: string;
  inventory: Inventory;
  images: string[];
}

// --- UTILIDAD: CONVERTIR A WEBP ---
const convertToWebp = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob failed'));
        }, 'image/webp', 0.8);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- COMPONENTE GUÍA POR PESTAÑA ---
const TabHeader = ({ title, description }: { title: string, description: string }) => (
  <div className="mb-6 animate-fade-in border-b border-gray-100 pb-4">
    <h2 className="text-2xl font-serif italic text-gray-900 mb-1">{title}</h2>
    <p className="text-sm text-gray-500 font-light">{description}</p>
  </div>
);

export default function AdminPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('resumen');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sizeConfig, setSizeConfig] = useState<Record<string, string[]>>({});
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [isUploadingImgs, setIsUploadingImgs] = useState(false); 
  const [formData, setFormData] = useState<ProductForm>({
    name: '', price: '', compare_at_price: '', category: '',
    inventory: {}, images: []
  });

  const [newCategory, setNewCategory] = useState('');
  const [selectedCatForSizes, setSelectedCatForSizes] = useState('');
  const [newSize, setNewSize] = useState('');

  // --- LÓGICA DE DATOS ---
  const fetchData = async () => {
    try {
      const [ordersRes, productsRes, settingsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('store_settings').select('*')
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (productsRes.data) setProducts(productsRes.data as Product[]);
      
      if (settingsRes.data) {
        const newSizeConfig: Record<string, string[]> = {};
        let newCategories: string[] = [];
        
        const settings = settingsRes.data as StoreSettingRow[];

        settings.forEach((item) => {
          if (item.key === 'categories') {
            if (Array.isArray(item.value)) newCategories = item.value as string[];
          }
          if (item.key === 'sizes') {
            if (typeof item.value === 'object' && !Array.isArray(item.value)) {
              Object.assign(newSizeConfig, item.value);
            }
          }
        });
        setCategories(newCategories);
        setSizeConfig(newSizeConfig);
      }
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) { 
        router.replace('/'); 
        return; 
      }
      await fetchData();
    };
    init();
  }, [router]);

  // --- BÚSQUEDA ---
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const lower = searchTerm.toLowerCase();
    return orders.filter(o => 
      o.id.toLowerCase().includes(lower) || 
      o.shipping_info.firstName?.toLowerCase().includes(lower) ||
      o.shipping_info.lastName?.toLowerCase().includes(lower) ||
      o.shipping_info.email?.toLowerCase().includes(lower) || 
      o.email?.toLowerCase().includes(lower) ||
      o.status.toLowerCase().includes(lower)
    );
  }, [orders, searchTerm]);

  // --- ACCIONES DE IMÁGENES ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploadingImgs(true);
    const files = Array.from(e.target.files);
    const uploadedUrls: string[] = [];

    toast.loading(`Optimizando y subiendo ${files.length} imagen(es)...`, { id: 'uploadToast' });

    try {
      for (const file of files) {
        const webpBlob = await convertToWebp(file);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;
        
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, webpBlob, { contentType: 'image/webp', cacheControl: '3600' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }

      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast.success('¡Imágenes subidas con éxito!', { id: 'uploadToast' });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Ocurrió un error al subir las imágenes.', { id: 'uploadToast' });
    } finally {
      setIsUploadingImgs(false);
      e.target.value = ''; 
    }
  };

  // --- OTRAS ACCIONES ---
  const copyToClipboard = (text: string | undefined, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const saveSettings = async (key: string, value: SettingValue) => {
    const { error } = await supabase.from('store_settings').upsert({ key, value }, { onConflict: 'key' });
    if (!error) { toast.success('Configuración actualizada'); await fetchData(); }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const previousOrders = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: newStatus });

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    
    if (error) {
      setOrders(previousOrders); 
      toast.error('Error al actualizar estado');
    } else {
      toast.success(`Pedido marcado como ${newStatus}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return toast.error("Nombre y precio obligatorios");
    if (formData.images.length === 0) return toast.error("Debes incluir al menos 1 imagen");

    const finalStock = Object.values(formData.inventory).reduce((a, b) => a + (Number(b) || 0), 0);

    const payload = {
      name: formData.name,
      price: Number(formData.price),
      compare_at_price: formData.compare_at_price ? Number(formData.compare_at_price) : null,
      category: formData.category,
      image_url: formData.images[0] || '',
      slug: formData.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      stock: finalStock,
      inventory: formData.inventory,
      images: formData.images
    };

    const { error } = editingId 
      ? await supabase.from('products').update(payload).eq('id', editingId) 
      : await supabase.from('products').insert(payload);

    if (!error) {
      toast.success(editingId ? 'Producto actualizado' : 'Producto creado');
      setEditingId(null);
      setFormData({ name: '', price: '', compare_at_price: '', category: '', inventory: {}, images: [] });
      await fetchData();
    } else {
      toast.error("Error al guardar producto");
    }
  };

  const handleEditClick = (p: Product) => {
    setEditingId(p.id);
    setFormData({ 
      name: p.name, 
      price: p.price.toString(), 
      compare_at_price: p.compare_at_price?.toString() || '',
      category: p.category, 
      inventory: p.inventory || {}, 
      images: p.images || [p.image_url] 
    });
    setActiveTab('productos');
    window.scrollTo({top:0, behavior:'smooth'});
  };

  const handleDeleteProduct = async (id: string) => {
    if(!confirm('¿Estás seguro de eliminar este producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if(!error) { toast.success('Producto eliminado'); fetchData(); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <Header />
      
      {/* BARRA ADMIN STICKY: Ahora el contenido interior está centrado con max-w-6xl */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm w-full">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="font-serif italic text-xl flex items-center gap-2">
            Panel de Administración
          </h1>
          {/* Navegación con scroll horizontal en móviles */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto hide-scrollbar max-w-[55%] md:max-w-full">
            {(['resumen', 'pedidos', 'productos', 'config'] as TabView[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 lg:px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeTab === tab ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black'}`}>{tab}</button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: Mantiene el max-w-6xl para estar perfectamente alineado con la barra superior */}
      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-8 flex-1 w-full">
        
        {/* VISTA: RESUMEN */}
        {activeTab === 'resumen' && (
          <div className="animate-fade-in">
            <TabHeader 
              title="Resumen del Negocio" 
              description="Vista general del rendimiento de tu tienda. Aquí puedes ver los ingresos totales, el volumen de pedidos y alertas de stock bajo." 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2 text-zinc-400">
                  <ShoppingBag size={16}/>
                  <p className="text-[10px] tracking-widest font-bold uppercase">Ingresos Totales</p>
                </div>
                <p className="text-3xl font-serif italic text-gray-900">${orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString('es-CL')}</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2 text-zinc-400">
                  <Package size={16}/>
                  <p className="text-[10px] tracking-widest font-bold uppercase">Pedidos</p>
                </div>
                <p className="text-3xl font-serif italic text-gray-900">{orders.length}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2 text-amber-500">
                  <Clock size={16}/>
                  <p className="text-[10px] tracking-widest font-bold uppercase text-amber-600">Pendientes</p>
                </div>
                <p className="text-3xl font-serif italic text-amber-600">{orders.filter(o => o.status !== 'Entregado').length}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2 text-red-500">
                  <AlertTriangle size={16}/>
                  <p className="text-[10px] tracking-widest font-bold uppercase text-red-600">Stock Bajo (≤ 3)</p>
                </div>
                <p className="text-3xl font-serif italic text-red-600">{products.filter(p => p.stock <= 3).length}</p>
              </div>
            </div>
          </div>
        )}

        {/* VISTA: PEDIDOS */}
        {activeTab === 'pedidos' && (
          <div className="space-y-4 animate-fade-in">
            <TabHeader 
              title="Gestión de Pedidos" 
              description="Administra las compras de tus clientes. Usa el buscador para encontrar órdenes por nombre, RUT o correo, y haz clic en un pedido para gestionar su envío." 
            />
            
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400"/>
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por ID, Cliente, Email o Estado..." 
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5 transition-all shadow-sm"
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto hide-scrollbar">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b">
                    <tr>
                      <th className="p-5">ID / Fecha</th>
                      <th className="p-5">Cliente / Contacto</th>
                      <th className="p-5">Destino</th>
                      <th className="p-5">Estado</th>
                      <th className="p-5">Total</th>
                      <th className="p-5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map(o => (
                      <tr key={o.id} onClick={() => setSelectedOrder(o)} className="hover:bg-gray-50/80 transition-colors cursor-pointer group">
                        <td className="p-5">
                          <p className="font-mono text-xs text-gray-400 group-hover:text-black font-bold">#{o.id.slice(0,6).toUpperCase()}</p>
                          <p className="text-[10px] text-gray-500">{new Date(o.created_at).toLocaleDateString('es-CL')}</p>
                        </td>
                        <td className="p-5">
                          <p className="font-medium text-gray-900">{o.shipping_info?.firstName} {o.shipping_info?.lastName}</p>
                          <div className="text-xs text-gray-500 flex flex-col mt-0.5">
                             <span className="flex items-center gap-1"><Mail size={10}/> {o.shipping_info?.email || o.email || 'Sin email'}</span>
                             <span className="flex items-center gap-1"><Phone size={10}/> {o.shipping_info?.phone || 'Sin tel'}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                             {o.shipping_info?.shipping_method === 'pickup' ? <Store size={14} className="text-purple-600"/> : <Truck size={14} className="text-blue-600"/>}
                             <div>
                                 <p className="text-xs font-medium text-gray-900">{o.shipping_info?.city}</p>
                                 <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{o.shipping_info?.region}</p>
                             </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            o.status === 'Pagado' ? 'bg-green-50 text-green-700 border-green-100' :
                            o.status === 'Enviado' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            o.status === 'Entregado' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-100'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-5 font-bold">${o.total_amount.toLocaleString('es-CL')}</td>
                        <td className="p-5 text-right"><button className="text-gray-400 hover:text-black transition-colors"><Eye size={18}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredOrders.length === 0 && <div className="p-12 text-center text-gray-400 text-sm">No se encontraron pedidos.</div>}
            </div>
          </div>
        )}

        {/* VISTA: PRODUCTOS */}
        {activeTab === 'productos' && (
          <div className="animate-fade-in">
            <TabHeader 
              title="Inventario de Joyas" 
              description="Administra tu catálogo. Crea nuevas piezas, establece precios de oferta, define el stock por talla y sube imágenes directamente desde tu celular o computadora." 
            />
            
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Formulario */}
              <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl border border-gray-200 lg:sticky lg:top-24 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif italic text-xl">{editingId ? 'Editar Joya' : 'Nueva Joya'}</h3>
                  {editingId && <button onClick={() => {setEditingId(null); setFormData({ name: '', price: '', compare_at_price: '', category: '', inventory: {}, images: [] });}} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Cancelar</button>}
                </div>
                
                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400">Nombre</label>
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"/>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Precio Venta</label>
                      <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-black"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Precio Anterior</label>
                      <input type="number" value={formData.compare_at_price} onChange={e => setFormData({...formData, compare_at_price: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50 outline-none focus:border-black"/>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400">Categoría</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-black">
                      <option value="">Seleccionar...</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Inventario Dinámico */}
                  {formData.category && sizeConfig[formData.category] && (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-200">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Package size={12}/> Gestión de Stock</p>
                      <div className="grid grid-cols-4 gap-2">
                        {sizeConfig[formData.category].map(sz => (
                          <div key={sz} className="text-center bg-white p-1 rounded border border-gray-200">
                            <span className="text-[9px] text-gray-400 block mb-1 uppercase font-bold">{sz}</span>
                            <input type="number" value={formData.inventory[sz] || ''} onChange={e => setFormData({...formData, inventory: {...formData.inventory, [sz]: parseInt(e.target.value) || 0}})} className="w-full text-center text-sm font-bold p-0 border-none outline-none focus:ring-0" placeholder="0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sección de Imágenes */}
                  <div className="space-y-3 border-t border-gray-100 pt-4 mt-2">
                    <label className="text-[10px] font-bold uppercase text-gray-400 block">Galería de Imágenes</label>
                    
                    <div className="relative">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploadingImgs}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all ${isUploadingImgs ? 'border-gray-200 bg-gray-50' : 'border-black hover:bg-gray-50'}`}>
                        {isUploadingImgs ? (
                          <div className="animate-pulse flex flex-col items-center">
                            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-xs font-bold text-gray-500">Optimizando fotos...</span>
                          </div>
                        ) : (
                          <>
                            <UploadCloud size={24} className="text-black mb-2" />
                            <span className="text-sm font-bold text-gray-900">Toca para subir fotos</span>
                            <span className="text-[10px] text-gray-400 mt-1">Soporta múltiples imágenes desde tu galería</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">O pega una URL</span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    <input 
                      type="url" 
                      placeholder="Pegar URL + Enter" 
                      value={tempImageUrl} 
                      onChange={e => setTempImageUrl(e.target.value)} 
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { 
                        if(e.key === 'Enter') { 
                          e.preventDefault(); 
                          const trm = tempImageUrl.trim(); 
                          if(trm.startsWith('http')) { setFormData(p => ({...p, images: [...p.images, trm]})); setTempImageUrl(''); }
                        } 
                      }} 
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:border-black"
                    />
                    
                    {formData.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {formData.images.map((img, i) => (
                          <div key={i} className="w-16 h-16 relative border rounded-md overflow-hidden group shadow-sm bg-gray-100">
                            <Image src={img} alt="preview" fill sizes="64px" className="object-cover" unoptimized />
                            {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] text-center py-0.5">Portada</span>}
                            <button type="button" onClick={() => setFormData(p => ({...p, images: p.images.filter((_, idx) => idx !== i)}))} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Trash2 size={14}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button disabled={isUploadingImgs} className="w-full bg-black text-white py-3.5 rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-lg hover:bg-zinc-800 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                    {editingId ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </form>
              </div>

              {/* Tabla Productos */}
              <div className="w-full lg:w-2/3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b tracking-widest">
                      <tr><th className="p-5">Pieza</th><th className="p-5">Precio</th><th className="p-5 text-center">Stock</th><th className="p-5 text-right">Acción</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="p-5 flex gap-4 items-center">
                            <div className="relative w-12 h-12 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0 group-hover:shadow-sm transition-shadow">
                              {p.image_url?.startsWith('http') && <Image src={p.image_url} alt={p.name} fill sizes="48px" className="object-cover" unoptimized />}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.category}</p>
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">${p.price.toLocaleString('es-CL')}</span>
                              {p.compare_at_price && <span className="text-[10px] text-red-400 line-through">${p.compare_at_price.toLocaleString('es-CL')}</span>}
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${p.stock <= 3 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {p.stock} un.
                            </span>
                          </td>
                          <td className="p-5 text-right space-x-1">
                            <button onClick={() => handleEditClick(p)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all"><Edit size={16}/></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA: CONFIGURACIÓN */}
        {activeTab === 'config' && (
          <div className="animate-fade-in text-gray-900">
            <TabHeader 
              title="Ajustes de la Tienda" 
              description="Configura los parámetros globales. Añade nuevas categorías para tu menú principal y define las opciones de tallaje (ej: 6, 7, Ajustable, Única) para cada una." 
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-serif italic text-xl mb-6 flex items-center gap-2"><Settings size={20}/> Categorías</h3>
                <div className="flex gap-2 mb-6">
                  <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nueva categoría..." className="flex-1 p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"/>
                  <button onClick={() => { if(newCategory.trim()){ saveSettings('categories', [...categories, newCategory.trim()]); setNewCategory(''); }}} className="bg-black text-white px-4 rounded-lg shadow-md hover:bg-zinc-800 transition-colors"><Plus size={20}/></button>
                </div>
                <div className="space-y-2">
                  {categories.map((c) => <div key={c} className="p-3 px-4 bg-gray-50 rounded-lg flex justify-between items-center border border-gray-100"><span>{c}</span><button onClick={() => { if(confirm('¿Borrar?')) saveSettings('categories', categories.filter(x=>x!==c)); }} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>)}
                </div>
              </div>

              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-serif italic text-xl mb-6 flex items-center gap-2"><Package size={20}/> Tallas por Categoría</h3>
                <div className="space-y-4">
                  <select value={selectedCatForSizes} onChange={e => setSelectedCatForSizes(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-black">
                    <option value="">Selecciona una categoría...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  
                  {selectedCatForSizes && (
                    <div className="animate-fade-in">
                      <div className="flex gap-2 mb-4">
                        <input value={newSize} onChange={e => setNewSize(e.target.value)} placeholder="Ej: 14, S, Talla Única" className="flex-1 p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"/>
                        <button onClick={() => { if(newSize.trim()){ const updatedSizes = { ...sizeConfig, [selectedCatForSizes]: [...(sizeConfig[selectedCatForSizes] || []), newSize.trim()] }; saveSettings('sizes', updatedSizes); setNewSize(''); }}} className="bg-black text-white px-4 rounded-lg shadow-md hover:bg-zinc-800"><Plus size={20}/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(sizeConfig[selectedCatForSizes] || []).map(size => (
                          <div key={size} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200 text-xs font-medium">
                            <span>{size}</span>
                            <button onClick={() => { const updatedSizes = { ...sizeConfig, [selectedCatForSizes]: sizeConfig[selectedCatForSizes].filter(x=>x!==size) }; saveSettings('sizes', updatedSizes); }} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                          </div>
                        ))}
                        {(sizeConfig[selectedCatForSizes] || []).length === 0 && <p className="text-xs text-gray-400 italic">No hay tallas configuradas.</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DETALLE PEDIDO */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-gray-900">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 md:p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-lg md:text-xl font-serif italic flex items-center gap-2">
                    Pedido #{selectedOrder.id.slice(0,8).toUpperCase()}
                    <span className={`text-[10px] not-italic font-sans px-2 py-0.5 rounded border uppercase tracking-wide ${
                       selectedOrder.status === 'Pagado' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 border-gray-200'
                    }`}>{selectedOrder.status}</span>
                  </h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock size={12}/> {new Date(selectedOrder.created_at).toLocaleString('es-CL')}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-zinc-400"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                
                {/* GRID DE INFORMACIÓN DEL CLIENTE Y ENVÍO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tarjeta Cliente */}
                  <div className="p-4 md:p-5 bg-gray-50 rounded-xl text-sm border border-gray-100 relative group hover:border-black/10 transition-colors">
                    <div className="flex items-center gap-2 mb-3 text-gray-400">
                        <User size={14}/>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Datos Cliente</p>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <p className="font-bold text-base">{selectedOrder.shipping_info?.firstName} {selectedOrder.shipping_info?.lastName}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">RUT: {selectedOrder.shipping_info?.rut || 'No ingresado'}</p>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-200/50 space-y-2">
                             <div className="flex items-center justify-between group/item">
                                <p className="text-xs text-gray-600 flex items-center gap-2 truncate pr-2">
                                    <Mail size={12} className="text-gray-400 flex-shrink-0"/> 
                                    <span className="truncate">{selectedOrder.shipping_info?.email || selectedOrder.email || 'No registrado'}</span>
                                </p>
                                <button onClick={() => copyToClipboard(selectedOrder.shipping_info?.email || selectedOrder.email, 'Email')} className="text-gray-300 hover:text-black opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity"><Copy size={12}/></button>
                             </div>
                             
                             <div className="flex items-center justify-between group/item">
                                <p className="text-xs text-gray-600 flex items-center gap-2">
                                    <Phone size={12} className="text-gray-400"/> 
                                    {selectedOrder.shipping_info?.phone || 'No registrado'}
                                </p>
                                <button onClick={() => copyToClipboard(selectedOrder.shipping_info?.phone, 'Teléfono')} className="text-gray-300 hover:text-black opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity"><Copy size={12}/></button>
                             </div>
                        </div>
                    </div>
                  </div>

                  {/* Tarjeta Envío */}
                  <div className="p-4 md:p-5 bg-gray-50 rounded-xl text-sm border border-gray-100 relative group hover:border-black/10 transition-colors">
                    <div className="flex items-center gap-2 mb-3 text-gray-400">
                        {selectedOrder.shipping_info?.shipping_method === 'pickup' ? <Store size={14}/> : <Truck size={14}/>}
                        <p className="text-[10px] font-bold uppercase tracking-widest">
                            {selectedOrder.shipping_info?.shipping_method === 'pickup' ? 'Retiro en Tienda' : 'Dirección de Envío'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        {selectedOrder.shipping_info?.shipping_method === 'pickup' ? (
                            <div className="p-2 bg-purple-50 text-purple-700 rounded-md text-xs font-medium border border-purple-100">
                                El cliente retirará en tienda.
                            </div>
                        ) : (
                            <div className="flex items-start justify-between gap-2">
                                <div className="pr-2">
                                  <p className="font-medium leading-relaxed text-sm md:text-base">{selectedOrder.shipping_info?.address}</p>
                                  {(selectedOrder.shipping_info?.addressDetails || selectedOrder.shipping_info?.apartment) && (
                                    <p className="text-zinc-600 font-medium bg-zinc-100 px-2 py-0.5 rounded inline-block mt-1 text-xs border border-zinc-200">
                                      {selectedOrder.shipping_info.addressDetails || selectedOrder.shipping_info.apartment}
                                    </p>
                                  )}
                                </div>
                                <button onClick={() => copyToClipboard(`${selectedOrder.shipping_info?.address} ${selectedOrder.shipping_info?.addressDetails || ''}, ${selectedOrder.shipping_info?.city}`, 'Dirección')} className="text-gray-300 hover:text-black mt-0.5"><Copy size={12}/></button>
                            </div>
                        )}
                        
                        <div className="pt-2">
                          <p className="text-gray-800 font-medium">{selectedOrder.shipping_info?.city}</p>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">{selectedOrder.shipping_info?.region}</p>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Productos */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-3 tracking-widest">Productos del Pedido</p>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item: OrderItem, i) => (
                      <div key={i} className="flex items-center gap-3 md:gap-4 p-3 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-50 bg-gray-50">
                          {item.image_url?.startsWith('http') && <Image src={item.image_url} alt={item.name} fill className="object-cover" unoptimized />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-xs md:text-sm truncate">{item.name}</p>
                          <p className="text-[10px] md:text-xs text-gray-500">Talla: <span className="font-medium text-black">{item.selectedSize}</span> <span className="mx-1 text-gray-300">|</span> Cant: {item.quantity}</p>
                        </div>
                        <p className="font-bold text-gray-900 text-xs md:text-sm">${(item.price * item.quantity).toLocaleString('es-CL')}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                      <div className="text-right">
                        {selectedOrder.discount_info && (
                          <div className="mb-1 flex items-center justify-end gap-2 text-green-600">
                            <span className="text-[10px] font-bold uppercase flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                              <Tag size={10} /> {selectedOrder.discount_info.code}
                            </span>
                            <span className="text-sm font-bold">
                              -${selectedOrder.discount_info.amount.toLocaleString('es-CL')}
                            </span>
                          </div>
                        )}
                        <p className="text-[10px] md:text-xs text-gray-400 uppercase">Total Pagado</p>
                        <p className="text-xl md:text-2xl font-serif italic">${selectedOrder.total_amount.toLocaleString('es-CL')}</p>
                      </div>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 bg-gray-50 border-t">
                <p className="text-center text-[10px] font-bold uppercase text-gray-400 mb-3">Actualizar Estado del Pedido</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(['Pagado', 'Preparando', 'Enviado', 'Entregado'] as OrderStatus[]).map((s) => (
                    <button 
                      key={s} 
                      onClick={() => handleUpdateStatus(selectedOrder.id, s)} 
                      className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wide transition-all ${
                        selectedOrder.status === s 
                          ? 'bg-black text-white shadow-md scale-105 ring-2 ring-offset-2 ring-black' 
                          : 'bg-white border border-gray-200 text-gray-500 hover:border-black hover:text-black'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}