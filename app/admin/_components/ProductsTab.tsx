'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Plus, Search, Edit, Trash2, Copy } from 'lucide-react';
import type { Product, Category, ProductFormState, Inventory } from '../_types';
import { DEFAULT_MATERIAL } from '../_utils';
import ProductForm from './ProductForm';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductsTabProps {
  // Data
  products: Product[];
  dbCategories: Category[];
  sizeConfig: Record<string, string[]>;
  // Form state
  productForm: ProductFormState;
  setProductForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  showProductForm: boolean;
  setShowProductForm: (v: boolean) => void;
  editingProductId: string | null;
  setEditingProductId: (id: string | null) => void;
  aiPreFilled: boolean;
  setAiPreFilled: (v: boolean) => void;
  isSlugDirty: boolean;
  setIsSlugDirty: (v: boolean) => void;
  // Search
  productSearchTerm: string;
  setProductSearchTerm: (v: string) => void;
  // Scanner
  setShowScannerModal: (v: boolean) => void;
  // Handlers
  onSaveProduct: (formState: ProductFormState) => Promise<void>;
  onEditProduct: (p: Product) => Promise<void>;
  onDuplicateProduct: (p: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  // Sub-tab
  activeSubTab: 'productos' | 'categorias';
  setActiveSubTab: (v: 'productos' | 'categorias') => void;
}

// ─── Default form state ───────────────────────────────────────────────────────

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '', description: '', price: '', compare_at_price: '', cost_price: '',
  category_id: '', category: '', slug: '',
  sku: '', supplier_code: '', barcode: '', brand: 'Joyas Fran', collection: '',
  material: DEFAULT_MATERIAL, is_featured: false, is_new: false, is_active: true,
  meta_title: '', meta_description: '',
  images: [], inventory: {} as Inventory,
  variantPrices: {}, variantCosts: {},
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductsTab({
  products,
  dbCategories,
  sizeConfig,
  productForm,
  setProductForm,
  showProductForm,
  setShowProductForm,
  editingProductId,
  setEditingProductId,
  aiPreFilled,
  setAiPreFilled,
  isSlugDirty,
  setIsSlugDirty,
  productSearchTerm,
  setProductSearchTerm,
  setShowScannerModal,
  onSaveProduct,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  activeSubTab,
  setActiveSubTab,
}: ProductsTabProps) {
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products;
    const lower = productSearchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.sku?.toLowerCase().includes(lower) ||
      p.category?.toLowerCase().includes(lower)
    );
  }, [products, productSearchTerm]);

  const handleCancel = () => {
    setEditingProductId(null);
    setShowProductForm(false);
    setProductForm(EMPTY_PRODUCT_FORM);
    setIsSlugDirty(false);
    setAiPreFilled(false);
  };

  const handleNewManual = () => {
    setEditingProductId(null);
    setProductForm(EMPTY_PRODUCT_FORM);
    setIsSlugDirty(false);
    setAiPreFilled(false);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header con sub-tabs ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-serif italic text-gray-900">Catálogo</h2>
          <p className="text-xs text-gray-500 font-light mt-0.5">
            Administra las joyas que aparecen en tu tienda.
          </p>
        </div>

        {/* Sub-tabs: Productos / Categorías */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('productos')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeSubTab === 'productos' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Joyas
          </button>
          <button
            onClick={() => setActiveSubTab('categorias')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${activeSubTab === 'categorias' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Categorías
          </button>
        </div>
      </div>

      {/* ── Sub-tab: Joyas (Productos) ─────────────────────────── */}
      {activeSubTab === 'productos' && (
        <div className="space-y-5">

           {/* Botones de acción (solo cuando NO está el form abierto) */}
          {!showProductForm && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleNewManual}
                className="bg-black text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-800 transition-colors shadow-sm w-full sm:w-auto justify-center"
              >
                <Plus size={14} /> Nueva joya
              </button>
            </div>
          )}

          {/* Formulario creación / edición */}
          {showProductForm && (
            <ProductForm
              productForm={productForm}
              setProductForm={setProductForm}
              editingProductId={editingProductId}
              dbCategories={dbCategories}
              sizeConfig={sizeConfig}
              aiPreFilled={aiPreFilled}
              setAiPreFilled={setAiPreFilled}
              isSlugDirty={isSlugDirty}
              onSave={onSaveProduct}
              onCancel={handleCancel}
              onScanWithAI={() => setShowScannerModal(true)}
              onGoToCategories={() => { handleCancel(); setActiveSubTab('categorias'); }}
            />
          )}

          {/* Lista de productos */}
          {!showProductForm && (
            <div className="space-y-4">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  value={productSearchTerm}
                  onChange={e => setProductSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o categoría..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-black transition-all shadow-sm"
                />
              </div>

              {/* Vista Desktop: Tabla */}
              <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-[9px] uppercase font-bold tracking-widest text-gray-400 border-b">
                      <tr>
                        <th className="p-5">Joya</th>
                        <th className="p-5">Precio</th>
                        <th className="p-5 text-center">Estado</th>
                        <th className="p-5 text-center">Stock</th>
                        <th className="p-5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="p-5">
                            <div className="flex gap-4 items-center">
                              <div className="relative w-12 h-12 rounded-lg border border-gray-150 overflow-hidden bg-zinc-50 flex-shrink-0">
                                {p.image_url && <Image src={p.image_url} alt={p.name} fill sizes="48px" className="object-cover" unoptimized />}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                                  {p.category}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <span className="font-bold text-gray-950">${p.price.toLocaleString('es-CL')}</span>
                            {p.compare_at_price && (
                              <span className="block text-[10px] text-red-500 line-through">${p.compare_at_price.toLocaleString('es-CL')}</span>
                            )}
                          </td>
                          <td className="p-5 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${p.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-650 border-red-200'}`}>
                                {p.is_active ? 'Activo' : 'Pausado'}
                              </span>
                              {p.is_featured && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[8px] font-bold uppercase">★ Inicio</span>
                              )}
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${p.stock <= 3 ? 'bg-red-50 text-red-600 border-red-150' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                              {p.stock} un.
                            </span>
                          </td>
                          <td className="p-5 text-right space-x-1">
                            <button onClick={() => onEditProduct(p)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all" title="Editar">
                              <Edit size={15} />
                            </button>
                            <button onClick={() => onDuplicateProduct(p)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all" title="Duplicar">
                              <Copy size={15} />
                            </button>
                            <button onClick={() => onDeleteProduct(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Eliminar">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vista Móvil: Tarjetas responsivas */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex gap-4 items-start relative">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-50 border border-zinc-100 flex-shrink-0">
                      {p.image_url && <Image src={p.image_url} alt={p.name} fill sizes="64px" className="object-cover" unoptimized />}
                    </div>
                    <div className="flex-grow space-y-1.5 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-zinc-950 text-sm truncate">{p.name}</p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{p.category}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border flex-shrink-0 ${p.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {p.is_active ? 'Activo' : 'Pausado'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-1 border-t border-zinc-50">
                        <div>
                          <span className="font-bold text-xs text-zinc-950">${p.price.toLocaleString('es-CL')}</span>
                          {p.compare_at_price && (
                            <span className="text-[9px] text-red-500 line-through ml-1.5">${p.compare_at_price.toLocaleString('es-CL')}</span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${p.stock <= 3 ? 'bg-red-50 text-red-600 border-red-150' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                          {p.stock} un.
                        </span>
                      </div>

                      {/* Acciones */}
                      <div className="flex justify-end gap-1.5 pt-2 border-t border-zinc-50">
                        <button onClick={() => onEditProduct(p)} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-all">
                          <Edit size={12} /> Editar
                        </button>
                        <button onClick={() => onDuplicateProduct(p)} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-all" title="Duplicar">
                          <Copy size={12} />
                        </button>
                        <button onClick={() => onDeleteProduct(p.id)} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-lg transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="p-12 text-center text-gray-400 text-xs italic bg-white rounded-2xl border border-zinc-200">
                  {productSearchTerm ? 'No hay joyas que coincidan con la búsqueda.' : 'No hay joyas en el catálogo aún.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
