'use client';

import { useState, KeyboardEvent, DragEvent } from 'react';
import Image from 'next/image';
import { Search, Plus, Edit, Trash2, ChevronDown, ChevronUp, UploadCloud, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseBrowser as supabase } from '@/lib/supabase-browser';
import { convertToWebp } from '@/lib/images';
import { type Category } from '../_types';

interface CategoriesTabProps {
  dbCategories: Category[];
  filteredCategories: Category[];
  categorySearchTerm: string;
  setCategorySearchTerm: (term: string) => void;
  showCategoryForm: boolean;
  setShowCategoryForm: (show: boolean) => void;
  categoryForm: {
    name: string;
    slug: string;
    description: string;
    image_url: string;
    position: string;
    is_active: boolean;
    meta_title: string;
    meta_description: string;
  };
  setCategoryForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      slug: string;
      description: string;
      image_url: string;
      position: string;
      is_active: boolean;
      meta_title: string;
      meta_description: string;
    }>
  >;
  editingCategoryId: number | null;
  setEditingCategoryId: (id: number | null) => void;
  handleSaveCategory: (e: React.FormEvent) => Promise<any>;
  handleEditCategoryClick: (c: Category) => void;
  handleDeleteCategory: (id: number, name: string) => Promise<void>;
  sizeConfig: Record<string, string[]>;
  saveSettings: (key: string, value: Record<string, string[]>) => Promise<void>;
}

export default function CategoriesTab({
  dbCategories,
  filteredCategories,
  categorySearchTerm,
  setCategorySearchTerm,
  showCategoryForm,
  setShowCategoryForm,
  categoryForm,
  setCategoryForm,
  editingCategoryId,
  setEditingCategoryId,
  handleSaveCategory,
  handleEditCategoryClick,
  handleDeleteCategory,
  sizeConfig,
  saveSettings,
}: CategoriesTabProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newSize, setNewSize] = useState('');

  const currentCategoryName = categoryForm.name.trim();
  const currentCategorySizes = sizeConfig[currentCategoryName] || [];

  const handleAddSize = async () => {
    if (!currentCategoryName) {
      toast.error('Por favor ingresa primero el nombre de la categoría.');
      return;
    }
    const cleanSize = newSize.trim();
    if (!cleanSize) return;
    if (currentCategorySizes.includes(cleanSize)) {
      toast.error('Esta talla ya está configurada.');
      return;
    }
    const updatedSizes = {
      ...sizeConfig,
      [currentCategoryName]: [...currentCategorySizes, cleanSize]
    };
    await saveSettings('sizes', updatedSizes);
    setNewSize('');
  };

  const handleRemoveSize = async (sizeToRemove: string) => {
    const updatedSizes = {
      ...sizeConfig,
      [currentCategoryName]: currentCategorySizes.filter(s => s !== sizeToRemove)
    };
    await saveSettings('sizes', updatedSizes);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingImg(true);
    const file = e.target.files[0];
    toast.loading('Subiendo imagen de categoría...', { id: 'catUploadToast' });
    try {
      const webpBlob = await convertToWebp(file);
      const fileName = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, webpBlob, { contentType: 'image/webp', cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
      setCategoryForm(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('¡Imagen subida con éxito!', { id: 'catUploadToast' });
    } catch (err) {
      console.error(err);
      toast.error('Error al subir la imagen.', { id: 'catUploadToast' });
    } finally {
      setIsUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleFileDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    setIsUploadingImg(true);
    const file = e.dataTransfer.files[0];
    toast.loading('Subiendo imagen de categoría...', { id: 'catUploadToast' });
    try {
      const webpBlob = await convertToWebp(file);
      const fileName = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, webpBlob, { contentType: 'image/webp', cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
      setCategoryForm(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('¡Imagen subida con éxito!', { id: 'catUploadToast' });
    } catch (err) {
      console.error(err);
      toast.error('Error al subir la imagen.', { id: 'catUploadToast' });
    } finally {
      setIsUploadingImg(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!showCategoryForm && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              setEditingCategoryId(null);
              setCategoryForm({
                name: '',
                slug: '',
                description: '',
                image_url: '',
                position: '0',
                is_active: true,
                meta_title: '',
                meta_description: '',
              });
              setShowCategoryForm(true);
              setShowAdvanced(false);
            }}
            className="bg-black text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-800 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={16} /> Nueva Categoría
          </button>
        </div>
      )}

      {/* FORMULARIO CATEGORÍA */}
      {showCategoryForm && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-up">
          <h3 className="font-serif italic text-xl mb-6 pb-2 border-b">
            {editingCategoryId ? 'Editar Categoría' : 'Añadir Categoría'}
          </h3>

          <form onSubmit={handleSaveCategory} className="space-y-5">
            {/* Nombre */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">
                Nombre
              </label>
              <input
                required
                value={categoryForm.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const genSlug = val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                  setCategoryForm(prev => ({
                    ...prev,
                    name: val,
                    slug: prev.slug === prev.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') || !prev.slug
                      ? genSlug
                      : prev.slug
                  }));
                }}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                placeholder="Ej: Anillos, Collares, Aros..."
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Descripción (Opcional)</label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black h-20 resize-none"
                placeholder="Describe qué tipos de joyas pertenecen a esta categoría..."
              />
            </div>

            {/* Imagen de categoría */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400">Imagen de categoría</label>
              
              {categoryForm.image_url ? (
                <div className="relative w-40 h-28 border border-zinc-200 rounded-xl overflow-hidden group">
                  <Image
                    src={categoryForm.image_url}
                    alt="Vista previa de la categoría"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCategoryForm(prev => ({ ...prev, image_url: '' }))}
                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black text-white p-1 rounded-full transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploadingImg}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all
                    ${isUploadingImg ? 'border-gray-200 bg-gray-50' : isDragging ? 'border-black bg-zinc-50 scale-[1.01]' : 'border-zinc-300 hover:border-black hover:bg-gray-50'}`}
                  >
                    {isUploadingImg ? (
                      <div className="flex flex-col items-center gap-1">
                        <Loader2 className="w-5 h-5 animate-spin text-black" />
                        <span className="text-[10px] font-bold text-gray-400">Subiendo imagen...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={20} className={`mb-1 transition-colors ${isDragging ? 'text-black' : 'text-gray-400'}`} />
                        <span className="text-xs font-bold text-zinc-700">Subir imagen</span>
                        <span className="text-[9px] text-gray-400 mt-0.5">Arrastra el archivo o haz clic aquí</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mostrar en la tienda (Switches Sí/No) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-gray-400">Mostrar en la tienda</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryForm(prev => ({ ...prev, is_active: true }))}
                  className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                    categoryForm.is_active
                      ? 'bg-black border-black text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryForm(prev => ({ ...prev, is_active: false }))}
                  className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                    !categoryForm.is_active
                      ? 'bg-black border-black text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Aviso de Catálogo */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs font-light space-y-1">
              <span className="font-bold text-[10px] uppercase tracking-wider block">⚠️ Información importante</span>
              <p>Las categorías no aparecerán en el catálogo de la tienda pública a menos que tengan al menos un producto activo asociado.</p>
            </div>

            {/* Gestión de Tallas para esta Categoría */}
            <div className="space-y-3 p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-500 block">Tallas de esta Categoría</span>
                <span className="text-[9px] text-zinc-400">Define las tallas disponibles para los productos de esta categoría (ej: 6, 7, 8, Ajustable). Las tallas se guardan inmediatamente.</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva talla (Ej: 6, 7, Ajustable, Única)"
                  value={newSize}
                  onChange={e => setNewSize(e.target.value)}
                  className="flex-grow p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-black bg-white"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSize();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSize}
                  className="bg-black text-white px-4 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center text-xs font-bold shrink-0"
                >
                  Añadir Talla
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {currentCategorySizes.map(size => (
                  <div key={size} className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 shadow-sm">
                    <span>{size}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSize(size)}
                      className="text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {currentCategorySizes.length === 0 && (
                  <p className="text-[10px] text-zinc-400 italic">No hay tallas configuradas para esta categoría.</p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-3 border-t">
              <button
                type="submit"
                className="bg-black text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors"
              >
                Guardar categoría
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCategoryId(null);
                  setShowCategoryForm(false);
                }}
                className="bg-zinc-100 text-zinc-600 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTADO DE CATEGORÍAS */}
      {!showCategoryForm && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
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
                  {filteredCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-5 flex gap-4 items-center">
                        <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-50 border flex-shrink-0">
                          {c.image_url && (
                            <Image
                              src={c.image_url}
                              alt={c.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[200px]">
                            {c.description || 'Sin descripción'}
                          </p>
                        </div>
                      </td>
                      <td className="p-5 font-mono text-xs text-zinc-500">/{c.slug}</td>
                      <td className="p-5 text-center font-bold">{c.position}</td>
                      <td className="p-5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            c.is_active
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {c.is_active ? 'Activa' : 'Pausada'}
                        </span>
                      </td>
                      <td className="p-5 text-right space-x-1">
                        <button
                          onClick={() => handleEditCategoryClick(c)}
                          className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="p-2 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCategories.length === 0 && (
              <div className="p-12 text-center text-gray-400 text-xs italic">
                {categorySearchTerm ? 'No hay categorías que coincidan con la búsqueda.' : 'No hay categorías creadas aún. Haz clic en "Nueva Categoría" para crear una.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
