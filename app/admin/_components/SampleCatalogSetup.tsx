'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Instagram, PackageOpen, PanelsTopLeft, Pencil, Store } from 'lucide-react';

export default function SampleCatalogSetup() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/catalog-status', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (mounted) setActive(Boolean(data?.exampleValues));
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setChecking(false);
      });

    return () => { mounted = false; };
  }, []);

  const install = async () => {
    const accepted = window.confirm(
      'Esto preparará la tienda con fotos reales, precios y stock de ejemplo. Los productos anteriores quedarán ocultos, pero no se borrarán pedidos. ¿Continuar?'
    );
    if (!accepted) return;

    setBusy(true);
    setMessage('Preparando la tienda…');

    try {
      const response = await fetch('/api/admin/sample-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: true }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo preparar la tienda.');

      setMessage('Listo. La tienda quedó preparada para probar desde el celular.');
      setActive(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo preparar la tienda.');
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="border rounded-2xl bg-white p-6">
        <p className="text-sm text-zinc-500">Comprobando catálogo…</p>
      </div>
    );
  }

  if (active) {
    return (
      <div className="border border-emerald-200 rounded-2xl bg-emerald-50/60 p-5 md:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-emerald-700 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-bold text-zinc-950">Tienda lista para probar</p>
            <p className="text-sm text-zinc-700 mt-1">
              Ya hay joyas fotografiadas, precios y existencias de ejemplo para recorrer el sistema como si estuviera operando.
              Las piezas de muestra siguen bloqueadas para pagos hasta confirmar sus datos reales.
            </p>
          </div>
        </div>

        <div className="bg-white border border-emerald-100 rounded-2xl p-4">
          <p className="text-sm font-bold text-zinc-900 mb-3">Qué probar desde el celular</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-700">
            <div className="flex gap-2"><Store size={17} className="shrink-0 mt-0.5" /><span><strong>Catálogo:</strong> ver las joyas y cómo se muestran.</span></div>
            <div className="flex gap-2"><PackageOpen size={17} className="shrink-0 mt-0.5" /><span><strong>Stock / venta:</strong> probar conteo, venta externa y reposición.</span></div>
            <div className="flex gap-2"><Instagram size={17} className="shrink-0 mt-0.5" /><span><strong>Instagram:</strong> preparar foto y texto.</span></div>
            <div className="flex gap-2"><Pencil size={17} className="shrink-0 mt-0.5" /><span><strong>Editar:</strong> cambiar nombre, material, precio y fotos.</span></div>
            <div className="flex gap-2"><PanelsTopLeft size={17} className="shrink-0 mt-0.5" /><span><strong>Web:</strong> cambiar portada, textos y destacados.</span></div>
          </div>
        </div>

        <p className="text-xs text-zinc-600">
          No se crean pedidos falsos, así que las métricas reales quedan limpias.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-2xl bg-white p-5 md:p-6 space-y-4">
      <div>
        <h3 className="font-bold text-zinc-950 text-lg">Preparar tienda para probar</h3>
        <p className="text-sm text-zinc-600 mt-1">
          Carga las joyas fotografiadas, portada, precios y stock de ejemplo para que puedas probar todo desde el celular sin empezar de cero.
        </p>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm text-amber-900">
          Los precios, cantidades y materiales son ejemplos. Los productos anteriores quedan ocultos, no eliminados.
        </p>
      </div>

      <button
        type="button"
        onClick={install}
        disabled={busy}
        className="w-full sm:w-auto bg-black text-white px-6 min-h-14 rounded-2xl text-base font-bold disabled:opacity-40"
      >
        {busy ? 'Preparando…' : 'Preparar tienda para probar'}
      </button>

      <p role="status" className="text-sm text-zinc-700">{message}</p>
    </div>
  );
}
