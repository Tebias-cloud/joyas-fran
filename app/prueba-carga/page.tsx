'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import ProductPhotoEditor from '@/app/admin/_components/ProductPhotoEditor';

type Result = {
  name: string;
  description: string;
  category: string;
  category_id: number | null;
  collection: string | null;
  meta_title: string;
  meta_description: string;
  material: string;
};

type PhotoState = {
  status: 'pending' | 'loading' | 'done' | 'error';
  result?: Result;
  error?: string;
  processed?: string;
};

const PHOTOS = [0, 1, 2, 3] as const;

export default function PruebaCargaPage() {
  const [photos, setPhotos] = useState<Record<number, PhotoState>>(
    Object.fromEntries(PHOTOS.map(id => [id, { status: 'pending' }]))
  );
  const [editing, setEditing] = useState<number | null>(null);

  const analyze = async (id: number) => {
    setPhotos(current => ({ ...current, [id]: { ...current[id], status: 'loading', error: undefined } }));

    try {
      const response = await fetch('/api/prueba-fotos/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo analizar');

      setPhotos(current => ({
        ...current,
        [id]: { ...current[id], status: 'done', result: data },
      }));
    } catch (error) {
      setPhotos(current => ({
        ...current,
        [id]: {
          ...current[id],
          status: 'error',
          error: error instanceof Error ? error.message : 'No se pudo analizar',
        },
      }));
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (const id of PHOTOS) {
        if (cancelled) break;
        await analyze(id);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, []);

  const saveProcessed = async (id: number, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setPhotos(current => {
      const previous = current[id]?.processed;
      if (previous) URL.revokeObjectURL(previous);
      return { ...current, [id]: { ...current[id], processed: url } };
    });
  };

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 pb-16">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Joyas Fran</p>
          <h1 className="font-serif italic text-3xl md:text-4xl">Prueba real de carga</h1>
          <p className="text-sm md:text-base text-zinc-600 max-w-2xl">
            Estas son las fotos tal como llegaron. El nombre y la descripción se generan automáticamente.
            No corregí los resultados. Usa “Probar fondo” para ejecutar el mismo editor que tendría tu mamá.
          </p>
        </header>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Esta página no agrega productos ni cambia stock. Sirve para evaluar el flujo antes de confiarle el catálogo real.
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {PHOTOS.map((id, index) => {
            const state = photos[id];
            const source = '/api/prueba-fotos/image?id=' + id;

            return (
              <article key={id} className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold">Foto {index + 1}</p>
                    <p className="text-xs text-zinc-500">Entrada enviada desde el teléfono</p>
                  </div>
                  <span className={
                    'text-xs font-bold rounded-full px-3 py-1 ' +
                    (state.status === 'done'
                      ? 'bg-emerald-50 text-emerald-700'
                      : state.status === 'error'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-zinc-100 text-zinc-600')
                  }>
                    {state.status === 'done' ? 'Analizada' : state.status === 'error' ? 'Error' : 'Procesando…'}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2">
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Original</p>
                    <div className="relative bg-zinc-100 rounded-2xl overflow-hidden min-h-[360px]">
                      <Image src={source} alt={'Foto original ' + (index + 1)} fill className="object-contain" unoptimized />
                    </div>
                  </div>

                  <div className="p-4 sm:border-l border-zinc-100 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Resultado automático</p>

                    {state.status === 'loading' || state.status === 'pending' ? (
                      <div className="space-y-3 animate-pulse">
                        <div className="h-6 rounded bg-zinc-100 w-3/4" />
                        <div className="h-16 rounded bg-zinc-100" />
                        <div className="h-5 rounded bg-zinc-100 w-1/2" />
                      </div>
                    ) : state.status === 'error' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-red-700">{state.error}</p>
                        <button
                          type="button"
                          onClick={() => void analyze(id)}
                          className="min-h-11 px-4 rounded-xl bg-black text-white text-sm font-bold"
                        >
                          Reintentar análisis
                        </button>
                      </div>
                    ) : state.result ? (
                      <>
                        <div>
                          <p className="text-xl font-bold leading-tight">{state.result.name}</p>
                          <p className="text-xs uppercase tracking-wide text-zinc-500 mt-1">{state.result.category}</p>
                        </div>
                        <p className="text-sm leading-relaxed text-zinc-700">{state.result.description}</p>
                        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-600">
                          Material: <strong>{state.result.material}</strong>
                        </div>
                      </>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setEditing(id)}
                      className="w-full min-h-12 rounded-xl bg-black text-white text-sm font-bold"
                    >
                      Probar fondo con esta foto
                    </button>
                  </div>
                </div>

                {state.processed && (
                  <div className="p-4 border-t border-zinc-100">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Copia que produjo el editor</p>
                    <div className="relative bg-[#181818] rounded-2xl overflow-hidden min-h-[340px]">
                      <Image src={state.processed} alt="Resultado con fondo" fill className="object-contain" unoptimized />
                    </div>
                  </div>
                )}

                {editing === id && (
                  <ProductPhotoEditor
                    source={source}
                    onClose={() => setEditing(null)}
                    onApply={blob => saveProcessed(id, blob)}
                  />
                )}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
