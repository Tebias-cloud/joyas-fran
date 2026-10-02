'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import HomeHero from '@/components/home/HomeHero';
import { DEFAULT_WEBSITE_CONTENT, parseWebsiteContent, WEBSITE_SEASONS, websiteContentSchema, type WebsiteContent } from '@/lib/website-content';
import { validatePhoto } from '@/lib/product-photo';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Product } from '../_types';

export default function WebsiteTab({ products }: { products: Product[] }) {
  const [content, setContent] = useState<WebsiteContent>(structuredClone(DEFAULT_WEBSITE_CONTENT));
  const [saved, setSaved] = useState<WebsiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const dirty = saved !== null && JSON.stringify(content) !== JSON.stringify(saved);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/website', { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar la página. Reintenta antes de editar.');
      const data = parseWebsiteContent(await response.json());
      setContent(data); setSaved(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = <K extends keyof WebsiteContent>(key: K, value: WebsiteContent[K]) => {
    setContent(previous => ({ ...previous, [key]: value })); setConfirmed(false);
  };
  const upload = async (file: File) => {
    setUploading(true);
    try {
      validatePhoto(file);
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const path = `website/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabaseBrowser.storage.from('products').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      update('heroImage', supabaseBrowser.storage.from('products').getPublicUrl(path).data.publicUrl);
      toast.success('Foto preparada. Revisa y guarda los cambios.');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo subir la portada.'); }
    finally { setUploading(false); }
  };
  const save = async () => {
    const result = websiteContentSchema.safeParse(content);
    if (!result.success) { toast.error(result.error.issues[0]?.message || 'Revisa los campos.'); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/website', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.data) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron guardar los cambios.');
      const next = parseWebsiteContent(data);
      setContent(next); setSaved(next);
      toast.success('Página actualizada.');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { setSaving(false); }
  };
  if (loading) return <p role="status">Cargando tu página…</p>;
  if (error) return <div role="alert"><p>{error}</p><button type="button" onClick={load} className="border rounded px-4 py-2 mt-3">Reintentar</button></div>;

  const visibleProducts = products.filter(product => (product.is_active || content.featuredProductIds.includes(product.id)) && product.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-6">
      <div><h2 className="font-serif italic text-3xl">Página web</h2><p className="text-sm text-zinc-500 mt-2">Elige foto y joyas, revisa y guarda. El diseño ya está preparado.</p></div>
      <fieldset disabled={saving || uploading} className="space-y-6 disabled:opacity-60">
        <section className="bg-white border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold">1. Portada y temporada</h3>
          <div className="flex flex-wrap gap-2">{WEBSITE_SEASONS.map(season => <button type="button" key={season.name} onClick={() => {
            setContent(previous => ({ ...previous, heroTitle: season.title, heroDescription: season.description })); setConfirmed(false);
          }} className="border rounded-lg px-4 py-2 text-sm">{season.name}</button>)}</div>
          <label className="block text-sm">Título<input value={content.heroTitle} maxLength={80} onChange={event => update('heroTitle', event.target.value)} className="block border rounded-lg p-3 mt-1 w-full" /></label>
          <label className="block text-sm">Texto breve<textarea value={content.heroDescription} maxLength={240} rows={2} onChange={event => update('heroDescription', event.target.value)} className="block border rounded-lg p-3 mt-1 w-full" /></label>
          <label className="block text-sm">Foto de portada
            <select value={content.heroImage} onChange={event => update('heroImage', event.target.value)} className="block border rounded-lg p-3 mt-1 w-full">
              <option value="">Fondo oscuro sin foto</option>
              {content.heroImage && !products.some(product => product.image_url === content.heroImage) && <option value={content.heroImage}>Portada subida</option>}
              {products.filter(product => product.is_active && product.image_url).map(product => <option key={product.id} value={product.image_url}>{product.name}</option>)}
            </select>
          </label>
          <label className="inline-block border rounded-lg px-4 py-3 text-sm cursor-pointer">{uploading ? 'Subiendo…' : 'Subir otra foto de portada'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} /></label>
          {content.heroImage && <label className="block text-sm">Mover encuadre arriba / abajo<input type="range" min={0} max={100} value={content.heroPosition} onChange={event => update('heroPosition', Number(event.target.value))} className="block w-full mt-2" /></label>}
        </section>
        <section className="bg-white border rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold">2. Joyas destacadas</h3>
          <p className="text-sm text-zinc-500">Marca hasta seis. Las agotadas dejan de mostrarse como destacadas; la foto de portada se cambia manualmente.</p>
          <input aria-label="Buscar joyas para destacar" placeholder="Buscar joya…" value={search} onChange={event => setSearch(event.target.value)} className="border rounded-lg p-3 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {visibleProducts.map(product => {
              const checked = content.featuredProductIds.includes(product.id);
              return <label key={product.id} className="flex items-center gap-3 border rounded-lg p-3 text-sm">
                <input type="checkbox" checked={checked} disabled={!checked && (product.stock <= 0 || content.featuredProductIds.length >= 6)} onChange={() => update('featuredProductIds', checked ? content.featuredProductIds.filter(id => id !== product.id) : [...content.featuredProductIds, product.id])} />
                {product.image_url && <Image src={product.image_url} width={48} height={48} alt="" className="object-contain rounded" unoptimized />}
                <span>{product.name}<span className="block text-xs text-zinc-500">{!product.is_active ? 'Desactivada' : product.stock > 0 ? 'Disponible' : 'Sin stock'}</span></span>
              </label>;
            })}
          </div>
          {!visibleProducts.length && <p className="text-sm text-zinc-500">No hay joyas para mostrar. Agrégalas desde Catálogo.</p>}
        </section>
        <details className="bg-white border rounded-2xl p-5">
          <summary className="cursor-pointer font-semibold">Otros textos de la página</summary>
          <div className="space-y-3 mt-4">
            {(['heroBadge', 'heroButton', 'categoriesTitle', 'featuredTitle', 'story', 'catalogTitle', 'catalogDescription'] as const).map(key => <label key={key} className="block text-sm">
              {{ heroBadge: 'Texto pequeño de portada', heroButton: 'Texto del botón', categoriesTitle: 'Título de categorías', featuredTitle: 'Título de destacados', story: 'Presentación de la tienda', catalogTitle: 'Título del catálogo', catalogDescription: 'Descripción del catálogo' }[key]}
              <textarea rows={key === 'story' ? 3 : 1} value={content[key]} onChange={event => update(key, event.target.value)} className="border rounded-lg p-3 w-full block mt-1" />
            </label>)}
            {content.benefits.map((benefit, index) => <div key={index} className="grid sm:grid-cols-2 gap-2">
              <label className="text-sm">Ventaja {index + 1}<input value={benefit.title} maxLength={60} onChange={event => update('benefits', content.benefits.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} className="block border rounded p-3 mt-1 w-full" /></label>
              <label className="text-sm">Descripción<input value={benefit.description} maxLength={160} onChange={event => update('benefits', content.benefits.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} className="block border rounded p-3 mt-1 w-full" /></label>
            </div>)}
          </div>
        </details>
        <section className="space-y-4">
          <h3 className="font-semibold">3. Revisar y guardar</h3>
          <div className="flex gap-2"><button type="button" aria-pressed={mobile} onClick={() => setMobile(true)} className="border rounded px-3 py-2">Celular</button><button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)} className="border rounded px-3 py-2">Computador</button></div>
          <div className={`mx-auto overflow-hidden rounded-xl border ${mobile ? 'max-w-[375px]' : 'w-full'}`}><HomeHero content={content} preview /></div>
          <p className="text-sm text-zinc-500">Vista previa de portada. Los destacados aparecen debajo en la página.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Revisé la portada y la foto corresponde a joyas reales de la tienda.</label>
          <div className="flex flex-wrap gap-3"><button type="button" disabled={!dirty || !confirmed} onClick={save} className="bg-black text-white rounded-lg px-5 py-3 disabled:opacity-40">{saving ? 'Guardando…' : 'Guardar cambios en la página'}</button><button type="button" disabled={!dirty} onClick={() => { if (saved) setContent(structuredClone(saved)); setConfirmed(false); }} className="border rounded-lg px-4 py-3 disabled:opacity-40">Descartar cambios</button></div>
        </section>
      </fieldset>
    </div>
  );
}
