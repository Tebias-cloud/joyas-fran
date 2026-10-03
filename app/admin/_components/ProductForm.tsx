'use client';

import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import Image from 'next/image';
import {
  X, UploadCloud, ChevronLeft, ChevronRight,
  Star, Loader2, Sparkles, ChevronDown, ChevronUp, Copy, Instagram
} from 'lucide-react';
import { toast } from 'sonner';
import { supabaseBrowser as supabase } from '@/lib/supabase-browser';
import { validatePhoto } from '@/lib/product-photo';
import type { ProductFormState, Category } from '../_types';
import { isSampleSku } from '@/lib/sample-catalog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductFormProps {
  productForm: ProductFormState;
  setProductForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  editingProductId: string | null;
  dbCategories: Category[];
  sizeConfig: Record<string, string[]>;
  aiPreFilled: boolean;
  setAiPreFilled: (v: boolean) => void;
  isSlugDirty: boolean;
  onSave: (formState: ProductFormState) => Promise<void>;
  onCancel: () => void;
  onScanWithAI?: () => void;
  onGoToCategories?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');

async function uploadOriginalPhoto(file: File) {
  validatePhoto(file);
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  const fileName = `${crypto.randomUUID()}-original.${extension}`;
  const { error } = await supabase.storage.from('products').upload(fileName, file, {
    contentType: file.type, cacheControl: '3600', upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl;
}

const AIBadge = () => (
  <span className="inline-flex items-center gap-0.5 bg-violet-100 text-violet-700 border border-violet-200 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
    <Sparkles size={8} /> IA
  </span>
);

export default function ProductForm({
  productForm,
  setProductForm,
  editingProductId,
  dbCategories,
  sizeConfig,
  aiPreFilled,
  setAiPreFilled,
  isSlugDirty,
  onSave,
  onCancel,
  onScanWithAI,
  onGoToCategories,
}: ProductFormProps) {
  // Estados de flujo progresivo
  const [creationMode, setCreationMode] = useState<'choose' | 'form'>(() => editingProductId ? 'form' : 'choose');
  const [step, setStep] = useState(1);

  // UI state local al formulario
  const [isUploadingImgs, setIsUploadingImgs] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isSuggestingName, setIsSuggestingName] = useState(false);
  const [isRegeneratingDesc, setIsRegeneratingDesc] = useState(false);
  const [isPreparingInstagram, setIsPreparingInstagram] = useState(false);
  const [instagramCaption, setInstagramCaption] = useState('');
  const [userEditedDescription, setUserEditedDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sampleReviewed, setSampleReviewed] = useState(false);

  const [useSizes, setUseSizes] = useState(() => !productForm.inventory['unico'] && Object.keys(productForm.inventory).length > 0);

  // Redirigir a modo formulario al activarse la pre-carga de IA
  useEffect(() => {
    if (aiPreFilled) {
      setCreationMode('form');
      setStep(2); // Inicia en detalles ya que la foto ya se cargó
    }
  }, [aiPreFilled]);

  // ─── Handlers de imagen ─────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingImgs(true);
    const files = Array.from(e.target.files);
    const uploadedUrls: string[] = [];
    toast.loading(`Preparando ${files.length} foto(s)...`, { id: 'uploadToast' });
    try {
      for (const file of files) {
        uploadedUrls.push(await uploadOriginalPhoto(file));
      }
      toast.success('¡Fotos subidas con éxito!', { id: 'uploadToast' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al subir las fotos.', { id: 'uploadToast' });
    } finally {
      if (uploadedUrls.length) setProductForm(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      setIsUploadingImgs(false);
      e.target.value = '';
    }
  };

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingImgs(true);
    toast.loading('Reemplazando foto...', { id: 'uploadToast' });
    try {
      const publicUrl = await uploadOriginalPhoto(file);
      setProductForm(prev => {
        const copy = [...prev.images];
        copy[index] = publicUrl;
        return { ...prev, images: copy };
      });
      toast.success('Foto reemplazada.', { id: 'uploadToast' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al reemplazar la foto.', { id: 'uploadToast' });
    } finally {
      setIsUploadingImgs(false);
      e.target.value = '';
    }
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setProductForm(prev => {
      const copy = [...prev.images];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < copy.length) {
        const temp = copy[index];
        copy[index] = copy[targetIndex];
        copy[targetIndex] = temp;
      }
      return { ...prev, images: copy };
    });
  };

  const setCoverImage = (index: number) => {
    setProductForm(prev => {
      const copy = [...prev.images];
      const selected = copy[index];
      copy.splice(index, 1);
      copy.unshift(selected);
      return { ...prev, images: copy };
    });
  };

  // ─── Handler IA: sugerir nombre ─────────────────────────────────────────

  const handleSuggestName = useCallback(async () => {
    const imageUrl = productForm.images[0];
    if (!imageUrl || isSuggestingName) return;
    setIsSuggestingName(true);
    try {
      const res = await fetch('/api/admin/product-scanner/suggest-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          category: productForm.category,
          currentName: productForm.name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.name) {
        setProductForm(prev => {
          const newName = data.name as string;
          return {
            ...prev,
            name: newName,
            slug: isSlugDirty ? prev.slug : slugify(newName),
          };
        });
      } else {
        toast.error(data.error || 'No se pudo generar otro nombre');
      }
    } catch {
      toast.error('Error al conectar con la IA');
    } finally {
      setIsSuggestingName(false);
    }
  }, [productForm.images, productForm.category, productForm.name, isSlugDirty, isSuggestingName, setProductForm]);

  // ─── Handler IA: regenerar descripción ─────────────────────────────────

  const handleRegenerateDescription = useCallback(async () => {
    const imageUrl = productForm.images[0];
    if (!imageUrl || isRegeneratingDesc) return;
    if (userEditedDescription) {
      if (!confirm('Tienes una descripción editada manualmente. ¿Quieres reemplazarla con una nueva sugerencia de IA?')) return;
    }
    setIsRegeneratingDesc(true);
    try {
      const res = await fetch('/api/admin/product-scanner/suggest-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          category: productForm.category,
          currentName: productForm.name,
          mode: 'description',
        }),
      });
      const data = await res.json();
      if (res.ok && data.description) {
        setProductForm(prev => ({ ...prev, description: data.description as string }));
        setUserEditedDescription(false);
      } else {
        toast.error(data.error || 'No se pudo regenerar la descripción');
      }
    } catch {
      toast.error('Error al conectar con la IA');
    } finally {
      setIsRegeneratingDesc(false);
    }
  }, [productForm.images, productForm.category, productForm.name, isRegeneratingDesc, userEditedDescription, setProductForm]);

  const handlePrepareInstagram = useCallback(async () => {
    const imageUrl = productForm.images[0];
    if (!imageUrl || !productForm.name.trim() || isPreparingInstagram) return;

    setIsPreparingInstagram(true);
    try {
      const totalStock = Object.values(productForm.inventory).reduce((sum, value) => sum + value, 0);
      const res = await fetch('/api/admin/product-scanner/suggest-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          category: productForm.category,
          currentName: productForm.name,
          description: productForm.description,
          price: Number(productForm.price) || undefined,
          hasStock: totalStock > 0,
          mode: 'instagram',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.caption) throw new Error(data.error || 'No se pudo preparar el texto');
      setInstagramCaption(data.caption as string);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo preparar el texto');
    } finally {
      setIsPreparingInstagram(false);
    }
  }, [productForm, isPreparingInstagram]);

  const copyInstagramCaption = async () => {
    try {
      await navigator.clipboard.writeText(instagramCaption);
      toast.success('Texto copiado. Ya puedes pegarlo en Instagram.');
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto manualmente.');
    }
  };

  // ─── Handler Guardar ─────────────────────────────────────────────────────

  const handleSaveProduct = async () => {
    if (isSaving) return;

    // Validar campos críticos
    if (productForm.images.length === 0) {
      toast.error('Agrega una foto para continuar.');
      setStep(1);
      return;
    }
    if (!productForm.name.trim()) {
      toast.error('El nombre es obligatorio.');
      setStep(2);
      return;
    }
    if (Number(productForm.price) <= 0) {
      toast.error('El precio debe ser mayor que 0.');
      setStep(3);
      return;
    }

    setIsSaving(true);
    try {
      if (sampleReviewed && (!productForm.material.trim() || productForm.material.trim().toLowerCase() === 'por confirmar')) {
        toast.error('Confirma el material en el paso anterior antes de habilitar ventas.');
        return;
      }
      await onSave(sampleReviewed && isSampleSku(productForm.sku) ? { ...productForm, sku: productForm.sku.replace(/^FRAN-MUESTRA-/, '') } : productForm);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Navegación de pasos ──────────────────────────────────────────────────

  const nextStep = () => {
    if (step === 1) {
      if (productForm.images.length === 0) {
        toast.error('Agrega una foto para continuar.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!productForm.name.trim()) {
        toast.error('El nombre de la joya es obligatorio.');
        return;
      }
      if (!productForm.category_id) {
        toast.error('Selecciona una categoría.');
        return;
      }
      setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  // 1. Pantalla de Selección Inicial (Asistencia de IA vs Manual)
  if (creationMode === 'choose') {
    return (
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm animate-fade-in-up space-y-6 text-center max-w-xl mx-auto my-8">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-violet-100 text-violet-700 rounded-full">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <h3 className="font-serif italic text-xl text-zinc-900 mt-2">¿Quieres ayuda para completar la información?</h3>
          <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
            Sube una foto de la joya y prepararemos automáticamente una sugerencia de nombre, descripción y categoría comercial.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
          <button
            type="button"
            onClick={onScanWithAI}
            className="bg-black hover:bg-zinc-800 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md"
          >
            <Sparkles size={14} /> Subir foto y recibir ayuda
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('form')}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            Continuar manualmente
          </button>
        </div>

        <div className="border-t pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-zinc-400 hover:text-zinc-700 uppercase font-bold tracking-wider"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // 2. Pantalla del Formulario por Pasos
  const matchedCat = dbCategories.find(c => c.id === Number(productForm.category_id));
  const catSizes = matchedCat ? sizeConfig[matchedCat.name] : null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-up space-y-6">

      {/* Cabecera del formulario */}
      <div className="flex justify-between items-center pb-3 border-b">
        <h3 className="font-serif italic text-xl text-gray-900">
          {editingProductId ? 'Editar Joya' : 'Nueva Joya'}
        </h3>
        <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
          Paso {step} de 3
        </span>
      </div>

      {/* Indicador de pasos visual (estándar 2026) */}
      <div className="flex items-center w-full gap-2">
        <div className={`h-1 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`} />
        <div className={`h-1 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`} />
        <div className={`h-1 flex-1 rounded-full transition-all ${step >= 3 ? 'bg-black' : 'bg-gray-200'}`} />
      </div>

      {/* Banner IA (si está pre-llenado) */}
      {aiPreFilled && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl px-4 py-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-violet-800">Sugerencias cargadas con éxito</p>
            <p className="text-[10px] text-violet-600 mt-0.5">Revisa la descripción y detalles comerciales sugeridos por la IA antes de publicar.</p>
          </div>
          <button type="button" onClick={() => setAiPreFilled(false)} className="text-violet-400 hover:text-violet-750">
            <X size={14} />
          </button>
        </div>
      )}

      {/* PASO 1: FOTOS DEL PRODUCTO */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-700">📷 Fotos del producto</p>
              <p className="text-[10px] text-gray-400 mt-0.5">La primera foto se mostrará como la portada del catálogo.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowUrlInput(v => !v)}
              className="text-[10px] text-zinc-650 hover:text-black font-bold uppercase tracking-wider bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              {showUrlInput ? 'Ocultar URL' : 'Añadir por URL'}
            </button>
          </div>

          {/* Subida Drag & Drop */}
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              disabled={isUploadingImgs}
              onDragOver={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDrop={() => setIsDragging(false)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all
              ${isUploadingImgs ? 'border-gray-200 bg-gray-50' : isDragging ? 'border-black bg-zinc-50 scale-[1.01]' : 'border-zinc-300 hover:border-black hover:bg-gray-50'}`}
            >
              {isUploadingImgs ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-7 h-7 animate-spin text-black" />
                  <span className="text-xs font-bold text-gray-500">Subiendo fotos...</span>
                </div>
              ) : (
                <>
                  <UploadCloud size={24} className={`mb-2 transition-colors ${isDragging ? 'text-black' : 'text-gray-400'}`} />
                  <span className="text-xs font-bold text-zinc-800">Subir fotos</span>
                  <span className="text-[10px] text-gray-400 mt-1">Arrastra tus fotos aquí o haz clic para seleccionar archivos</span>
                </>
              )}
            </div>
          </div>

          {/* URL Input externa */}
          {showUrlInput && (
            <div className="p-4 border border-zinc-200 rounded-2xl flex flex-col gap-2 bg-zinc-50 animate-fade-in">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ingresar URL de imagen externa</span>
              <input
                type="url"
                placeholder="https://... (presiona Enter)"
                value={tempImageUrl}
                onChange={e => setTempImageUrl(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trm = tempImageUrl.trim();
                    if (trm.startsWith('http')) {
                      setProductForm(p => ({ ...p, images: [...p.images, trm] }));
                      setTempImageUrl('');
                      toast.success('URL agregada');
                    } else {
                      toast.error('URL no válida');
                    }
                  }
                }}
                className="w-full p-3 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:border-black bg-white"
              />
            </div>
          )}

          {/* Galería de fotos con ordenación y portada */}
          {productForm.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
              {productForm.images.map((img, i) => (
                <div key={i} className="relative aspect-[3/4] border rounded-xl overflow-hidden group shadow-sm bg-zinc-50 border-zinc-200">
                  <Image src={img} alt="preview" fill sizes="120px" className="object-cover" unoptimized />
                  {i === 0 ? (
                    <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 rounded text-[8px] font-bold flex items-center gap-1">
                      <Star size={7} className="fill-white animate-spin-slow" /> Portada
                    </div>
                  ) : (
                    <button type="button" onClick={() => setCoverImage(i)}
                      className="absolute top-2 left-2 bg-white/95 text-zinc-800 px-2 py-0.5 rounded text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-200"
                    >
                      Portada
                    </button>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <label className="bg-white/95 text-zinc-800 px-1.5 py-1 rounded text-[8px] font-bold cursor-pointer block border border-zinc-200">
                      Reemplazar
                      <input type="file" accept="image/*" disabled={isUploadingImgs} onChange={e => handleReplaceImage(e, i)} className="hidden" />
                    </label>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 flex justify-between items-center sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <button type="button" disabled={i === 0} onClick={() => moveImage(i, 'left')} className="text-white hover:bg-white/20 p-1 rounded disabled:opacity-30">
                        <ChevronLeft size={12} />
                      </button>
                      <button type="button" disabled={i === productForm.images.length - 1} onClick={() => moveImage(i, 'right')} className="text-white hover:bg-white/20 p-1 rounded disabled:opacity-30">
                        <ChevronRight size={12} />
                      </button>
                    </div>
                    <button type="button" onClick={() => setProductForm(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))}
                      className="text-red-400 hover:text-red-300 p-1 rounded">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PASO 2: DETALLES COMERCIALES */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in">
          <div className="pb-2 border-b border-gray-100">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-700">📝 Información comercial</p>
          </div>

          {/* Nombre */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase text-gray-400">Nombre de la Joya</label>
              {aiPreFilled && <AIBadge />}
            </div>
            <div className="flex gap-2">
              <input
                required
                value={productForm.name}
                onChange={e => {
                  const val = e.target.value;
                  setProductForm(prev => ({
                    ...prev,
                    name: val,
                    slug: isSlugDirty ? prev.slug : slugify(val),
                  }));
                }}
                className="flex-1 p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black transition-colors"
                placeholder="Ej: Anillo de Plata Corazón"
              />
              {productForm.images.length > 0 && (
                <button
                  type="button"
                  onClick={handleSuggestName}
                  disabled={isSuggestingName}
                  className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 text-zinc-700 px-3 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shrink-0"
                >
                  {isSuggestingName ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Sugerir nombre
                </button>
              )}
            </div>
          </div>

          {/* Categoría */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase text-gray-400">Categoría</label>
              {aiPreFilled && <AIBadge />}
            </div>
            {dbCategories.length > 0 ? (
              <select
                required
                value={productForm.category_id || ''}
                onChange={e => {
                  const selectedId = e.target.value;
                  const cat = dbCategories.find(c => c.id === Number(selectedId));
                  setProductForm(prev => ({
                    ...prev,
                    category_id: selectedId,
                    category: cat?.name || '',
                  }));
                }}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-black cursor-pointer"
              >
                <option value="" disabled>Seleccionar categoría...</option>
                {dbCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div className="p-4 border border-red-200 rounded-xl bg-red-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-xs text-red-800">No hay categorías creadas todavía.</span>
                <button
                  type="button"
                  onClick={onGoToCategories}
                  className="text-[10px] font-bold uppercase tracking-wider text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  Ir a Categorías
                </button>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase text-gray-400">Descripción comercial</label>
                {aiPreFilled && <AIBadge />}
              </div>
              {productForm.images.length > 0 && (
                <button
                  type="button"
                  onClick={handleRegenerateDescription}
                  disabled={isRegeneratingDesc}
                  className="text-[10px] text-zinc-650 hover:text-black font-bold uppercase tracking-wider flex items-center gap-1"
                >
                  {isRegeneratingDesc ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Crear otra descripción
                </button>
              )}
            </div>
            <textarea
              value={productForm.description}
              onChange={e => {
                setProductForm(prev => ({ ...prev, description: e.target.value }));
                setUserEditedDescription(true);
              }}
              className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black h-24 resize-none"
              placeholder="Describe detalladamente el diseño, terminación y estilo de la joya..."
            />
          </div>

          {/* Material confirmed by the owner, never inferred from appearance. */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Material principal</label>
            <input value={productForm.material} maxLength={100} onChange={event => setProductForm(previous => ({ ...previous, material: event.target.value }))} className="w-full p-3 border border-zinc-200 rounded-lg text-sm" />
            <p className="text-[9px] text-zinc-400 mt-0.5">Confirma el material con la etiqueta o tu proveedor. Una foto no acredita pureza ni piedras.</p>
          </div>
        </div>
      )}

      {/* PASO 3: PRECIO Y STOCK */}
      {step === 3 && (
        <div className="space-y-5 animate-fade-in">
          <div className="pb-2 border-b border-gray-100">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-700">💰 Precio y Stock</p>
          </div>
          {isSampleSku(productForm.sku) && <div className="rounded-xl border bg-zinc-50 p-4 space-y-2 text-sm">
            <p>Esta joya sigue bloqueada para pagos hasta confirmar datos reales. Primero registra un Conteo físico desde su tarjeta; luego vuelve aquí para confirmar precio y material.</p>
            <label className="flex gap-2"><input type="checkbox" checked={sampleReviewed} onChange={event => setSampleReviewed(event.target.checked)} /> Confirmé precio y material reales y ya hice el conteo físico.</label>
          </div>}

          {/* Precio y Precio Anterior */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Precio de venta ($)</label>
              <input
                type="number"
                value={productForm.price}
                onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Precio anterior ($ - opcional)</label>
              <input
                type="number"
                value={productForm.compare_at_price}
                onChange={e => setProductForm(prev => ({ ...prev, compare_at_price: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                placeholder="Para mostrar descuento tachado"
              />
            </div>
          </div>

          {editingProductId ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-bold text-zinc-900">El stock se administra por separado</p>
              <p className="text-sm text-zinc-600 mt-1">
                Guarda aquí fotos, precio y datos de la joya. Para ventas, entradas o conteos físicos vuelve al catálogo y usa “Stock / venta”.
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Así una ficha que quedó abierta no puede restaurar cantidades antiguas.
              </p>
            </div>
          ) : (
            <>
          {/* Tallas Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-gray-400">¿Esta joya tiene tallas?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseSizes(false);
                  setProductForm(prev => {
                    const cleanInv = { ...prev.inventory };
                    delete cleanInv['unico'];
                    return { ...prev, inventory: { ...cleanInv, unico: 0 } };
                  });
                }}
                className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${!useSizes ? 'bg-black border-black text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
              >
                No (Stock único)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseSizes(true);
                  setProductForm(prev => {
                    const cleanInv = { ...prev.inventory };
                    delete cleanInv['unico'];
                    return { ...prev, inventory: cleanInv };
                  });
                }}
                className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${useSizes ? 'bg-black border-black text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
              >
                Sí (Tallas configuradas)
              </button>
            </div>
          </div>

          {/* Stock Único */}
          {!useSizes && (
            <div className="space-y-1 animate-fade-in bg-zinc-50 p-4 border rounded-xl">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Cantidad disponible en tienda</label>
              <input
                type="number"
                value={productForm.inventory['unico'] ?? ''}
                onChange={e => {
                  const val = Number(e.target.value) || 0;
                  setProductForm(prev => ({
                    ...prev,
                    inventory: { ...prev.inventory, unico: val },
                  }));
                }}
                className="w-full p-3 border border-zinc-200 rounded-lg text-sm bg-white outline-none focus:border-black"
                placeholder="Cantidad disponible"
              />
            </div>
          )}

          {/* Tallas Config Grid */}
          {useSizes && (
            <div className="space-y-3 animate-fade-in bg-zinc-50 p-4 border rounded-xl">
              <span className="text-[10px] font-bold uppercase text-zinc-500">Configuración de stock por tallas</span>
              {catSizes && catSizes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {catSizes.map(sz => (
                    <div key={sz} className="bg-white p-2.5 border rounded-lg flex flex-col gap-1.5 shadow-sm">
                      <span className="text-xs font-bold text-zinc-800">Talla {sz}</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={productForm.inventory[sz] ?? ''}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setProductForm(prev => ({
                            ...prev,
                            inventory: { ...prev.inventory, [sz]: val },
                          }));
                        }}
                        className="w-full p-2 border border-zinc-200 rounded text-xs outline-none focus:border-black text-center"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">No hay tallas configuradas para la categoría &quot;{productForm.category || 'actual'}&quot;. Puedes configurarlas en la pestaña Ajustes.</p>
              )}
            </div>
          )}


            </>
          )}
          <div className="border border-pink-200 bg-pink-50/50 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <Instagram size={17} className="text-pink-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-zinc-800">Texto para Instagram</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Usa los datos actuales de la joya. No publica nada automáticamente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrepareInstagram}
                disabled={isPreparingInstagram || !productForm.images[0] || !productForm.name.trim()}
                className="bg-white border border-pink-200 hover:border-pink-400 text-pink-700 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isPreparingInstagram
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Sparkles size={11} />}
                {instagramCaption ? 'Preparar otro' : 'Preparar texto'}
              </button>
            </div>

            {instagramCaption && (
              <div className="space-y-2 animate-fade-in">
                <textarea
                  value={instagramCaption}
                  onChange={event => setInstagramCaption(event.target.value)}
                  rows={7}
                  maxLength={900}
                  className="w-full p-3 border border-pink-200 rounded-lg text-xs leading-relaxed outline-none focus:border-pink-400 resize-y bg-white"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[9px] text-zinc-500">
                    Revísalo antes de copiar. La disponibilidad final siempre la confirma la tienda.
                  </p>
                  <button
                    type="button"
                    onClick={copyInstagramCaption}
                    className="shrink-0 flex items-center gap-1.5 bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-lg text-[10px] font-bold uppercase"
                  >
                    <Copy size={11} /> Copiar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Más Opciones (Visibilidad / Borrador / Destacados) */}
          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black transition-colors"
            >
              ⚙ Más opciones (Visibilidad, destaque) {showMoreOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showMoreOptions && (
              <div className="mt-3 p-4 border border-zinc-200 rounded-xl bg-zinc-50 space-y-4 animate-fade-in">
                {/* Visible en tienda */}
                <div className="flex items-center justify-between bg-white p-3 border rounded-xl shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 block">Visible en tienda</span>
                    <span className="text-[9px] text-zinc-400">Si se desmarca, aparecerá como borrador oculto.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={e => setProductForm(p => ({ ...p, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded text-black focus:ring-black border-zinc-300 cursor-pointer"
                  />
                </div>

                {/* Destacar en inicio */}
                <div className="flex items-center justify-between bg-white p-3 border rounded-xl shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 block">Destacar en inicio</span>
                    <span className="text-[9px] text-zinc-400">Muestra la joya en la página principal.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={productForm.is_featured}
                    onChange={e => setProductForm(p => ({ ...p, is_featured: e.target.checked }))}
                    className="w-4 h-4 rounded text-black focus:ring-black border-zinc-300 cursor-pointer"
                  />
                </div>

                {/* Mostrar como novedad */}
                <div className="flex items-center justify-between bg-white p-3 border rounded-xl shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 block">Mostrar como novedad</span>
                    <span className="text-[9px] text-zinc-400">Añade etiqueta de novedad en catálogo.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={productForm.is_new}
                    onChange={e => setProductForm(p => ({ ...p, is_new: e.target.checked }))}
                    className="w-4 h-4 rounded text-black focus:ring-black border-zinc-300 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOTONES DE NAVEGACIÓN Y GUARDADO ── */}
      <div className="flex justify-between items-center pt-4 border-t gap-3">
        {/* Lado izquierdo: Botón Cancelar (solo en Paso 1) o Atrás (Pasos 2 y 3) */}
        <div>
          {step === 1 ? (
            <button
              type="button"
              onClick={onCancel}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={prevStep}
              className="border border-zinc-300 hover:border-black text-zinc-700 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <ChevronLeft size={14} /> Atrás
            </button>
          )}
        </div>

        {/* Lado derecho: Siguiente paso (Pasos 1 y 2) o Guardar Joya (Paso 3) */}
        <div>
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="bg-black hover:bg-zinc-800 text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md"
            >
              Siguiente paso <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveProduct}
              disabled={isSaving}
              className="bg-black hover:bg-zinc-800 text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar joya'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
