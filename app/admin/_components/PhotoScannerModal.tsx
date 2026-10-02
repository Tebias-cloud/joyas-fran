'use client';

import { convertToWebp } from '@/lib/images';
import { validatePhoto } from '@/lib/product-photo';
import { useState, useRef } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabase-browser';
import { X, Camera, ImageIcon, Loader2, AlertTriangle, CheckCircle2, RefreshCcw, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface Category {
  id: number;
  name: string;
}

interface AIScanResult {
  name: string;
  description: string;
  category: string;
  category_id: number | null;
  material: string;
  collection: string | null;
  meta_title: string;
  meta_description: string;
  imageUrl: string;
}

interface PhotoScannerModalProps {
  categories: Category[];
  onResult: (result: AIScanResult) => void;
  onClose: () => void;
}

type ScanStep = 'select' | 'uploading' | 'scanning' | 'result' | 'error';

interface EditableResult {
  name: string;
  description: string;
  category: string;
  category_id: number | null;
  collection: string;
  meta_title: string;
  meta_description: string;
}

// ─── Helper: eliminar archivo temporal de Supabase Storage ───────────────────

async function deleteTempFile(fileName: string | null) {
  if (!fileName) return;
  try {
    await supabase.storage.from('products').remove([`temp/${fileName}`]);
  } catch {
    // Silencioso — no bloqueamos la UX por un fallo de limpieza
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PhotoScannerModal({ categories, onResult, onClose }: PhotoScannerModalProps) {
  const [step, setStep] = useState<ScanStep>('select');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null); // para limpieza
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);
  const [editableResult, setEditableResult] = useState<EditableResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');
  const [isSuggestingName, setIsSuggestingName] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ─── Flujo principal: seleccionar foto ────────────────────────────────────

  const handleFileSelect = async (file: File) => {
    try { validatePhoto(file); } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Foto no válida');
      setStep('error');
      return;
    }

    // Preview inmediata con URL local
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setStep('uploading');
    setStatusText('Optimizando imagen...');

    try {
      // 1. Convertir a WebP (canvas, max 1200×1200, calidad 0.85)
      const webpBlob = await convertToWebp(file);

      // 2. Nombre único para la imagen temporal
      const fileName = `scanner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;

      setStatusText('Subiendo al servidor...');

      // 3. Subir a Supabase Storage bajo prefijo temp/
      //    Las imágenes en temp/ son temporales hasta que el producto sea creado.
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(`temp/${fileName}`, webpBlob, {
          contentType: 'image/webp',
          cacheControl: '3600',
        });

      if (uploadError) throw new Error(`Error al subir: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(`temp/${fileName}`);

      setUploadedUrl(publicUrl);
      setUploadedFileName(fileName); // guardamos para poder borrar si la usuaria cancela

      // Gemini recibe una copia pequeña; el catálogo y editor conservan la cámara original.
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const originalName = `${crypto.randomUUID()}-original.${extension}`;
      const { error: originalError } = await supabase.storage.from('products').upload(`temp/${originalName}`, file, {
        contentType: file.type, cacheControl: '3600', upsert: false,
      });
      if (originalError) throw originalError;
      setOriginalFileName(originalName);
      setOriginalUrl(supabase.storage.from('products').getPublicUrl(`temp/${originalName}`).data.publicUrl);

      // 4. Llamar al servidor para analizar la foto
      setStep('scanning');
      setStatusText('Analizando foto...');

      // El servidor obtiene las categorías desde Supabase directamente.
      // No enviamos categorías desde el cliente.
      const response = await fetch('/api/admin/product-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al analizar la imagen');
      }

      // 5. Poblar el estado editable con el resultado de la IA
      setEditableResult({
        name: data.name,
        description: data.description,
        category: data.category,
        category_id: data.category_id,
        collection: data.collection || '',
        meta_title: data.meta_title,
        meta_description: data.meta_description,
      });
      setStep('result');

    } catch (err) {
      console.error('Error scanning photo:', err);
      setErrorMsg('No pudimos analizar la foto. Intenta nuevamente.');
      setStep('error');
    }
  };

  // ─── "Sugerir otro nombre" ────────────────────────────────────────────────

  const handleSuggestName = async () => {
    if (!uploadedUrl || !editableResult || isSuggestingName) return;
    setIsSuggestingName(true);
    try {
      const response = await fetch('/api/admin/product-scanner/suggest-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedUrl,
          category: editableResult.category,
          currentName: editableResult.name,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al generar nombre');
      setEditableResult(prev => prev ? { ...prev, name: data.name } : prev);
    } catch (err) {
      // Mostramos error suave en lugar de interrumpir el flujo
      const message = err instanceof Error ? err.message : 'No se pudo generar el nombre';
      setErrorMsg(message);
    } finally {
      setIsSuggestingName(false);
    }
  };

  // ─── Confirmar y pasar datos al formulario ────────────────────────────────

  const handleConfirm = () => {
    if (!editableResult || !uploadedUrl) return;

    // Resolver category_id del selector si la usuaria cambió la categoría
    const selectedCat = categories.find(c => c.name === editableResult.category);

    onResult({
      name: editableResult.name,
      description: editableResult.description,
      category: editableResult.category,
      category_id: selectedCat?.id ?? editableResult.category_id,
      material: 'Por confirmar',
      collection: editableResult.collection || null,
      meta_title: editableResult.meta_title,
      meta_description: editableResult.meta_description,
      imageUrl: originalUrl || uploadedUrl,
    });
    // Solo limpiar la copia de análisis, nunca la original confirmada.
    if (originalUrl) void deleteTempFile(uploadedFileName);
  };

  // ─── Reintentar con otra foto (borrar imagen anterior) ───────────────────

  const handleRetry = async () => {
    // Limpiar imagen temporal anterior de Supabase Storage
    await deleteTempFile(uploadedFileName);
    await deleteTempFile(originalFileName);

    setStep('select');
    setPreviewUrl(null);
    setUploadedUrl(null);
    setUploadedFileName(null);
    setOriginalFileName(null);
    setOriginalUrl(null);
    setEditableResult(null);
    setErrorMsg('');
    setStatusText('');
    setIsSuggestingName(false);
  };

  // ─── Cerrar modal (borrar imagen temporal si existe y no fue confirmada) ──

  const handleClose = async () => {
    await deleteTempFile(originalFileName);
    // Si hay una imagen temporal y el usuario cierra sin confirmar → borrarla
    if (uploadedFileName && step !== 'result') {
      await deleteTempFile(uploadedFileName);
    }
    // Si está en step=result y cancela → también borrar (no confirmó)
    if (uploadedFileName && step === 'result') {
      await deleteTempFile(uploadedFileName);
    }
    onClose();
  };

  // ─── Cambiar categoría desde el selector ─────────────────────────────────

  const handleCategoryChange = (catName: string) => {
    const cat = categories.find(c => c.name === catName);
    setEditableResult(prev => prev ? {
      ...prev,
      category: catName,
      category_id: cat?.id ?? null,
    } : prev);
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Completar información con una foto</h2>
              <p className="text-[10px] text-gray-500">Te ayudaremos a preparar el nombre, descripción y categoría</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/70 transition-colors text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* ── PASO: Seleccionar foto ─────────────────────────────────── */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 text-center">
                Sube una foto de la joya y te ayudaremos a preparar el nombre, la descripción y la categoría.
              </p>

              {/* Cámara */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-400 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Camera className="text-white" size={22} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-900">Tomar Foto</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Abre la cámara del dispositivo</p>
                </div>
              </button>

              {/* Galería */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <ImageIcon className="text-white" size={22} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-900">Elegir de Galería</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Selecciona una foto existente</p>
                </div>
              </button>

              <p className="text-[10px] text-gray-400 text-center pt-1">
                Formatos: JPG, PNG, WEBP · Máx. 10 MB
              </p>
            </div>
          )}

          {/* ── PASO: Subiendo / Escaneando ──────────────────────────────── */}
          {(step === 'uploading' || step === 'scanning') && (
            <div className="space-y-5">
              {previewUrl && (
                <div className="relative w-full h-52 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <Image src={previewUrl} alt="Joya" fill className="object-cover" unoptimized />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="bg-white/90 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
                      <Loader2 className="animate-spin text-violet-600" size={18} />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{statusText}</p>
                        {step === 'scanning' && (
                          <p className="text-[10px] text-gray-500 mt-0.5">Esto puede tomar unos segundos...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${step === 'uploading' || step === 'scanning' ? 'bg-violet-500' : 'bg-gray-300'}`} />
                  <span className={`text-[11px] font-medium ${step === 'uploading' ? 'text-violet-700' : 'text-gray-400'}`}>
                    Subiendo imagen
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${step === 'scanning' ? 'bg-violet-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className={`text-[11px] font-medium ${step === 'scanning' ? 'text-violet-700' : 'text-gray-400'}`}>
                    Preparando información...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── PASO: Resultado editable ─────────────────────────────────── */}
          {step === 'result' && editableResult && (
            <div className="space-y-4">
              {/* Miniatura */}
              {previewUrl && (
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    <Image src={previewUrl} alt="Joya" fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">
                      Información preparada — revisa y modifica lo que necesites antes de continuar.
                    </span>
                  </div>
                </div>
              )}

              {/* Campo: Nombre + Sugerir otro */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400">Nombre</label>
                <input
                  type="text"
                  value={editableResult.name}
                  onChange={e => setEditableResult(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-violet-400 transition-colors"
                  maxLength={60}
                />
                <button
                  type="button"
                  onClick={handleSuggestName}
                  disabled={isSuggestingName}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 hover:text-violet-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
                >
                  {isSuggestingName
                    ? <><Loader2 size={11} className="animate-spin" /> Generando...</>
                    : <><Sparkles size={11} /> Sugerir otro nombre</>
                  }
                </button>
                {errorMsg && !isSuggestingName && step === 'result' && (
                  <p className="text-[10px] text-red-500 mt-0.5">{errorMsg}</p>
                )}
              </div>

              {/* Campo: Descripción */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Descripción</label>
                  <span className="text-[9px] text-gray-400">{editableResult.description.length}/250</span>
                </div>
                <textarea
                  value={editableResult.description}
                  onChange={e => setEditableResult(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  rows={3}
                  maxLength={250}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-violet-400 transition-colors resize-none"
                />
              </div>

              {/* Campo: Categoría */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400">Categoría</label>
                {categories.length > 0 ? (
                  <select
                    value={editableResult.category}
                    onChange={e => handleCategoryChange(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-violet-400 transition-colors cursor-pointer"
                  >
                    <option value="">Seleccionar...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editableResult.category}
                    onChange={e => setEditableResult(prev => prev ? { ...prev, category: e.target.value } : prev)}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-violet-400 transition-colors"
                  />
                )}
              </div>

              {/* Campo: Colección */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400">Colección <span className="text-gray-300 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={editableResult.collection}
                  onChange={e => setEditableResult(prev => prev ? { ...prev, collection: e.target.value } : prev)}
                  placeholder="Ej: Colección Romántica"
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-violet-400 transition-colors"
                  maxLength={60}
                />
              </div>

              {/* Material — fijo, informativo */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold uppercase text-gray-400">Material</span>
                <span className="text-xs text-gray-600 font-medium">Por confirmar</span>
                <span className="ml-auto text-[9px] text-gray-400 italic">Lo confirmas en el formulario</span>
              </div>

              {/* Aviso */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700">
                  El precio y el stock se completan en el formulario principal.
                </p>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-200 rounded-xl text-xs font-bold uppercase text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCcw size={13} /> Otra foto
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-xs font-bold uppercase hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm"
                >
                  <CheckCircle2 size={13} /> Usar y revisar
                </button>
              </div>
            </div>
          )}

          {/* ── PASO: Error ───────────────────────────────────────────────── */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm text-gray-900 mb-1">Error al procesar la foto</p>
                  <p className="text-xs text-gray-500">{errorMsg}</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase hover:bg-gray-700 transition-colors"
              >
                <RefreshCcw size={13} /> Intentar de nuevo
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
