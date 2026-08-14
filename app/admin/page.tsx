'use client';

import { useEffect, useState, KeyboardEvent, useMemo } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { 
  X, Plus, Edit, Trash2, Clock, Eye, Settings, 
  Package, ShoppingBag, Search, AlertTriangle, 
  Mail, Phone, Copy, User, Truck, Store, Tag, UploadCloud,
  ChevronLeft, ChevronRight, Star, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { ADMIN_EMAIL } from '@/lib/config';
import DiscountsTab from './_components/DiscountsTab';
import SettingsTab from './_components/SettingsTab';
import PhotoScannerModal from './_components/PhotoScannerModal';

type TabView = 'resumen' | 'pedidos' | 'productos' | 'categorias' | 'descuentos' | 'config';
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
  description: string;
  price: number; 
  compare_at_price: number | null;
  cost_price: number | null;
  category: string; 
  category_id: number | null;
  image_url: string; 
  images: string[];
  slug: string; 
  inventory: Inventory; 
  stock: number;
  sku: string;
  supplier_code: string;
  barcode: string;
  brand: string;
  collection: string;
  material: string;
  is_featured: boolean;
  is_new: boolean;
  is_active: boolean;
  meta_title: string;
  meta_description: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  position: number;
  meta_title: string;
  meta_description: string;
}

interface Coupon {
  id: number;
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  min_purchase: number;
  is_active: boolean;
  used_count: number;
}

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
  
  // Estados de Base de Datos
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [sizeConfig, setSizeConfig] = useState<Record<string, string[]>>({});
  
  // Filtros y Visualizaciones
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [couponSearchTerm, setCouponSearchTerm] = useState('');

  // Formularios Visibilidad
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [aiPreFilled, setAiPreFilled] = useState(false);

  // Estados de Edición
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);

  // Estados Adicionales CRUD Avanzado
  const [showInlineCatModal, setShowInlineCatModal] = useState(false);
  const [inlineCatForm, setInlineCatForm] = useState({ name: '', slug: '', description: '' });
  const [isSavingInlineCat, setIsSavingInlineCat] = useState(false);
  const [isSlugDirty, setIsSlugDirty] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Formulario Producto
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [isUploadingImgs, setIsUploadingImgs] = useState(false); 
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    compare_at_price: '',
    cost_price: '',
    category_id: '',
    category: '',
    slug: '',
    sku: '',
    supplier_code: '',
    barcode: '',
    brand: 'Joyas Fran',
    collection: '',
    material: 'Plata Ley 925',
    is_featured: false,
    is_new: false,
    is_active: true,
    meta_title: '',
    meta_description: '',
    images: [] as string[],
    inventory: {} as Inventory,
    variantPrices: {} as Record<string, string>,
    variantCosts: {} as Record<string, string>
  });

  // Formulario Categoría
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    position: '0',
    is_active: true,
    meta_title: '',
    meta_description: ''
  });

  // Formulario Cupón
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed' | 'shipping',
    value: '',
    min_purchase: '',
    is_active: true
  });

  // Ajustes de Tallas
  const [selectedCatForSizes, setSelectedCatForSizes] = useState('');
  const [newSize, setNewSize] = useState('');

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes, settingsRes, categoriesRes, couponsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('store_settings').select('*'),
        supabase.from('categories').select('*').order('position', { ascending: true }),
        supabase.from('coupons').select('*').order('id', { ascending: false })
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (productsRes.data) setProducts(productsRes.data as Product[]);
      if (categoriesRes.data) setDbCategories(categoriesRes.data as Category[]);
      if (couponsRes.data) setCoupons(couponsRes.data as Coupon[]);

      if (settingsRes.data) {
        const newSizeConfig: Record<string, string[]> = {};
        const settings = settingsRes.data as StoreSettingRow[];

        settings.forEach((item) => {
          if (item.key === 'sizes') {
            if (typeof item.value === 'object' && !Array.isArray(item.value)) {
              Object.assign(newSizeConfig, item.value);
            }
          }
        });
        setSizeConfig(newSizeConfig);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Verificación defensiva secundaria (el middleware ya protege la ruta,
      // pero mantenemos esta como segunda línea de defensa en el cliente).
      // El estado `loading = true` mientras se verifica evita el flash de UI vacía.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
        router.replace('/');
        return;
      }
      await fetchData();
    };
    init();
  }, [router]);

  // --- FILTROS DE BÚSQUEDA ---
  const filteredOrders = useMemo(() => {
    if (!orderSearchTerm) return orders;
    const lower = orderSearchTerm.toLowerCase();
    return orders.filter(o => 
      o.id.toLowerCase().includes(lower) || 
      o.shipping_info.firstName?.toLowerCase().includes(lower) ||
      o.shipping_info.lastName?.toLowerCase().includes(lower) ||
      o.shipping_info.email?.toLowerCase().includes(lower) || 
      o.email?.toLowerCase().includes(lower) ||
      o.status.toLowerCase().includes(lower)
    );
  }, [orders, orderSearchTerm]);

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products;
    const lower = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.sku?.toLowerCase().includes(lower) ||
      p.category?.toLowerCase().includes(lower)
    );
  }, [products, productSearchTerm]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm) return dbCategories;
    const lower = categorySearchTerm.toLowerCase();
    return dbCategories.filter(c => 
      c.name.toLowerCase().includes(lower) ||
      c.slug.toLowerCase().includes(lower)
    );
  }, [dbCategories, categorySearchTerm]);

  const filteredCoupons = useMemo(() => {
    if (!couponSearchTerm) return coupons;
    const lower = couponSearchTerm.toLowerCase();
    return coupons.filter(c => c.code.toLowerCase().includes(lower));
  }, [coupons, couponSearchTerm]);

  // --- ACCIONES GENERALES ---
  const copyToClipboard = (text: string | undefined, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const saveSettings = async (key: string, value: SettingValue) => {
    const { error } = await supabase.from('store_settings').upsert({ key, value }, { onConflict: 'key' });
    if (!error) { toast.success('Configuración actualizada'); await fetchData(); }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const previousOrders = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: newStatus });

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    
    if (error) {
      setOrders(previousOrders); 
      toast.error('Error al actualizar el estado del pedido');
    } else {
      toast.success(`Pedido marcado como ${newStatus}`);
    }
  };

  // --- ACCIONES PRODUCTOS ---
  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploadingImgs(true);
    const files = Array.from(e.target.files);
    const uploadedUrls: string[] = [];

    toast.loading(`Optimizando y subiendo ${files.length} foto(s)...`, { id: 'uploadToast' });

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

      setProductForm(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast.success('¡Imágenes subidas con éxito!', { id: 'uploadToast' });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Ocurrió un error al subir las imágenes.', { id: 'uploadToast' });
    } finally {
      setIsUploadingImgs(false);
      e.target.value = ''; 
    }
  };

  const handleReplaceProductImage = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImgs(true);
    toast.loading('Optimizando y reemplazando imagen...', { id: 'uploadToast' });

    try {
      const webpBlob = await convertToWebp(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, webpBlob, { contentType: 'image/webp', cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);

      setProductForm(prev => {
        const nextImgs = [...prev.images];
        nextImgs[index] = publicUrl;
        return { ...prev, images: nextImgs };
      });
      toast.success('¡Imagen reemplazada con éxito!', { id: 'uploadToast' });
    } catch (error) {
      console.error('Error replacing image:', error);
      toast.error('Ocurrió un error al reemplazar la imagen.', { id: 'uploadToast' });
    } finally {
      setIsUploadingImgs(false);
      e.target.value = '';
    }
  };

  const handleSaveWithState = async (formState: typeof productForm) => {
    if (!formState.name || !formState.price) return toast.error("Nombre y precio de venta son obligatorios");
    if (formState.images.length === 0) return toast.error("Debes incluir al menos 1 imagen de catálogo");

    const finalStock = Object.values(formState.inventory).reduce((a, b) => a + (Number(b) || 0), 0);
    const resolvedCat = dbCategories.find(c => c.id === Number(formState.category_id));

    // Generar Slug automático si está vacío
    const resolvedSlug = (formState.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));

    const payload = {
      name: formState.name,
      description: formState.description.trim() || null,
      price: Number(formState.price),
      compare_at_price: formState.compare_at_price ? Number(formState.compare_at_price) : null,
      cost_price: formState.cost_price ? Number(formState.cost_price) : 0,
      category: resolvedCat?.name || formState.category || '',
      category_id: formState.category_id ? Number(formState.category_id) : null,
      image_url: formState.images[0] || '',
      slug: formState.slug.trim() || resolvedSlug,
      stock: finalStock,
      inventory: formState.inventory,
      images: formState.images,
      sku: formState.sku.trim() || resolvedSlug,
      supplier_code: formState.supplier_code.trim() || null,
      barcode: formState.barcode.trim() || null,
      brand: formState.brand.trim() || 'Joyas Fran',
      collection: formState.collection.trim() || null,
      material: formState.material.trim() || 'Plata Ley 925',
      is_featured: formState.is_featured,
      is_new: formState.is_new,
      is_active: formState.is_active,
      meta_title: formState.meta_title.trim() || formState.name,
      meta_description: formState.meta_description.trim() || formState.name
    };

    const { data: savedProduct, error } = editingProductId 
      ? await supabase.from('products').update(payload).eq('id', editingProductId).select().single()
      : await supabase.from('products').insert(payload).select().single();

    if (!error && savedProduct) {
      // Guardar variantes en su tabla indexada (Precio overrides, cost overrides)
      const variantsToUpsert = Object.keys(formState.inventory).map(sz => {
        const customPrice = formState.variantPrices[sz];
        const customCost = formState.variantCosts[sz];
        return {
          product_id: savedProduct.id,
          sku: `${payload.sku || payload.slug}-${sz}`,
          size: sz,
          stock: formState.inventory[sz] || 0,
          price_override: customPrice ? Number(customPrice) : null,
          cost_price: customCost ? Number(customCost) : null
        };
      });

      if (variantsToUpsert.length > 0) {
        const { error: vError } = await supabase
          .from('product_variants')
          .upsert(variantsToUpsert, { onConflict: 'product_id, size' });
        if (vError) console.error("Error upserting variants metadata:", vError);
      }

      toast.success(editingProductId ? 'Joya actualizada con éxito' : 'Joya creada con éxito');
      setEditingProductId(null);
      setShowProductForm(false);
      setProductForm({
        name: '', description: '', price: '', compare_at_price: '', cost_price: '', category_id: '', category: '', slug: '',
        sku: '', supplier_code: '', barcode: '', brand: 'Joyas Fran', collection: '', material: 'Plata Ley 925',
        is_featured: false, is_new: false, is_active: true, meta_title: '', meta_description: '',
        images: [], inventory: {}, variantPrices: {}, variantCosts: {}
      });
      setIsSlugDirty(false);
      await fetchData();
    } else {
      console.error(error);
      toast.error("Error al guardar la joya en la base de datos");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveWithState(productForm);
  };

  const handleEditProductClick = async (p: Product) => {
    setEditingProductId(p.id);
    
    // Obtener detalles extendidos de las variantes (precios personalizados y costos)
    const { data: variantsData } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', p.id);

    const prices: Record<string, string> = {};
    const costs: Record<string, string> = {};
    const inv: Record<string, number> = {};

    (variantsData || []).forEach(v => {
      inv[v.size] = v.stock;
      if (v.price_override !== null && v.price_override !== undefined) {
        prices[v.size] = v.price_override.toString();
      }
      if (v.cost_price !== null && v.cost_price !== undefined) {
        costs[v.size] = v.cost_price.toString();
      }
    });

    setProductForm({ 
      name: p.name,
      description: p.description || '',
      price: p.price.toString(), 
      compare_at_price: p.compare_at_price?.toString() || '',
      cost_price: p.cost_price?.toString() || '',
      category_id: p.category_id?.toString() || '',
      category: p.category || '',
      slug: p.slug || '',
      sku: p.sku || '',
      supplier_code: p.supplier_code || '',
      barcode: p.barcode || '',
      brand: p.brand || 'Joyas Fran',
      collection: p.collection || '',
      material: p.material || 'Plata Ley 925',
      is_featured: p.is_featured ?? false,
      is_new: p.is_new ?? false,
      is_active: p.is_active ?? true,
      meta_title: p.meta_title || '',
      meta_description: p.meta_description || '',
      images: p.images || [p.image_url],
      inventory: Object.keys(inv).length > 0 ? inv : p.inventory || {},
      variantPrices: prices,
      variantCosts: costs
    });
    setIsSlugDirty(true);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicateProduct = async (p: Product) => {
    const { data: variantsData } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', p.id);

    const prices: Record<string, string> = {};
    const costs: Record<string, string> = {};
    const inv: Record<string, number> = {};

    (variantsData || []).forEach(v => {
      inv[v.size] = v.stock;
      if (v.price_override !== null && v.price_override !== undefined) {
        prices[v.size] = v.price_override.toString();
      }
      if (v.cost_price !== null && v.cost_price !== undefined) {
        costs[v.size] = v.cost_price.toString();
      }
    });

    setEditingProductId(null);
    setProductForm({
      name: `${p.name} (Copia)`,
      description: p.description || '',
      price: p.price.toString(),
      compare_at_price: p.compare_at_price?.toString() || '',
      cost_price: p.cost_price?.toString() || '',
      category_id: p.category_id?.toString() || '',
      category: p.category || '',
      slug: `${p.slug}-copia`,
      sku: p.sku ? `${p.sku}-copia` : '',
      supplier_code: p.supplier_code || '',
      barcode: p.barcode || '',
      brand: p.brand || 'Joyas Fran',
      collection: p.collection || '',
      material: p.material || 'Plata Ley 925',
      is_featured: p.is_featured ?? false,
      is_new: p.is_new ?? false,
      is_active: false, // Por seguridad
      meta_title: p.meta_title ? `${p.meta_title} Copia` : '',
      meta_description: p.meta_description || '',
      images: p.images || [p.image_url],
      inventory: inv,
      variantPrices: prices,
      variantCosts: costs
    });
    setIsSlugDirty(true);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Copia de producto cargada en el formulario.');
  };

  const handleDeleteProduct = async (id: string) => {
    if(!confirm('¿Estás seguro de eliminar este producto? Se borrarán sus variantes y no se puede deshacer.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if(!error) { 
      toast.success('Producto eliminado del catálogo'); 
      fetchData(); 
    } else {
      toast.error('No se pudo eliminar el producto');
    }
  };

  // --- SCANNER IA ---
  const handleAIScanResult = (result: {
    name: string;
    description: string;
    category: string;
    category_id: number | null;
    material: string;
    collection: string | null;
    meta_title: string;
    meta_description: string;
    imageUrl: string;
  }) => {
    setProductForm(prev => ({
      ...prev,
      name: result.name,
      description: result.description,
      category_id: result.category_id ? result.category_id.toString() : '',
      category: result.category,
      material: result.material || 'Plata Ley 925',
      collection: result.collection || '',
      meta_title: result.meta_title,
      meta_description: result.meta_description,
      images: result.imageUrl ? [result.imageUrl] : prev.images,
      slug: result.name.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
    }));
    setIsSlugDirty(false);
    setAiPreFilled(true);
    setShowScannerModal(false);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const moveProductImage = (index: number, direction: 'left' | 'right') => {
    const updatedImages = [...productForm.images];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < updatedImages.length) {
      const temp = updatedImages[index];
      updatedImages[index] = updatedImages[targetIndex];
      updatedImages[targetIndex] = temp;
      setProductForm(prev => ({ ...prev, images: updatedImages }));
    }
  };

  const setProductCoverImage = (index: number) => {
    if (index === 0) return;
    const updatedImages = [...productForm.images];
    const cover = updatedImages.splice(index, 1)[0];
    updatedImages.unshift(cover);
    setProductForm(prev => ({ ...prev, images: updatedImages }));
    toast.success('Nueva imagen de portada fijada');
  };

  // --- ACCIONES CATEGORÍAS ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return toast.error("El nombre de la categoría es obligatorio");

    const resolvedSlug = categoryForm.slug.trim() || categoryForm.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const payload = {
      name: categoryForm.name.trim(),
      slug: resolvedSlug,
      description: categoryForm.description.trim(),
      image_url: categoryForm.image_url.trim() || '/img/cat-anillos.webp',
      position: Number(categoryForm.position) || 0,
      is_active: categoryForm.is_active,
      meta_title: categoryForm.meta_title.trim() || categoryForm.name.trim(),
      meta_description: categoryForm.meta_description.trim() || categoryForm.description.trim()
    };

    const { error } = editingCategoryId 
      ? await supabase.from('categories').update(payload).eq('id', editingCategoryId)
      : await supabase.from('categories').insert(payload);

    if (!error) {
      toast.success(editingCategoryId ? 'Categoría actualizada correctamente' : 'Nueva categoría creada');
      setEditingCategoryId(null);
      setShowCategoryForm(false);
      setCategoryForm({ name: '', slug: '', description: '', image_url: '', position: '0', is_active: true, meta_title: '', meta_description: '' });
      await fetchData();
    } else {
      toast.error('Error al guardar la categoría');
    }
  };

  const handleEditCategoryClick = (c: Category) => {
    setEditingCategoryId(c.id);
    setCategoryForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image_url: c.image_url || '',
      position: c.position.toString(),
      is_active: c.is_active,
      meta_title: c.meta_title || '',
      meta_description: c.meta_description || ''
    });
    setShowCategoryForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`¿Borrar la categoría "${name}"? Los productos asociados quedarán huérfanos.`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      toast.success('Categoría eliminada con éxito');
      await fetchData();
    } else {
      toast.error('Error al eliminar categoría');
    }
  };

  // --- ACCIONES CUPONES ---
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code) return toast.error("El código es obligatorio");
    if (!couponForm.value) return toast.error("El valor del descuento es obligatorio");

    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      type: couponForm.type,
      value: Number(couponForm.value),
      min_purchase: Number(couponForm.min_purchase) || 0,
      is_active: couponForm.is_active
    };

    const { error } = editingCouponId
      ? await supabase.from('coupons').update(payload).eq('id', editingCouponId)
      : await supabase.from('coupons').insert(payload);

    if (!error) {
      toast.success(editingCouponId ? 'Promoción modificada' : 'Cupón creado');
      setEditingCouponId(null);
      setShowCouponForm(false);
      setCouponForm({ code: '', type: 'percent', value: '', min_purchase: '', is_active: true });
      await fetchData();
    } else {
      toast.error('Error al guardar el cupón');
    }
  };

  const handleEditCouponClick = (c: Coupon) => {
    setEditingCouponId(c.id);
    setCouponForm({
      code: c.code,
      type: c.type,
      value: c.value.toString(),
      min_purchase: c.min_purchase.toString(),
      is_active: c.is_active
    });
    setShowCouponForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCoupon = async (id: number, code: string) => {
    if (!confirm(`¿Eliminar la promoción "${code}"?`)) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (!error) {
      toast.success('Promoción eliminada');
      await fetchData();
    } else {
      toast.error('No se pudo eliminar el cupón (puede estar en uso en pedidos)');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Cargando Sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 selection:bg-black selection:text-white">
      <Header />
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-[#121212] text-white border-b border-zinc-800 sticky top-0 z-30 shadow-md w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex flex-col md:flex-row items-center justify-between py-3 gap-3 md:gap-0">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <h1 className="font-serif italic text-2xl tracking-wide">
              Joyas Fran Admin
            </h1>
          </div>
          {/* Navegación responsiva con scroll en móviles */}
          <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
            {[
              { id: 'resumen', label: 'Resumen' },
              { id: 'pedidos', label: 'Pedidos' },
              { id: 'productos', label: 'Catálogo' },
              { id: 'categorias', label: 'Categorías' },
              { id: 'descuentos', label: 'Cupones' },
              { id: 'config', label: 'Ajustes' }
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => {
                  setActiveTab(tab.id as TabView);
                  setShowProductForm(false);
                  setShowCategoryForm(false);
                  setShowCouponForm(false);
                }} 
                className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO DE LA PÁGINA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full animate-fade-in">
        
        {/* ==========================================
            TAB: RESUMEN (DASHBOARD METRICS)
            ========================================== */}
        {activeTab === 'resumen' && (
          <div className="space-y-8 animate-fade-in">
            <TabHeader 
              title="Resumen del Negocio" 
              description="Información clave en tiempo real sobre ventas, inventario y alertas del negocio." 
            />
            
            {/* Tarjetas de Métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <ShoppingBag size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Ventas Aprobadas</span>
                </div>
                <p className="text-xl md:text-3xl font-serif italic text-gray-900">
                  ${orders.reduce((sum, o) => sum + (o.status === 'Pagado' || o.status === 'Preparando' || o.status === 'Enviado' || o.status === 'Entregado' ? o.total_amount : 0), 0).toLocaleString('es-CL')}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Package size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Pedidos Totales</span>
                </div>
                <p className="text-xl md:text-3xl font-serif italic text-gray-900">{orders.length}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <Clock size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600">Por Despachar</span>
                </div>
                <p className="text-xl md:text-3xl font-serif italic text-amber-600">
                  {orders.filter(o => o.status === 'Pagado' || o.status === 'Preparando' || o.status === 'Enviado').length}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <AlertTriangle size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-red-600">Stock Bajo (≤ 3)</span>
                </div>
                <p className="text-xl md:text-3xl font-serif italic text-red-600">
                  {products.filter(p => p.stock <= 3).length}
                </p>
              </div>
            </div>

            {/* Listados de Actividad Reciente */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Últimos Pedidos */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="font-serif italic text-lg text-gray-900 border-b pb-3">Últimas Ventas</h3>
                <div className="space-y-3">
                  {orders.slice(0, 5).map(o => (
                    <div key={o.id} onClick={() => { setSelectedOrder(o); setActiveTab('pedidos'); }} className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-50 cursor-pointer">
                      <div>
                        <p className="font-bold text-xs">#{o.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-[10px] text-gray-400">{o.shipping_info?.firstName} {o.shipping_info?.lastName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs">${o.total_amount.toLocaleString('es-CL')}</p>
                        <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border ${o.status === 'Pagado' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500'}`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-xs text-gray-400 italic text-center py-6">No hay pedidos registrados.</p>}
                </div>
              </div>

              {/* Productos más consultados / Bajo Stock */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="font-serif italic text-lg text-gray-900 border-b pb-3">Bajo Stock</h3>
                <div className="space-y-3">
                  {products.filter(p => p.stock <= 3).slice(0, 5).map(p => (
                    <div key={p.id} onClick={() => { handleEditProductClick(p); setActiveTab('productos'); }} className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded overflow-hidden bg-gray-50">
                          {p.image_url && <Image src={p.image_url} alt={p.name} fill className="object-cover" unoptimized />}
                        </div>
                        <div>
                          <p className="font-bold text-xs truncate max-w-[150px]">{p.name}</p>
                          <p className="text-[9px] text-gray-400">{p.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs text-red-650">{p.stock} un.</p>
                        <span className="text-[9px] text-gray-400 font-mono">SKU: {p.sku || p.slug}</span>
                      </div>
                    </div>
                  ))}
                  {products.filter(p => p.stock <= 3).length === 0 && <p className="text-xs text-green-600 italic text-center py-6">Todo el stock está al día.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: PEDIDOS (ORDER LIST)
            ========================================== */}
        {activeTab === 'pedidos' && (
          <div className="space-y-6 animate-fade-in">
            <TabHeader 
              title="Administración de Pedidos" 
              description="Busca y actualiza estados de entregas y despachos." 
            />

            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400"/>
              <input 
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                placeholder="Buscar pedido por ID, Cliente, Email o Estado..." 
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-black transition-all shadow-sm"
              />
            </div>

            {/* Listado de Pedidos */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Contenedor responsivo: En Desktop tabla, en Móviles tarjetas */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-[9px] uppercase font-bold tracking-widest text-gray-400 border-b">
                    <tr>
                      <th className="p-5">ID / Fecha</th>
                      <th className="p-5">Cliente</th>
                      <th className="p-5">Método / Ciudad</th>
                      <th className="p-5">Estado</th>
                      <th className="p-5">Total</th>
                      <th className="p-5 text-right">Ver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map(o => (
                      <tr key={o.id} onClick={() => setSelectedOrder(o)} className="hover:bg-gray-50/50 cursor-pointer transition-colors group">
                        <td className="p-5">
                          <p className="font-mono text-xs font-bold text-gray-900">#{o.id.slice(0,8).toUpperCase()}</p>
                          <p className="text-[10px] text-gray-400">{new Date(o.created_at).toLocaleDateString('es-CL')} {new Date(o.created_at).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}</p>
                        </td>
                        <td className="p-5">
                          <p className="font-bold text-xs text-gray-900">{o.shipping_info?.firstName} {o.shipping_info?.lastName}</p>
                          <p className="text-[10px] text-gray-400">{o.shipping_info?.email || o.email || 'Sin email'}</p>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            {o.shipping_info?.shipping_method === 'pickup' ? <Store size={12} className="text-purple-600" /> : <Truck size={12} className="text-blue-600" />}
                            <span className="text-xs font-medium text-gray-800">{o.shipping_info?.city || 'Retiro'}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border ${
                            o.status === 'Pagado' ? 'bg-green-50 text-green-700 border-green-200' :
                            o.status === 'Enviado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            o.status === 'Entregado' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-5 font-bold text-gray-900">${o.total_amount.toLocaleString('es-CL')}</td>
                        <td className="p-5 text-right"><button className="p-2 text-gray-400 group-hover:text-black transition-colors"><Eye size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Móvil (Tarjetas colapsables de pedidos) */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredOrders.map(o => (
                  <div key={o.id} onClick={() => setSelectedOrder(o)} className="p-4 hover:bg-gray-50/50 transition-colors flex flex-col gap-3 active:bg-gray-50 cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-xs font-bold text-gray-900">#{o.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-[10px] text-gray-400">{new Date(o.created_at).toLocaleDateString('es-CL')}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                        o.status === 'Pagado' ? 'bg-green-50 text-green-700 border-green-200' :
                        o.status === 'Enviado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>{o.status}</span>
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold text-gray-800">{o.shipping_info?.firstName} {o.shipping_info?.lastName}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                          {o.shipping_info?.shipping_method === 'pickup' ? <Store size={10}/> : <Truck size={10}/>}
                          {o.shipping_info?.city || 'Retiro en Tienda'}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-gray-900">${o.total_amount.toLocaleString('es-CL')}</p>
                    </div>
                  </div>
                ))}
              </div>

              {filteredOrders.length === 0 && <div className="p-12 text-center text-gray-400 text-xs italic">No se encontraron pedidos en la base de datos.</div>}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: PRODUCTOS (PRODUCT CATALOG & CRUD)
            ========================================== */}
        {activeTab === 'productos' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <TabHeader 
                title="Gestión de Catálogo" 
                description="Añade, edita, destaca y ajusta stock y precios del inventario de joyas." 
              />
              {!showProductForm && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      setEditingProductId(null);
                      setProductForm({
                        name: '', description: '', price: '', compare_at_price: '', cost_price: '', category_id: '', category: '', slug: '',
                        sku: '', supplier_code: '', barcode: '', brand: 'Joyas Fran', collection: '', material: 'Plata Ley 925',
                        is_featured: false, is_new: false, is_active: true, meta_title: '', meta_description: '',
                        images: [], inventory: {}, variantPrices: {}, variantCosts: {}
                      });
                      setIsSlugDirty(false);
                      setAiPreFilled(false);
                      setShowScannerModal(true);
                    }} 
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm w-full sm:w-auto justify-center"
                  >
                    <span>✨</span> Nueva con IA
                  </button>
                  <button 
                    onClick={() => {
                      setEditingProductId(null);
                      setProductForm({
                        name: '', description: '', price: '', compare_at_price: '', cost_price: '', category_id: '', category: '', slug: '',
                        sku: '', supplier_code: '', barcode: '', brand: 'Joyas Fran', collection: '', material: 'Plata Ley 925',
                        is_featured: false, is_new: false, is_active: true, meta_title: '', meta_description: '',
                        images: [], inventory: {}, variantPrices: {}, variantCosts: {}
                      });
                      setIsSlugDirty(false);
                      setAiPreFilled(false);
                      setShowProductForm(true);
                    }} 
                    className="bg-black text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-800 transition-colors w-full sm:w-auto justify-center"
                  >
                    <Plus size={16}/> Nueva Joya
                  </button>
                </div>
              )}
            </div>

            {/* FORMULARIO: CREACIÓN/EDICIÓN */}
            {showProductForm && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-up">
                <div className="flex justify-between items-center mb-6 pb-3 border-b">
                  <h3 className="font-serif italic text-xl">{editingProductId ? 'Editar Joya del Catálogo' : 'Añadir Nueva Joya'}</h3>
                  <button 
                    onClick={() => {
                      setEditingProductId(null);
                      setShowProductForm(false);
                    }} 
                    className="text-xs bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 px-3 py-2 rounded-md font-bold uppercase"
                  >
                    Cerrar Formulario
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-6">
                  {/* Banner IA */}
                  {aiPreFilled && (
                    <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl px-4 py-3 animate-fade-in">
                      <span className="text-lg">🤖</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-violet-800">Formulario pre-llenado con IA</p>
                        <p className="text-[10px] text-violet-600 mt-0.5">Revisa y corrige los datos antes de guardar. La IA puede cometer errores.</p>
                      </div>
                      <button type="button" onClick={() => setAiPreFilled(false)} className="text-violet-400 hover:text-violet-700 text-xs">✕</button>
                    </div>
                  )}

                  {/* Fila 1: Datos Básicos */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Nombre de la Joya</label>
                      <input 
                        required 
                        value={productForm.name} 
                        onChange={e => {
                          const val = e.target.value;
                          setProductForm(prev => {
                            const next = { ...prev, name: val };
                            if (!isSlugDirty) {
                              next.slug = val.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                            }
                            return next;
                          });
                        }} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black transition-colors"
                        placeholder="Ej: Anillo de Plata Corazón"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-gray-400">Categoría</label>
                        <button
                          type="button"
                          onClick={() => setShowInlineCatModal(true)}
                          className="text-[10px] text-zinc-950 font-bold hover:underline"
                        >
                          + Crear Categoría
                        </button>
                      </div>
                      <select 
                        required 
                        value={productForm.category_id} 
                        onChange={e => setProductForm({...productForm, category_id: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white cursor-pointer outline-none focus:border-black"
                      >
                        <option value="">Seleccionar...</option>
                        {dbCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Slug Personalizado</label>
                      <input 
                        value={productForm.slug} 
                        onChange={e => {
                          setIsSlugDirty(true);
                          setProductForm({...productForm, slug: e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')});
                        }} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black font-mono text-xs"
                        placeholder="Auto-generado si queda vacío"
                      />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Descripción del Producto</label>
                      <span className="text-[9px] text-gray-400">{productForm.description.length}/300</span>
                    </div>
                    <textarea
                      value={productForm.description}
                      onChange={e => setProductForm({...productForm, description: e.target.value})}
                      rows={3}
                      maxLength={300}
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black transition-colors resize-none"
                      placeholder="Describe la joya: material, diseño, ocasión de uso... (la IA puede sugerir una descripción con ✨ Nueva con IA)"
                    />
                  </div>

                  {/* Fila 2: Precios y Costos */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Precio Venta (CLP)</label>
                      <input 
                        required 
                        type="number" 
                        value={productForm.price} 
                        onChange={e => setProductForm({...productForm, price: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-black bg-white"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Precio Anterior (Tachado)</label>
                      <input 
                        type="number" 
                        value={productForm.compare_at_price} 
                        onChange={e => setProductForm({...productForm, compare_at_price: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm text-gray-500 outline-none focus:border-black bg-white"
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Costo Base Unitario</label>
                      <input 
                        type="number" 
                        value={productForm.cost_price} 
                        onChange={e => setProductForm({...productForm, cost_price: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black bg-white"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Atributos y códigos */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">SKU Base</label>
                      <input 
                        value={productForm.sku} 
                        onChange={e => setProductForm({...productForm, sku: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black font-mono text-xs"
                        placeholder="Auto-generado"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Marca</label>
                      <input 
                        value={productForm.brand} 
                        onChange={e => setProductForm({...productForm, brand: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Material</label>
                      <input 
                        value={productForm.material} 
                        onChange={e => setProductForm({...productForm, material: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Colección</label>
                      <input 
                        value={productForm.collection} 
                        onChange={e => setProductForm({...productForm, collection: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                        placeholder="Ej: Verano 2026"
                      />
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Código de Proveedor</label>
                      <input 
                        value={productForm.supplier_code} 
                        onChange={e => setProductForm({...productForm, supplier_code: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                        placeholder="Ref..."
                      />
                    </div>
                  </div>

                  {/* Estado / Tags del Producto */}
                  <div className="flex flex-wrap gap-6 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase text-zinc-700">
                      <input 
                        type="checkbox" 
                        checked={productForm.is_active} 
                        onChange={e => setProductForm({...productForm, is_active: e.target.checked})}
                        className="w-4 h-4 border-gray-300 rounded text-black focus:ring-black"
                      />
                      Producto Activo (Visible en tienda)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase text-zinc-700">
                      <input 
                        type="checkbox" 
                        checked={productForm.is_featured} 
                        onChange={e => setProductForm({...productForm, is_featured: e.target.checked})}
                        className="w-4 h-4 border-gray-300 rounded text-black focus:ring-black"
                      />
                      Destacar Producto (Home page)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase text-zinc-700">
                      <input 
                        type="checkbox" 
                        checked={productForm.is_new} 
                        onChange={e => setProductForm({...productForm, is_new: e.target.checked})}
                        className="w-4 h-4 border-gray-300 rounded text-black focus:ring-black"
                      />
                      Marcar como Novedad
                    </label>
                  </div>

                  {/* SEO Básico */}
                  <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">SEO Básico</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-400">Meta Título (Título de búsqueda)</label>
                        <input 
                          value={productForm.meta_title} 
                          onChange={e => setProductForm({...productForm, meta_title: e.target.value})} 
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-black"
                          placeholder="Título para SEO"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-400">Meta Descripción</label>
                        <input 
                          value={productForm.meta_description} 
                          onChange={e => setProductForm({...productForm, meta_description: e.target.value})} 
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-black"
                          placeholder="Descripción breve para Google"
                        />
                      </div>
                    </div>

                    {/* Previsualización SEO Google */}
                    <div className="mt-4 p-4 bg-white border border-gray-150 rounded-xl">
                      <p className="text-[8px] font-bold uppercase text-gray-400 tracking-wider mb-2">Previsualización de Google Search</p>
                      <div className="space-y-1 max-w-full overflow-hidden">
                        <p className="text-[11px] text-zinc-500 font-mono truncate">
                          joyasfran.cl/producto/<span className="text-zinc-650 font-bold">{productForm.slug || 'anillo-de-plata'}</span>
                        </p>
                        <p className="text-base text-blue-800 font-medium hover:underline cursor-pointer truncate font-sans">
                          {productForm.meta_title || productForm.name || 'Título de la Joya | Joyas Fran'}
                        </p>
                        <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-sans font-light">
                          {productForm.meta_description || 'Descubre esta joya de diseño exclusivo en Plata Ley 925. Calidad y elegancia para complementar tu estilo diario en Joyas Fran.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Gestión de Variantes y Stock */}
                  {(() => {
                    const matchedCat = dbCategories.find(c => c.id === Number(productForm.category_id));
                    const catName = matchedCat?.name || '';
                    if (catName && sizeConfig[catName]) {
                      return (
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                          <div>
                            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                              <Package size={14} className="text-zinc-600" /> Variantes y Stock ({catName})
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">Activa las tallas que deseas vender y define sus existencias y precios personalizados.</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sizeConfig[catName].map(sz => {
                              const hasStock = productForm.inventory[sz] !== undefined;
                              return (
                                <div key={sz} className={`p-4 rounded-xl border transition-all ${hasStock ? 'bg-white border-zinc-900/10 shadow-sm' : 'bg-gray-100/50 border-gray-100 opacity-60'}`}>
                                  <div className="flex justify-between items-center mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase text-gray-800">
                                      <input 
                                        type="checkbox" 
                                        checked={hasStock} 
                                        onChange={e => {
                                          const nextInv = { ...productForm.inventory };
                                          if (e.target.checked) {
                                            nextInv[sz] = 0;
                                          } else {
                                            delete nextInv[sz];
                                          }
                                          setProductForm(prev => ({ ...prev, inventory: nextInv }));
                                        }}
                                        className="w-4 h-4 border-gray-300 rounded text-black focus:ring-black"
                                      />
                                      <span>Talla {sz}</span>
                                      {hasStock && productForm.inventory[sz] === 0 && (
                                        <span className="ml-1.5 bg-red-50 text-red-600 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border border-red-200 animate-pulse">Agotado</span>
                                      )}
                                      {hasStock && productForm.inventory[sz] > 0 && productForm.inventory[sz] <= 3 && (
                                        <span className="ml-1.5 bg-amber-50 text-amber-600 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border border-amber-200">Bajo Stock</span>
                                      )}
                                    </label>
                                  </div>
                                  
                                  {hasStock && (
                                    <div className="grid grid-cols-3 gap-1.5 animate-fade-in">
                                      <div>
                                        <span className="text-[8px] text-gray-400 uppercase font-bold block mb-1">Stock</span>
                                        <input 
                                          type="number" 
                                          required
                                          min="0"
                                          value={productForm.inventory[sz]} 
                                          onChange={e => setProductForm(prev => ({ ...prev, inventory: { ...prev.inventory, [sz]: Math.max(0, parseInt(e.target.value) || 0) } }))}
                                          className="w-full p-2 border border-gray-200 rounded text-xs text-center font-bold outline-none focus:border-black"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-gray-400 uppercase font-bold block mb-1">Precio Override</span>
                                        <input 
                                          type="number" 
                                          placeholder="Igual"
                                          value={productForm.variantPrices[sz] || ''} 
                                          onChange={e => setProductForm(prev => ({ ...prev, variantPrices: { ...prev.variantPrices, [sz]: e.target.value } }))}
                                          className="w-full p-2 border border-gray-200 rounded text-xs text-center outline-none focus:border-black"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-gray-400 uppercase font-bold block mb-1">Costo Override</span>
                                        <input 
                                          type="number" 
                                          placeholder="Igual"
                                          value={productForm.variantCosts[sz] || ''} 
                                          onChange={e => setProductForm(prev => ({ ...prev, variantCosts: { ...prev.variantCosts, [sz]: e.target.value } }))}
                                          className="w-full p-2 border border-gray-200 rounded text-xs text-center outline-none focus:border-black"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Sección de Imágenes de Catálogo */}
                  <div className="space-y-4 border-t border-gray-100 pt-6">
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-700 block">Galería del Producto</label>
                      <p className="text-[10px] text-gray-400 mt-1">Sube múltiples imágenes. La primera será la imagen de portada principal.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Subir archivo */}
                      <div className="relative">
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*"
                          onChange={handleProductFileUpload}
                          disabled={isUploadingImgs}
                          onDragOver={() => setIsDragging(true)}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={() => setIsDragging(false)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all ${isUploadingImgs ? 'border-gray-200 bg-gray-50' : isDragging ? 'border-black bg-zinc-50 scale-[1.02]' : 'border-zinc-300 hover:border-black hover:bg-gray-50'}`}>
                          {isUploadingImgs ? (
                            <div className="flex flex-col items-center">
                              <Loader2 className="w-8 h-8 animate-spin text-black mb-2" />
                              <span className="text-xs font-bold text-gray-500">Optimizando y Subiendo...</span>
                            </div>
                          ) : (
                            <>
                              <UploadCloud size={32} className={`mb-2 transition-colors ${isDragging ? 'text-black' : 'text-gray-400'}`} />
                              <span className="text-xs font-bold text-zinc-800">Subir imágenes desde archivos</span>
                              <span className="text-[9px] text-gray-400 mt-1">Formatos WebP, PNG, JPG (Se comprimirá a WebP)</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Pegar Link */}
                      <div className="p-5 border border-zinc-200 rounded-2xl flex flex-col justify-center gap-3">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">O añade una URL externa</span>
                        <input 
                          type="url" 
                          placeholder="Pegar URL y presionar Enter" 
                          value={tempImageUrl} 
                          onChange={e => setTempImageUrl(e.target.value)} 
                          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { 
                            if(e.key === 'Enter') { 
                              e.preventDefault(); 
                              const trm = tempImageUrl.trim(); 
                              if(trm.startsWith('http')) { 
                                setProductForm(p => ({...p, images: [...p.images, trm]})); 
                                setTempImageUrl(''); 
                                toast.success("URL agregada a la galería");
                              } else {
                                toast.error("URL no válida");
                              }
                            } 
                          }} 
                          className="w-full p-3 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:border-black"
                        />
                      </div>
                    </div>
                    
                    {/* Visualizador de Galería actual y Reordenador */}
                    {productForm.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pt-2">
                        {productForm.images.map((img, i) => (
                          <div key={i} className="relative aspect-[3/4] border rounded-xl overflow-hidden group shadow-sm bg-zinc-50 border-zinc-200">
                            <Image src={img} alt="preview" fill sizes="120px" className="object-cover" unoptimized />
                            
                            {/* Overlay de Portada */}
                            {i === 0 ? (
                              <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 shadow">
                                <Star size={8} className="fill-white" /> Portada
                              </div>
                            ) : (
                              <button 
                                type="button" 
                                onClick={() => setProductCoverImage(i)}
                                className="absolute top-2 left-2 bg-white/80 hover:bg-white text-zinc-800 p-1 rounded-md text-[8px] font-bold uppercase tracking-wider shadow opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Hacer Portada
                              </button>
                            )}

                            {/* Reemplazar Imagen */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              <label className="bg-white/90 hover:bg-white text-zinc-800 p-1 rounded-md text-[8px] font-extrabold uppercase tracking-wider shadow cursor-pointer block border border-zinc-200">
                                Reemplazar
                                <input 
                                  type="file"
                                  accept="image/*"
                                  disabled={isUploadingImgs}
                                  onChange={(e) => handleReplaceProductImage(e, i)}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {/* Controles de Reordenamiento manual y borrar */}
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-1">
                                <button 
                                  type="button" 
                                  disabled={i === 0}
                                  onClick={() => moveProductImage(i, 'left')} 
                                  className="text-white hover:text-black hover:bg-white p-1 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                  <ChevronLeft size={12}/>
                                </button>
                                <button 
                                  type="button" 
                                  disabled={i === productForm.images.length - 1}
                                  onClick={() => moveProductImage(i, 'right')} 
                                  className="text-white hover:text-black hover:bg-white p-1 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                  <ChevronRight size={12}/>
                                </button>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setProductForm(p => ({...p, images: p.images.filter((_, idx) => idx !== i)}))} 
                                className="text-red-400 hover:text-red-655 hover:bg-white p-1 rounded transition-colors"
                              >
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Alertas de Validación */}
                  {(() => {
                    const warnings: string[] = [];
                    const finalStock = Object.values(productForm.inventory).reduce((a, b) => a + (Number(b) || 0), 0);
                    
                    if (productForm.images.length === 0) {
                      warnings.push("Debes subir al menos 1 imagen para el producto.");
                    }
                    if (productForm.is_active && finalStock === 0) {
                      warnings.push("El producto está marcado como Activo pero el stock total es 0.");
                    }
                    if (Number(productForm.price) <= 0) {
                      warnings.push("El precio de venta debe ser mayor a 0.");
                    }
                    if (productForm.compare_at_price && Number(productForm.compare_at_price) <= Number(productForm.price)) {
                      warnings.push("El precio normal (tachado) debería ser mayor al precio de oferta.");
                    }

                    if (warnings.length > 0) {
                      return (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5 animate-fade-in">
                          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                            <AlertTriangle size={12} /> Sugerencias de Validación
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-700 font-light">
                            {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <button 
                      type="button" 
                      onClick={async () => {
                        const updated = { ...productForm, is_active: false };
                        setProductForm(updated);
                        await handleSaveWithState(updated);
                      }}
                      disabled={isUploadingImgs} 
                      className="w-full sm:flex-1 border border-zinc-300 hover:border-black text-zinc-800 py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all disabled:opacity-50 text-center"
                    >
                      {editingProductId ? 'Guardar como Borrador' : 'Crear como Borrador'}
                    </button>
                    <button 
                      type="button" 
                      onClick={async () => {
                        const updated = { ...productForm, is_active: true };
                        setProductForm(updated);
                        await handleSaveWithState(updated);
                      }}
                      disabled={isUploadingImgs} 
                      className="w-full sm:flex-1 bg-black hover:bg-zinc-850 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg transition-all disabled:opacity-50 text-center"
                    >
                      {editingProductId ? 'Publicar Cambios' : 'Publicar en Tienda'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setEditingProductId(null); setShowProductForm(false); }} 
                      className="w-full sm:w-auto bg-zinc-100 hover:bg-zinc-200 text-zinc-650 px-6 py-4 rounded-xl font-bold uppercase text-xs tracking-wider text-center"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* LISTADO DE PRODUCTOS */}
            {!showProductForm && (
              <div className="space-y-4">
                {/* Buscador de catálogo */}
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400"/>
                  <input 
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    placeholder="Buscar joya por nombre, SKU, marca, categoría..." 
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-black transition-all shadow-sm"
                  />
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 text-[9px] uppercase font-bold tracking-widest text-gray-400 border-b">
                        <tr>
                          <th className="p-5">Joya</th>
                          <th className="p-5">Precio</th>
                          <th className="p-5 text-center">Estado / Destacados</th>
                          <th className="p-5 text-center">Stock</th>
                          <th className="p-5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="p-5 flex gap-4 items-center">
                              <div className="relative w-12 h-12 rounded-lg border border-gray-150 overflow-hidden bg-zinc-50 flex-shrink-0">
                                {p.image_url && <Image src={p.image_url} alt={p.name} fill sizes="48px" className="object-cover" unoptimized />}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{p.category} <span className="mx-1 text-gray-300">|</span> SKU: {p.sku || p.slug}</p>
                              </div>
                            </td>
                            <td className="p-5">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-950">${p.price.toLocaleString('es-CL')}</span>
                                {p.compare_at_price && <span className="text-[10px] text-red-500 line-through">${p.compare_at_price.toLocaleString('es-CL')}</span>}
                              </div>
                            </td>
                            <td className="p-5 text-center">
                              <div className="flex justify-center items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${p.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-650 border-red-200'}`}>
                                  {p.is_active ? 'Activo' : 'Pausado'}
                                </span>
                                {p.is_featured && (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                                    ★ Home
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-5 text-center">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${p.stock <= 3 ? 'bg-red-50 text-red-600 border-red-150' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                {p.stock} un.
                              </span>
                            </td>
                            <td className="p-5 text-right space-x-1">
                              <button onClick={() => handleEditProductClick(p)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all" title="Editar"><Edit size={15}/></button>
                              <button onClick={() => handleDuplicateProduct(p)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all" title="Duplicar"><Copy size={15}/></button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Eliminar"><Trash2 size={15}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredProducts.length === 0 && <div className="p-12 text-center text-gray-400 text-xs italic">No hay productos que coincidan con la búsqueda.</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB: CATEGORÍAS (CATEGORY CRUD)
            ========================================== */}
        {activeTab === 'categorias' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <TabHeader 
                title="Categorías de Joyas" 
                description="Administra las categorías de la tienda, metadatos y ordenamientos." 
              />
              {!showCategoryForm && (
                <button 
                  onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryForm({ name: '', slug: '', description: '', image_url: '', position: '0', is_active: true, meta_title: '', meta_description: '' });
                    setShowCategoryForm(true);
                  }} 
                  className="bg-black text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-800 transition-colors w-full sm:w-auto justify-center"
                >
                  <Plus size={16}/> Nueva Categoría
                </button>
              )}
            </div>

            {/* FORMULARIO CATEGORÍA */}
            {showCategoryForm && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-up">
                <h3 className="font-serif italic text-xl mb-6 pb-2 border-b">{editingCategoryId ? 'Editar Categoría' : 'Añadir Categoría'}</h3>
                
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Nombre de la Categoría</label>
                      <input 
                        required
                        value={categoryForm.name} 
                        onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                        placeholder="Ej: Anillos, Cadenas..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Slug único</label>
                      <input 
                        value={categoryForm.slug} 
                        onChange={e => setCategoryForm({...categoryForm, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black font-mono text-xs"
                        placeholder="Auto-generado si queda vacío"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Posición de visualización</label>
                      <input 
                        type="number"
                        value={categoryForm.position} 
                        onChange={e => setCategoryForm({...categoryForm, position: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400">Imagen de Portada (URL)</label>
                    <input 
                      value={categoryForm.image_url} 
                      onChange={e => setCategoryForm({...categoryForm, image_url: e.target.value})} 
                      className="w-full p-3 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:border-black"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400">Descripción</label>
                    <textarea 
                      value={categoryForm.description} 
                      onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} 
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black h-20"
                      placeholder="Descripción de la categoría"
                    />
                  </div>

                  {/* SEO y Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Meta Title</label>
                      <input 
                        value={categoryForm.meta_title} 
                        onChange={e => setCategoryForm({...categoryForm, meta_title: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-xs outline-none focus:border-black bg-white"
                        placeholder="Título SEO"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400">Meta Description</label>
                      <input 
                        value={categoryForm.meta_description} 
                        onChange={e => setCategoryForm({...categoryForm, meta_description: e.target.value})} 
                        className="w-full p-3 border border-gray-200 rounded-lg text-xs outline-none focus:border-black bg-white"
                        placeholder="Descripción SEO"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-2">
                    <input 
                      type="checkbox" 
                      id="cat-active"
                      checked={categoryForm.is_active} 
                      onChange={e => setCategoryForm({...categoryForm, is_active: e.target.checked})}
                      className="w-4 h-4 border-gray-300 rounded text-black focus:ring-black"
                    />
                    <label htmlFor="cat-active" className="text-xs font-bold uppercase text-gray-700 cursor-pointer">Categoría Activa</label>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <button type="submit" className="bg-black text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors">Guardar</button>
                    <button type="button" onClick={() => { setEditingCategoryId(null); setShowCategoryForm(false); }} className="bg-zinc-100 text-zinc-600 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider">Cancelar</button>
                  </div>
                </form>
              </div>
            )}

            {/* LISTADO DE CATEGORÍAS */}
            {!showCategoryForm && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400"/>
                  <input 
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    placeholder="Buscar categorías por nombre..." 
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-black transition-all shadow-sm"
                  />
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 text-[9px] uppercase font-bold tracking-widest text-gray-400 border-b">
                        <tr>
                          <th className="p-5">Portada / Categoría</th>
                          <th className="p-5">Slug</th>
                          <th className="p-5 text-center">Posición</th>
                          <th className="p-5 text-center">Estado</th>
                          <th className="p-5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredCategories.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-5 flex gap-4 items-center">
                              <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-50 border flex-shrink-0">
                                {c.image_url && <Image src={c.image_url} alt={c.name} fill className="object-cover" unoptimized />}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{c.name}</p>
                                <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{c.description || 'Sin descripción'}</p>
                              </div>
                            </td>
                            <td className="p-5 font-mono text-xs text-zinc-500">/{c.slug}</td>
                            <td className="p-5 text-center font-bold">{c.position}</td>
                            <td className="p-5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${c.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {c.is_active ? 'Activa' : 'Pausada'}
                              </span>
                            </td>
                            <td className="p-5 text-right space-x-1">
                              <button onClick={() => handleEditCategoryClick(c)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all"><Edit size={14}/></button>
                              <button onClick={() => handleDeleteCategory(c.id, c.name)} className="p-2 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-md transition-all"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB: CUPONES (DISCOUNTS CRUD)
            ========================================== */}
        {activeTab === 'descuentos' && (
          <DiscountsTab
            coupons={coupons}
            filteredCoupons={filteredCoupons}
            couponSearchTerm={couponSearchTerm}
            setCouponSearchTerm={setCouponSearchTerm}
            showCouponForm={showCouponForm}
            setShowCouponForm={setShowCouponForm}
            couponForm={couponForm}
            setCouponForm={setCouponForm}
            editingCouponId={editingCouponId}
            setEditingCouponId={setEditingCouponId}
            handleSaveCoupon={handleSaveCoupon}
            handleEditCouponClick={handleEditCouponClick}
            handleDeleteCoupon={handleDeleteCoupon}
          />
        )}

        {/* ==========================================
            TAB: CONFIGURACIÓN (GLOBAL SETTINGS)
            ========================================== */}
        {activeTab === 'config' && (
          <SettingsTab
            dbCategories={dbCategories}
            sizeConfig={sizeConfig}
            selectedCatForSizes={selectedCatForSizes}
            setSelectedCatForSizes={setSelectedCatForSizes}
            newSize={newSize}
            setNewSize={setNewSize}
            saveSettings={saveSettings}
          />
        )}

        {/* ==========================================
            MODAL: DETALLE COMPLETO DE PEDIDO
            ========================================== */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-gray-900">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Header Modal */}
              <div className="p-5 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-lg md:text-xl font-serif italic flex items-center gap-2">
                    Pedido #{selectedOrder.id.slice(0,8).toUpperCase()}
                    <span className={`text-[9px] not-italic font-sans px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                       selectedOrder.status === 'Pagado' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 border-gray-200'
                    }`}>{selectedOrder.status}</span>
                  </h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 font-mono">
                    <Clock size={12}/> {new Date(selectedOrder.created_at).toLocaleString('es-CL')}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-zinc-400"><X size={20}/></button>
              </div>
              
              {/* Body Modal Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cliente Tarjeta */}
                  <div className="p-4 md:p-5 bg-gray-50 rounded-2xl text-sm border border-gray-100 hover:border-zinc-200 transition-colors relative group">
                    <div className="flex items-center gap-2 mb-3 text-gray-400">
                        <User size={13}/>
                        <p className="text-[9px] font-bold uppercase tracking-widest">Información del Cliente</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="font-bold text-base text-gray-955">{selectedOrder.shipping_info?.firstName} {selectedOrder.shipping_info?.lastName}</p>
                        {selectedOrder.shipping_info?.rut && <p className="text-[10px] text-gray-400 font-mono mt-0.5">RUT: {selectedOrder.shipping_info.rut}</p>}
                      </div>
                      
                      <div className="pt-2 border-t border-zinc-200/50 space-y-2">
                        <div className="flex items-center justify-between group/item">
                          <p className="text-xs text-zinc-600 flex items-center gap-2 truncate pr-2">
                            <Mail size={12} className="text-gray-400 shrink-0"/> 
                            <span className="truncate">{selectedOrder.shipping_info?.email || selectedOrder.email || 'Sin email'}</span>
                          </p>
                          <button onClick={() => copyToClipboard(selectedOrder.shipping_info?.email || selectedOrder.email, 'Email')} className="text-gray-300 hover:text-black opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity" title="Copiar"><Copy size={12}/></button>
                        </div>
                        
                        <div className="flex items-center justify-between group/item">
                          <p className="text-xs text-zinc-600 flex items-center gap-2">
                            <Phone size={12} className="text-gray-400"/> 
                            {selectedOrder.shipping_info?.phone || 'Sin teléfono'}
                          </p>
                          <button onClick={() => copyToClipboard(selectedOrder.shipping_info?.phone, 'Teléfono')} className="text-gray-300 hover:text-black opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity" title="Copiar"><Copy size={12}/></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Envío Tarjeta */}
                  <div className="p-4 md:p-5 bg-gray-50 rounded-2xl text-sm border border-gray-100 hover:border-zinc-200 transition-colors relative group">
                    <div className="flex items-center gap-2 mb-3 text-gray-400">
                        {selectedOrder.shipping_info?.shipping_method === 'pickup' ? <Store size={13}/> : <Truck size={13}/>}
                        <p className="text-[9px] font-bold uppercase tracking-widest">
                            {selectedOrder.shipping_info?.shipping_method === 'pickup' ? 'Retiro en Tienda' : 'Detalles de Despacho'}
                        </p>
                    </div>

                    <div className="space-y-2">
                      {selectedOrder.shipping_info?.shipping_method === 'pickup' ? (
                        <div className="p-2 bg-purple-50 text-purple-700 rounded-md text-[11px] font-bold border border-purple-100 uppercase tracking-wider">
                          Retiro presencial en local
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="pr-2">
                            <p className="font-bold leading-relaxed text-sm text-gray-900">{selectedOrder.shipping_info?.address}</p>
                            {selectedOrder.shipping_info?.apartment && (
                              <p className="text-zinc-600 font-bold bg-zinc-150 px-2 py-0.5 rounded text-[10px] border border-zinc-200 inline-block mt-1">
                                {selectedOrder.shipping_info.apartment}
                              </p>
                            )}
                          </div>
                          <button onClick={() => copyToClipboard(`${selectedOrder.shipping_info?.address} ${selectedOrder.shipping_info?.apartment || ''}, ${selectedOrder.shipping_info?.city}`, 'Dirección')} className="text-gray-300 hover:text-black mt-0.5" title="Copiar"><Copy size={12}/></button>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t border-zinc-200/50">
                        <p className="text-gray-850 font-bold text-xs">{selectedOrder.shipping_info?.city || 'Iquique'}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">{selectedOrder.shipping_info?.region || 'Tarapacá'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ítems del Pedido */}
                <div className="space-y-3">
                  <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Detalle de Artículos</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 border border-gray-155 rounded-xl bg-white shadow-sm">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border bg-zinc-50 flex-shrink-0">
                          {item.image_url && <Image src={item.image_url} alt={item.name} fill className="object-cover" unoptimized />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-xs md:text-sm truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-450 mt-0.5">Talla: <span className="font-bold text-black">{item.selectedSize}</span> <span className="mx-1 text-gray-250">|</span> Cant: {item.quantity}</p>
                        </div>
                        <p className="font-bold text-xs md:text-sm text-gray-955">${(item.price * item.quantity).toLocaleString('es-CL')}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desglose final de caja */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <div className="text-right space-y-1">
                    {selectedOrder.discount_info && (
                      <div className="flex items-center justify-end gap-2 text-green-600">
                        <span className="text-[9px] font-bold uppercase flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                          <Tag size={9} /> {selectedOrder.discount_info.code}
                        </span>
                        <span className="text-xs font-bold">
                          -${selectedOrder.discount_info.amount.toLocaleString('es-CL')}
                        </span>
                      </div>
                    )}
                    <p className="text-[9px] text-gray-450 uppercase tracking-widest font-bold">Monto Total Recibido</p>
                    <p className="text-2xl font-serif italic text-gray-955">${selectedOrder.total_amount.toLocaleString('es-CL')}</p>
                  </div>
                </div>
              </div>
              
              {/* Cambiar Estado del pedido en Modal */}
              <div className="p-5 bg-gray-50 border-t flex flex-col items-center gap-3">
                <span className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Actualizar estado del despacho</span>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {(['Pagado', 'Preparando', 'Enviado', 'Entregado'] as OrderStatus[]).map((s) => (
                    <button 
                      key={s} 
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, s)} 
                      className={`px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                        selectedOrder.status === s 
                          ? 'bg-black text-white border-black shadow-md ring-2 ring-offset-2 ring-black scale-105' 
                          : 'bg-white text-gray-500 border-zinc-200 hover:text-black hover:border-black'
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

        {/* MODAL AUXILIAR INLINE CREAR CATEGORÍA */}
        {showInlineCatModal && (
          <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-md w-full animate-fade-in-up">
              <div className="flex justify-between items-center pb-3 border-b mb-4">
                <h3 className="font-serif italic text-lg text-gray-900">Crear Nueva Categoría</h3>
                <button 
                  type="button"
                  onClick={() => setShowInlineCatModal(false)}
                  className="text-gray-400 hover:text-black transition-colors text-xs font-bold uppercase"
                >
                  Cancelar
                </button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!inlineCatForm.name.trim()) return toast.error("El nombre es obligatorio");
                setIsSavingInlineCat(true);
                
                const resolvedSlug = inlineCatForm.slug.trim() || inlineCatForm.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                const payload = {
                  name: inlineCatForm.name.trim(),
                  slug: resolvedSlug,
                  description: inlineCatForm.description.trim(),
                  image_url: '/img/cat-anillos.webp',
                  position: 0,
                  is_active: true,
                  meta_title: inlineCatForm.name.trim(),
                  meta_description: inlineCatForm.description.trim()
                };

                const { data, error } = await supabase.from('categories').insert(payload).select().single();

                if (!error && data) {
                  toast.success('Categoría creada e ingresada con éxito');
                  setShowInlineCatModal(false);
                  setInlineCatForm({ name: '', slug: '', description: '' });
                  await fetchData();
                  setProductForm(prev => ({ ...prev, category_id: data.id.toString(), category: data.name }));
                } else {
                  console.error(error);
                  toast.error('Error al guardar la categoría. Puede que el slug o nombre ya existan.');
                }
                setIsSavingInlineCat(false);
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 font-sans">Nombre</label>
                  <input 
                    type="text"
                    required
                    value={inlineCatForm.name}
                    onChange={e => {
                      const val = e.target.value;
                      setInlineCatForm(prev => ({
                        ...prev,
                        name: val,
                        slug: val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
                      }));
                    }}
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                    placeholder="Ej: Aros de Boda"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 font-sans">Slug</label>
                  <input 
                    type="text"
                    required
                    value={inlineCatForm.slug}
                    onChange={e => setInlineCatForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') }))}
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm font-mono text-xs outline-none focus:border-black"
                    placeholder="aros-de-boda"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 font-sans">Descripción Corta</label>
                  <textarea 
                    value={inlineCatForm.description}
                    onChange={e => setInlineCatForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black h-20 resize-none"
                    placeholder="Detalles sobre esta categoría..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingInlineCat}
                  className="w-full bg-black hover:bg-zinc-800 text-white py-3 rounded-lg font-bold uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  {isSavingInlineCat ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Crear y Seleccionar'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
      <Footer />
      {showScannerModal && (
        <PhotoScannerModal
          categories={dbCategories}
          onResult={handleAIScanResult}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </div>
  );
}