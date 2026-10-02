'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { ClipboardList, Tag, Percent, Settings, LayoutDashboard, PanelsTopLeft } from 'lucide-react';
import { toast } from 'sonner';

import DiscountsTab from './_components/DiscountsTab';
import PhotoScannerModal from './_components/PhotoScannerModal';
import OrdersTab from './_components/OrdersTab';
import CategoriesTab from './_components/CategoriesTab';
import ProductsTab, { EMPTY_PRODUCT_FORM } from './_components/ProductsTab';
import DashboardTab from './_components/DashboardTab';
import SettingsTab from './_components/SettingsTab';
import WebsiteTab from './_components/WebsiteTab';
import { DEFAULT_MATERIAL } from './_utils';

import {
  type TabView,
  type OrderStatus,
  type SettingValue,
  type StoreSettingRow,
  type Order,
  type Product,
  type Category,
  type Coupon,
  type ProductFormState,
  type CategoryFormState,
  type CouponFormState,
} from './_types';

// ─── Nav Tabs config ─────────────────────────────────────────────────────────

const NAV_TABS = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
  { id: 'productos', label: 'Catálogo', icon: Tag },
  { id: 'descuentos', label: 'Promociones', icon: Percent },
  { id: 'pagina', label: 'Página web', icon: PanelsTopLeft },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('inicio');
  const [activeSubTab, setActiveSubTab] = useState<'productos' | 'categorias'>('productos');

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [sizeConfig, setSizeConfig] = useState<Record<string, string[]>>({});

  // ── Orders state ─────────────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  // ── Products state ───────────────────────────────────────────────────────────
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [aiPreFilled, setAiPreFilled] = useState(false);
  const [isSlugDirty, setIsSlugDirty] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // ── Categories state ─────────────────────────────────────────────────────────
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: '', slug: '', description: '', image_url: '', position: '0',
    is_active: true, meta_title: '', meta_description: '',
  });
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm) return dbCategories;
    const lower = categorySearchTerm.toLowerCase();
    return dbCategories.filter(c =>
      c.name.toLowerCase().includes(lower) || c.slug.toLowerCase().includes(lower)
    );
  }, [dbCategories, categorySearchTerm]);

  // ── Coupons state ────────────────────────────────────────────────────────────
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [couponForm, setCouponForm] = useState<CouponFormState>({
    code: '', type: 'percent', value: '', min_purchase: '', is_active: true,
  });
  const [couponSearchTerm, setCouponSearchTerm] = useState('');
  const filteredCoupons = useMemo(() => {
    if (!couponSearchTerm) return coupons;
    const lower = couponSearchTerm.toLowerCase();
    return coupons.filter(c => c.code.toLowerCase().includes(lower));
  }, [coupons, couponSearchTerm]);



  // ─── Data fetch ──────────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      // Fetch orders, settings and coupons via supabase client, and categories/products via proxy API
      const [ordersRes, settingsRes, couponsRes, categoriesData, productsData] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('store_settings').select('*'),
        supabase.from('coupons').select('*').order('id', { ascending: false }),
        fetch('/api/admin/categories').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/products').then(r => r.ok ? r.json() : null),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (productsData) setProducts(productsData as Product[]);
      if (categoriesData) setDbCategories(categoriesData as Category[]);
      if (couponsRes.data) setCoupons(couponsRes.data as Coupon[]);

      if (settingsRes.data) {
        const newSizeConfig: Record<string, string[]> = {};
        (settingsRes.data as StoreSettingRow[]).forEach(item => {
          if (item.key === 'sizes' && typeof item.value === 'object' && !Array.isArray(item.value)) {
            Object.assign(newSizeConfig, item.value);
          }
        });
        setSizeConfig(newSizeConfig);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const verifyRes = await fetch('/api/admin/verify');
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.isAdmin) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) router.replace('/login?redirect=/admin');
          else router.replace('/');
          return;
        }
        await fetchData();
      } catch {
        router.replace('/');
      }
    };
    init();
  }, [router]);

  // ─── Order handlers ───────────────────────────────────────────────────────────

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const prev = [...orders];
    setOrders(o => o.map(x => x.id === orderId ? { ...x, status: newStatus } : x));
    if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: newStatus });
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      setOrders(prev);
      toast.error('Error al actualizar el estado del pedido');
    } else {
      toast.success(`Pedido marcado como ${newStatus}`);
    }
  };

  const copyToClipboard = (text: string | undefined, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  // ─── Product handlers ─────────────────────────────────────────────────────────

  const slugify = (text: string) =>
    text.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');

  const handleSaveProduct = async (formState: ProductFormState) => {
    if (!formState.name || !formState.price) { toast.error('Nombre y precio son obligatorios'); return; }
    if (formState.images.length === 0) { toast.error('Debes incluir al menos 1 foto'); return; }

    const finalStock = Object.values(formState.inventory).reduce((a, b) => a + (Number(b) || 0), 0);
    const resolvedCat = dbCategories.find(c => c.id === Number(formState.category_id));
    const resolvedSlug = formState.slug.trim() || slugify(formState.name);

    const payload = {
      name: formState.name,
      description: formState.description.trim() || null,
      price: Number(formState.price),
      compare_at_price: formState.compare_at_price ? Number(formState.compare_at_price) : null,
      cost_price: 0,
      category: resolvedCat?.name || formState.category || '',
      category_id: formState.category_id ? Number(formState.category_id) : null,
      image_url: formState.images[0] || '',
      slug: resolvedSlug,
      stock: finalStock,
      inventory: formState.inventory,
      images: formState.images,
      sku: formState.sku.trim() || resolvedSlug,
      supplier_code: formState.supplier_code.trim() || null,
      barcode: formState.barcode.trim() || null,
      brand: formState.brand.trim() || 'Joyas Fran',
      collection: formState.collection.trim() || null,
      material: formState.material.trim() || DEFAULT_MATERIAL,
      is_featured: formState.is_featured,
      is_new: formState.is_new,
      is_active: formState.is_active,
      meta_title: formState.meta_title.trim() || formState.name,
      meta_description: formState.meta_description.trim() || formState.name,
    };

    const url = editingProductId ? `/api/admin/products?id=${editingProductId}` : '/api/admin/products';
    const variantsToUpsert = Object.keys(formState.inventory).map(sz => ({
      sku: `${payload.sku || payload.slug}-${sz}`,
      size: sz,
      stock: formState.inventory[sz] || 0,
      price_override: formState.variantPrices[sz] ? Number(formState.variantPrices[sz]) : null,
      cost_price: null,
    }));

    try {
      const res = await fetch(url, {
        method: editingProductId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, variantsToUpsert }),
      });

      if (res.ok) {
        toast.success(editingProductId ? 'Joya actualizada' : 'Joya publicada');
        setEditingProductId(null);
        setShowProductForm(false);
        setProductForm(EMPTY_PRODUCT_FORM);
        setIsSlugDirty(false);
        setAiPreFilled(false);
        await fetchData();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error(error);
      toast.error('No pudimos guardar la joya. Intenta nuevamente.');
    }
  };

  const handleEditProductClick = async (p: Product) => {
    const { data: variantsData } = await supabase
      .from('product_variants').select('*').eq('product_id', p.id);

    const prices: Record<string, string> = {};
    const costs: Record<string, string> = {};
    const inv: Record<string, number> = {};

    (variantsData || []).forEach(v => {
      inv[v.size] = v.stock;
      if (v.price_override != null) prices[v.size] = v.price_override.toString();
      if (v.cost_price != null) costs[v.size] = v.cost_price.toString();
    });

    setEditingProductId(p.id);
    setProductForm({
      name: p.name, description: p.description || '',
      price: p.price.toString(), compare_at_price: p.compare_at_price?.toString() || '',
      cost_price: '', category_id: p.category_id?.toString() || '', category: p.category || '',
      slug: p.slug || '', sku: p.sku || '', supplier_code: p.supplier_code || '',
      barcode: p.barcode || '', brand: p.brand || 'Joyas Fran',
      collection: p.collection || '', material: p.material || DEFAULT_MATERIAL,
      is_featured: p.is_featured ?? false, is_new: p.is_new ?? false, is_active: p.is_active ?? true,
      meta_title: p.meta_title || '', meta_description: p.meta_description || '',
      images: p.images || [p.image_url],
      inventory: Object.keys(inv).length > 0 ? inv : (p.inventory || {}),
      variantPrices: prices, variantCosts: costs,
    });
    setIsSlugDirty(true);
    setAiPreFilled(false);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicateProduct = async (p: Product) => {
    const { data: variantsData } = await supabase
      .from('product_variants').select('*').eq('product_id', p.id);

    const prices: Record<string, string> = {};
    const costs: Record<string, string> = {};
    const inv: Record<string, number> = {};
    (variantsData || []).forEach(v => {
      inv[v.size] = v.stock;
      if (v.price_override != null) prices[v.size] = v.price_override.toString();
      if (v.cost_price != null) costs[v.size] = v.cost_price.toString();
    });

    setEditingProductId(null);
    setProductForm({
      name: `${p.name} (Copia)`, description: p.description || '',
      price: p.price.toString(), compare_at_price: p.compare_at_price?.toString() || '',
      cost_price: '', category_id: p.category_id?.toString() || '', category: p.category || '',
      slug: `${p.slug}-copia`, sku: p.sku ? `${p.sku}-copia` : '',
      supplier_code: p.supplier_code || '', barcode: p.barcode || '',
      brand: p.brand || 'Joyas Fran', collection: p.collection || '',
      material: p.material || DEFAULT_MATERIAL,
      is_featured: p.is_featured ?? false, is_new: p.is_new ?? false, is_active: false,
      meta_title: p.meta_title ? `${p.meta_title} Copia` : '', meta_description: p.meta_description || '',
      images: p.images || [p.image_url], inventory: inv,
      variantPrices: prices, variantCosts: costs,
    });
    setIsSlugDirty(true);
    setAiPreFilled(false);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Copia cargada en el formulario.');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar esta joya? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Joya eliminada');
        await fetchData();
      } else {
        throw new Error('Error al eliminar');
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudo eliminar');
    }
  };

  // ─── AI Scanner handler ───────────────────────────────────────────────────────

  const handleAIScanResult = (result: {
    name: string; description: string; category: string;
    category_id: number | null; material: string; collection: string | null;
    meta_title: string; meta_description: string; imageUrl: string;
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

  // ─── Category handlers ────────────────────────────────────────────────────────

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }
    const resolvedSlug = categoryForm.slug.trim() ||
      categoryForm.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const payload = {
      name: categoryForm.name.trim(), slug: resolvedSlug,
      description: categoryForm.description.trim(),
      image_url: categoryForm.image_url.trim() || '/img/cat-anillos.webp',
      position: Number(categoryForm.position) || 0, is_active: categoryForm.is_active,
      meta_title: categoryForm.meta_title.trim() || categoryForm.name.trim(),
      meta_description: categoryForm.meta_description.trim() || categoryForm.description.trim(),
    };
    const url = editingCategoryId ? `/api/admin/categories?id=${editingCategoryId}` : '/api/admin/categories';
    try {
      const res = await fetch(url, {
        method: editingCategoryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingCategoryId ? 'Categoría actualizada' : 'Categoría creada');
        setEditingCategoryId(null);
        setShowCategoryForm(false);
        setCategoryForm({ name: '', slug: '', description: '', image_url: '', position: '0', is_active: true, meta_title: '', meta_description: '' });
        await fetchData();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar la categoría');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la categoría');
    }
  };

  const handleEditCategoryClick = (c: Category) => {
    setEditingCategoryId(c.id);
    setCategoryForm({
      name: c.name, slug: c.slug, description: c.description || '',
      image_url: c.image_url || '', position: c.position.toString(),
      is_active: c.is_active, meta_title: c.meta_title || '',
      meta_description: c.meta_description || '',
    });
    setShowCategoryForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`¿Borrar la categoría "${name}"? Los productos quedarán sin categoría.`)) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Categoría eliminada');
        await fetchData();
      } else {
        throw new Error('Error al eliminar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar categoría');
    }
  };

  // ─── Coupon handlers ──────────────────────────────────────────────────────────

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code) return toast.error('El código es obligatorio');
    if (!couponForm.value) return toast.error('El valor del descuento es obligatorio');
    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      type: couponForm.type, value: Number(couponForm.value),
      min_purchase: Number(couponForm.min_purchase) || 0, is_active: couponForm.is_active,
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
    setCouponForm({ code: c.code, type: c.type, value: c.value.toString(), min_purchase: c.min_purchase.toString(), is_active: c.is_active });
    setShowCouponForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCoupon = async (id: number, code: string) => {
    if (!confirm(`¿Eliminar la promoción "${code}"?`)) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (!error) { toast.success('Promoción eliminada'); await fetchData(); }
    else toast.error('No se pudo eliminar el cupón');
  };

  const saveSettings = async (key: string, value: SettingValue) => {
    const { error } = await supabase.from('store_settings').upsert({ key, value }, { onConflict: 'key' });
    if (!error) { toast.success('Configuración actualizada'); await fetchData(); }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Cargando...</span>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 selection:bg-black selection:text-white pb-16 md:pb-0">

      {/* Header móvil superior */}
      <div className="bg-[#121212] text-white border-b border-zinc-800 sticky top-0 z-30 shadow-md w-full md:hidden">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            <span className="font-serif italic text-lg tracking-wide">Joyas Fran Admin</span>
          </div>
        </div>
      </div>

      {/* Barra de navegación de escritorio */}
      <div className="bg-[#121212] text-white border-b border-zinc-800 sticky top-0 z-30 shadow-md w-full hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <h1 className="font-serif italic text-2xl tracking-wide">Joyas Fran Admin</h1>
          </div>
          <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg">
            {NAV_TABS.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setActiveSubTab('productos');
                    setShowProductForm(false);
                    setShowCategoryForm(false);
                    setShowCouponForm(false);
                  }}
                  className={`px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                >
                  <TabIcon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra de navegación inferior móvil */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212] border-t border-zinc-800 text-white shadow-lg flex justify-around items-center py-2 md:hidden">
        {NAV_TABS.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setActiveSubTab('productos');
                setShowProductForm(false);
                setShowCategoryForm(false);
                setShowCouponForm(false);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${isActive ? 'text-white scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <TabIcon size={18} className={isActive ? 'text-white' : 'text-zinc-500'} />
              <span className={`text-[8px] font-bold uppercase tracking-wider mt-0.5 ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-grow w-full pb-20 md:pb-8 animate-fade-in">

        {/* INICIO */}
        {activeTab === 'inicio' && (
          <DashboardTab
            orders={orders}
            products={products}
            onViewReplenishmentProducts={() => {
              setActiveTab('productos');
              setActiveSubTab('productos');
            }}
          />
        )}

        {/* PEDIDOS */}
        {activeTab === 'pedidos' && (
          <OrdersTab
            orders={orders}
            orderSearchTerm={orderSearchTerm}
            setOrderSearchTerm={setOrderSearchTerm}
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            handleUpdateOrderStatus={handleUpdateOrderStatus}
            copyToClipboard={copyToClipboard}
          />
        )}

        {/* CATÁLOGO — incluye sub-tab Categorías */}
        {activeTab === 'productos' && (
          <>
            {/* Sub-tab: Joyas + Categorías */}
            <ProductsTab
              products={products}
              dbCategories={dbCategories}
              sizeConfig={sizeConfig}
              productForm={productForm}
              setProductForm={setProductForm}
              showProductForm={showProductForm}
              setShowProductForm={setShowProductForm}
              editingProductId={editingProductId}
              setEditingProductId={setEditingProductId}
              aiPreFilled={aiPreFilled}
              setAiPreFilled={setAiPreFilled}
              isSlugDirty={isSlugDirty}
              setIsSlugDirty={setIsSlugDirty}
              productSearchTerm={productSearchTerm}
              setProductSearchTerm={setProductSearchTerm}
              setShowScannerModal={setShowScannerModal}
              onSaveProduct={handleSaveProduct}
              onEditProduct={handleEditProductClick}
              onDuplicateProduct={handleDuplicateProduct}
              onDeleteProduct={handleDeleteProduct}
              activeSubTab={activeSubTab}
              setActiveSubTab={setActiveSubTab}
            />

            {/* Sub-tab: Categorías (renderizado debajo del selector) */}
            {activeSubTab === 'categorias' && (
              <div className="mt-6">
                <CategoriesTab
                  filteredCategories={filteredCategories}
                  categorySearchTerm={categorySearchTerm}
                  setCategorySearchTerm={setCategorySearchTerm}
                  showCategoryForm={showCategoryForm}
                  setShowCategoryForm={setShowCategoryForm}
                  categoryForm={categoryForm}
                  setCategoryForm={setCategoryForm}
                  editingCategoryId={editingCategoryId}
                  setEditingCategoryId={setEditingCategoryId}
                  handleSaveCategory={handleSaveCategory}
                  handleEditCategoryClick={handleEditCategoryClick}
                  handleDeleteCategory={handleDeleteCategory}
                  sizeConfig={sizeConfig}
                  saveSettings={saveSettings}
                />
              </div>
            )}
          </>
        )}

        {/* VENTAS (Cupones / Descuentos) */}
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

        <div hidden={activeTab !== 'pagina'}><WebsiteTab products={products} /></div>

        {/* AJUSTES */}
        {activeTab === 'ajustes' && (
          <SettingsTab
            dbCategories={dbCategories}
            sizeConfig={sizeConfig}
            saveSettings={saveSettings}
          />
        )}

      </main>

      {/* Scanner Modal */}
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
