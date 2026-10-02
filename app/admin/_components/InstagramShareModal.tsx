'use client';

import { useEffect, useState } from 'react';
import { Copy, Download, Instagram, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '../_types';

interface InstagramShareModalProps {
  product: Product;
  onClose: () => void;
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 70) || 'joya-fran';
}

async function imageToShareFile(url: string, name: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudo preparar la foto.');
  const source = await response.blob();

  try {
    const bitmap = await createImageBitmap(source);
    const canvas = document.createElement('canvas');
    const maxSide = 1440;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas no disponible');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('No se pudo convertir la foto.')),
        'image/jpeg',
        0.92
      );
    });

    return new File([jpeg], safeFileName(name) + '.jpg', { type: 'image/jpeg' });
  } catch {
    const extension = source.type.includes('png') ? 'png' : source.type.includes('webp') ? 'webp' : 'jpg';
    return new File([source], safeFileName(name) + '.' + extension, { type: source.type || 'image/jpeg' });
  }
}

export default function InstagramShareModal({ product, onClose }: InstagramShareModalProps) {
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        const response = await fetch('/api/admin/product-scanner/suggest-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: product.image_url,
            category: product.category,
            currentName: product.name,
            description: product.description,
            price: product.price,
            hasStock: product.stock > 0,
            mode: 'instagram',
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.caption) throw new Error(data.error || 'No se pudo preparar el texto.');
        if (!cancelled) setCaption(data.caption);
      } catch (error) {
        if (!cancelled) {
          setCaption(
            product.name + '\n\n$' + product.price.toLocaleString('es-CL') +
            '\n\nConsulta disponibilidad por mensaje.'
          );
          toast.error(error instanceof Error ? error.message : 'No se pudo preparar el texto con IA.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void prepare();
    return () => { cancelled = true; };
  }, [product]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Texto copiado.');
    } catch {
      toast.error('No se pudo copiar automáticamente.');
    }
  };

  const savePhoto = async () => {
    if (!product.image_url || working) return;
    setWorking(true);
    try {
      const file = await imageToShareFile(product.image_url, product.name);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Foto preparada para publicar.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo preparar la foto.');
    } finally {
      setWorking(false);
    }
  };

  const shareFromPhone = async () => {
    if (working) return;
    setWorking(true);
    try {
      if (typeof navigator.share !== 'function') {
        throw new Error('Este navegador no permite compartir directamente. Usa Copiar texto y Guardar foto.');
      }

      let file: File | null = null;
      if (product.image_url) {
        try {
          file = await imageToShareFile(product.image_url, product.name);
        } catch {
          file = null;
        }
      }

      const shareData: ShareData = file ? { text: caption, files: [file] } : { text: caption };
      if (file && typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
        await navigator.share({ text: caption });
      } else {
        await navigator.share(shareData);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo abrir el menú para compartir.';
      if (!message.toLowerCase().includes('abort')) toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-100 p-5 flex items-start justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-pink-50 text-pink-700">
              <Instagram size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Preparar publicación</p>
              <h3 className="text-lg font-bold text-zinc-950">{product.name}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-3 rounded-full bg-zinc-100 text-zinc-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {product.image_url && (
            <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100">
              <img src={product.image_url} alt={product.name} className="w-full max-h-72 object-contain" />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-800">Texto editable</label>
            <textarea
              value={loading ? 'Preparando texto…' : caption}
              disabled={loading}
              onChange={event => setCaption(event.target.value)}
              rows={8}
              maxLength={900}
              className="w-full p-4 border border-zinc-300 rounded-2xl text-base leading-relaxed resize-y disabled:bg-zinc-50"
            />
            <p className="text-sm text-zinc-500">
              Instagram no queda conectado a la tienda: esta pantalla prepara la foto y el texto. La venta se registra después con Stock / venta.
            </p>
          </div>

          <button
            type="button"
            disabled={loading || working}
            onClick={shareFromPhone}
            className="w-full min-h-14 rounded-2xl bg-black text-white text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Share2 size={20} /> Compartir foto + texto
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={copyText}
              className="min-h-12 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Copy size={18} /> Copiar texto
            </button>
            <button
              type="button"
              disabled={!product.image_url || working}
              onClick={savePhoto}
              className="min-h-12 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download size={18} /> Guardar foto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
