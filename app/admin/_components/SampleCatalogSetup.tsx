'use client';
import { useState } from 'react';

export default function SampleCatalogSetup() {
  const [confirm, setConfirm] = useState('');
  const [exampleValues, setExampleValues] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const install = async () => {
    setBusy(true); setMessage('Preparando las diez joyas…');
    try {
      const response = await fetch('/api/admin/sample-catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm, exampleValues }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo instalar.');
      setMessage(`Catálogo preparado. Respaldo: ${data.snapshotId}. Recarga el panel para ver las joyas.`);
      setConfirm('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo instalar.'); }
    finally { setBusy(false); }
  };
  return <details className="border rounded-2xl bg-white p-6 space-y-4">
    <summary className="font-semibold cursor-pointer">Preparar catálogo con las fotos de mamá</summary>
    <p className="text-sm text-zinc-600 mt-4">Reemplaza el catálogo visible por diez joyas fotografiadas. Los productos anteriores quedan desactivados, sin borrar pedidos. Se guarda un respaldo de visibilidad y portada. Primero aplica la migración 20261002_sample_catalog.sql.</p>
    <p className="text-sm text-zinc-600">Se reemplazan también las categorías y la portada. Si esta vista usa la base de producción, el cambio se verá allí. Los precios y cantidades son ejemplos pendientes de revisión y no permiten crear pagos.</p>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={exampleValues} disabled={busy} onChange={event => setExampleValues(event.target.checked)} /> Entiendo que debo revisar precios, cantidades y materiales.</label>
    <label className="block text-sm">Escribe REEMPLAZAR CATALOGO<input value={confirm} disabled={busy} onChange={event => setConfirm(event.target.value)} className="block border rounded p-3 mt-1 w-full max-w-sm" /></label>
    <button type="button" onClick={install} disabled={busy || !exampleValues || confirm !== 'REEMPLAZAR CATALOGO'} className="bg-black text-white px-4 py-3 rounded disabled:opacity-40">{busy ? 'Preparando…' : 'Reemplazar catálogo visible'}</button>
    <p role="status" className="text-sm">{message}</p>
  </details>;
}
