'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { applyPhotoMask, cropPhoto, FULL_PHOTO, loadPhoto, PHOTO_BACKGROUNDS, photoBlob, type PhotoCrop } from '@/lib/product-photo';

interface Props {
  source: string;
  onClose: () => void;
  onApply: (blob: Blob) => Promise<void>;
}

export default function ProductPhotoEditor({ source, onClose, onApply }: Props) {
  const [crop, setCrop] = useState<PhotoCrop>({ ...FULL_PHOTO });
  const [background, setBackground] = useState<string>(PHOTO_BACKGROUNDS[0].color);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [approved, setApproved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cutout = useRef<HTMLCanvasElement | null>(null);
  const worker = useRef<Worker | null>(null);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    dialogRef.current?.showModal();
    return () => { active.current = false; worker.current?.terminate(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setApproved(false);
    if (!cutout.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    canvas.width = cutout.current.width;
    canvas.height = cutout.current.height;
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(cutout.current, 0, 0);
    photoBlob(canvas).then(blob => {
      if (!cancelled) setPreview(URL.createObjectURL(blob));
    }).catch(() => setMessage('No se pudo preparar la vista previa.'));
    return () => { cancelled = true; };
  }, [background, busy]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const prepare = async () => {
    setBusy(true);
    setApproved(false);
    setPreview('');
    cutout.current = null;
    setMessage('Abriendo foto…');
    try {
      const input = cropPhoto(await loadPhoto(source), crop);
      const blob = await photoBlob(input);
      if (!active.current) return;
      const nextWorker = new Worker(new URL('./background.worker.ts', import.meta.url), { type: 'module' });
      worker.current?.terminate();
      worker.current = nextWorker;
      nextWorker.onerror = () => {
        setMessage('No se pudo iniciar el recortador. Conserva la original o prueba en otro navegador.');
        nextWorker.terminate();
        setBusy(false);
      };
      nextWorker.onmessage = ({ data }: MessageEvent<{ type: string; message?: string; alpha?: Uint8ClampedArray }>) => {
        if (data.type === 'progress') setMessage(data.message ?? 'Preparando…');
        if (data.type === 'error') {
          setMessage(data.message ?? 'No se pudo recortar.');
          nextWorker.terminate();
          setBusy(false);
        }
        if (data.type === 'done' && data.alpha) {
          const context = input.getContext('2d')!;
          const pixels = context.getImageData(0, 0, input.width, input.height);
          try {
            pixels.data.set(applyPhotoMask(pixels.data, data.alpha));
            context.putImageData(pixels, 0, 0);
            cutout.current = input;
            setMessage('Revisa bordes, piedras, huecos y cadenas. El recortador puede borrar detalles.');
          } catch { setMessage('El recortador devolvió una máscara no válida. Conserva la original.'); }
          nextWorker.terminate();
          setBusy(false);
        }
      };
      nextWorker.postMessage({ blob });
    } catch (error) {
      if (!active.current) return;
      setMessage(error instanceof Error ? error.message : 'No se pudo preparar la foto.');
      setBusy(false);
    }
  };

  const save = async () => {
    if (!approved || !preview || !canvasRef.current) return;
    setSaving(true);
    try { await onApply(await photoBlob(canvasRef.current)); onClose(); }
    catch { setMessage('No se pudo guardar la copia. Tu original sigue intacta; puedes reintentar.'); }
    finally { if (active.current) setSaving(false); }
  };

  return (
    <dialog ref={dialogRef} onCancel={e => { e.preventDefault(); if (!saving) onClose(); }} aria-labelledby="photo-editor-title" className="m-auto w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 backdrop:bg-black/60">
      <div className="space-y-4">
        <h3 id="photo-editor-title" className="text-lg font-semibold">Preparar fondo · prueba</h3>
        <p className="text-sm text-zinc-600">La original se conserva. Ajusta el encuadre si es una captura de pantalla; no cortes ninguna parte de la joya.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm mb-2">Original y encuadre</p>
            <div className="relative">
              <Image src={source} alt="Foto original para encuadrar" width={600} height={800} className="w-full h-auto" unoptimized />
              <div aria-hidden="true" className="absolute border-2 border-emerald-500 pointer-events-none" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${Math.min(crop.width, 100 - crop.x)}%`, height: `${Math.min(crop.height, 100 - crop.y)}%`, boxShadow: '0 0 0 999px rgb(0 0 0 / 20%)', clipPath: 'inset(-1px)' }} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {(['x', 'y', 'width', 'height'] as const).map(key => (
                <label key={key} className="text-xs">{{ x: 'Desde izquierda (%)', y: 'Desde arriba (%)', width: 'Ancho (%)', height: 'Alto (%)' }[key]}
                  <input type="number" min={key === 'x' || key === 'y' ? 0 : 1} max={100} value={crop[key]} disabled={busy || saving} onChange={e => {
                    const isPosition = key === 'x' || key === 'y';
                    const value = Math.max(isPosition ? 0 : 1, Math.min(isPosition ? 99 : 100, Number(e.target.value)));
                    setCrop(prev => ({ ...prev, [key]: value }));
                    setPreview(''); cutout.current = null; setApproved(false);
                  }} className="block w-full border rounded p-2 mt-1" />
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm mb-2">Resultado para revisar</p>
            {preview ? <Image src={preview} alt="Vista previa de joya con fondo preparado" width={600} height={800} className="w-full h-auto max-h-[420px] object-contain" unoptimized /> : <p className="bg-zinc-100 rounded-xl p-6 text-sm">Pulsa «Preparar vista previa». La primera descarga puede tardar varios minutos.</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {PHOTO_BACKGROUNDS.map(item => <button type="button" key={item.id} aria-pressed={background === item.color} onClick={() => setBackground(item.color)} disabled={busy || saving} className={`border rounded-lg px-3 py-2 text-sm ${background === item.color ? 'ring-2 ring-black' : ''}`} style={{ backgroundColor: item.color }}>{item.name}</button>)}
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <p role="status" className="text-sm text-zinc-600">{message}</p>
        {preview && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} disabled={saving} onChange={e => setApproved(e.target.checked)} /> Revisé que no falten partes de la joya y acepto esta copia.</label>}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || saving} onClick={prepare} className="bg-black text-white rounded-lg px-4 py-3 text-sm disabled:opacity-40">Preparar vista previa</button>
          <button type="button" disabled={!preview || !approved || busy || saving} onClick={save} className="border rounded-lg px-4 py-3 text-sm disabled:opacity-40">{saving ? 'Guardando…' : 'Guardar copia con fondo'}</button>
          <button type="button" disabled={saving} onClick={onClose} className="border rounded-lg px-4 py-3 text-sm">{busy ? 'Cancelar procesamiento' : 'Conservar original / cerrar'}</button>
        </div>
      </div>
    </dialog>
  );
}
