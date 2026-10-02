'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Instagram, PackageOpen, PanelsTopLeft, Pencil, Store } from 'lucide-react';

export default function SampleCatalogSetup() {
  const [confirm, setConfirm] = useState('');
  const [exampleValues, setExampleValues] = useState(false);
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
    setBusy(true);
    setMessage('Preparando la demostración con fotos reales…');
    try {
      const response = await fetch('/api/admin/sample-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm, exampleValues }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo instalar.');
      setMessage('Demo preparada. Recarga el panel para ver el catálogo.');
      setActive(true);
      setConfirm('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo instalar.');
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="border rounded-2xl bg-white p-6">
        <p className="text-sm text-zinc-500">Comprobando catálogo de demostración…</p>
      </div>
    );
  }

  if (active) {
    return (
      <div className="border border-emerald-200 rounded-2xl bg-emerald-50/60 p-5 md:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-emerald-700 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-bold text-zinc-950">Modo demostración activo</p>
            <p className="text-sm text-zinc-700 mt-1">
              La tienda ya tiene joyas fotografiadas, precios y existencias de ejemplo para aprender el flujo sin empezar desde cero.
              Los productos que siguen marcados como muestra no permiten pagos hasta confirmar sus datos reales.
            </p>
          </div>
        </div>

        <div className="bg-white border border-emerald-100 rounded-2xl p-4">
          <p className="text-sm font-bold text-zinc-900 mb-3">Recorrido de 5 minutos para probar con tu mamá</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-700">
            <div className="flex gap-2"><Store size={17} className="shrink-0 mt-0.5" /><span><strong>Catálogo:</strong> mirar las joyas y cómo se ven en celular.</span></div>
            <div className="flex gap-2"><PackageOpen size={17} className="shrink-0 mt-0.5" /><span><strong>Stock / venta:</strong> probar un conteo, una venta externa y una reposición.</span></div>
            <div className="flex gap-2"><Instagram size={17} className="shrink-0 mt-0.5" /><span><strong>Instagram:</strong> preparar foto y texto sin publicar automáticamente.</span></div>
            <div className="flex gap-2"><Pencil size={17} className="shrink-0 mt-0.5" /><span><strong>Editar:</strong> revisar nombre, material, precio y fotos.</span></div>
            <div className="flex gap-2"><PanelsTopLeft size={17} className="shrink-0 mt-0.5" /><span><strong>Web:</strong> cambiar portada, textos y destacados.</span></div>
          </div>
        </div>

        <p className="text-xs text-zinc-600">
          No se crean pedidos falsos: las métricas de ventas permanecen limpias para que después puedas pasar de demo a operación real sin borrar transacciones inventadas.
        </p>
      </div>
    );
  }

  return (
    <details className="border rounded-2xl bg-white p-5 md:p-6 space-y-4" open>
      <summary className="font-semibold cursor-pointer">Activar demostración con las fotos reales</summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-zinc-600">
          Deja la tienda lista para mostrar: carga las joyas fotografiadas, una portada y valores de ejemplo. Los productos anteriores quedan desactivados, sin borrar pedidos.
        </p>
        <p className="text-sm text-zinc-600">
          Es una simulación de producción: podrás probar catálogo, bodega, Instagram y edición. Los pagos permanecen bloqueados en las piezas de muestra hasta confirmar precio, cantidad y material reales.
        </p>

        <label className="flex gap-2 text-sm items-start">
          <input
            type="checkbox"
            checked={exampleValues}
            disabled={busy}
            onChange={event => setExampleValues(event.target.checked)}
            className="mt-0.5"
          />
          <span>Entiendo que precios, cantidades y materiales son ejemplos y se revisarán antes de vender.</span>
        </label>

        <label className="block text-sm">
          Para confirmar escribe <strong>ACTIVAR DEMO</strong>
          <input
            value={confirm}
            disabled={busy}
            onChange={event => setConfirm(event.target.value)}
            className="block border rounded-xl p-3 mt-2 w-full max-w-sm"
          />
        </label>

        <button
          type="button"
          onClick={install}
          disabled={busy || !exampleValues || confirm !== 'ACTIVAR DEMO'}
          className="bg-black text-white px-5 min-h-12 rounded-xl font-bold disabled:opacity-40"
        >
          {busy ? 'Preparando demostración…' : 'Activar demo con fotos reales'}
        </button>

        <p role="status" className="text-sm text-zinc-700">{message}</p>
      </div>
    </details>
  );
}
