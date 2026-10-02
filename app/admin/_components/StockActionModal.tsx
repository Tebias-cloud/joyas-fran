'use client';

import { useMemo, useState } from 'react';
import { MinusCircle, PackagePlus, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '../_types';

type MovementType = 'sale' | 'restock' | 'count';

interface StockActionModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

const ACTIONS: Array<{ id: MovementType; title: string; description: string }> = [
  { id: 'sale', title: 'Registrar venta', description: 'Instagram, WhatsApp o venta presencial.' },
  { id: 'restock', title: 'Agregar stock', description: 'Llegaron nuevas unidades a la bodega.' },
  { id: 'count', title: 'Conteo físico', description: 'Lo que realmente tienes delante ahora.' },
];

export default function StockActionModal({ product, onClose, onSuccess }: StockActionModalProps) {
  const variantKeys = useMemo(() => Object.keys(product.inventory || {}), [product.inventory]);
  const [movementType, setMovementType] = useState<MovementType>('sale');
  const [selectedSize, setSelectedSize] = useState(
    variantKeys.includes('unico') ? 'unico' : (variantKeys[0] || '')
  );
  const [quantity, setQuantity] = useState(1);
  const [channel, setChannel] = useState('instagram');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const currentStock = selectedSize
    ? Number(product.inventory?.[selectedSize] ?? 0)
    : Number(product.stock || 0);

  const quantityLabel = movementType === 'count'
    ? 'Cantidad que contaste físicamente'
    : movementType === 'sale'
      ? 'Unidades vendidas'
      : 'Unidades que llegaron';

  const submit = async () => {
    if (busy) return;
    if (!Number.isInteger(quantity) || quantity < 0 || (movementType !== 'count' && quantity === 0)) {
      toast.error('Ingresa una cantidad válida.');
      return;
    }
    if (variantKeys.length > 1 && !selectedSize) {
      toast.error('Selecciona la talla o variante.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          movementType,
          quantity,
          size: selectedSize || null,
          channel: movementType === 'sale' ? channel : null,
          note: note.trim() || null,
          idempotencyKey,
          expectedStock: movementType === 'count' ? currentStock : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el stock.');

      const after = data.movement?.stock_after;
      toast.success(
        movementType === 'sale'
          ? 'Venta registrada y stock descontado.'
          : movementType === 'restock'
            ? 'Entrada de stock registrada.'
            : 'Conteo físico guardado.'
      );
      if (typeof after === 'number') toast.message('Stock de esta variante: ' + after);
      await onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el stock.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={() => !busy && onClose()} />
      <div className="relative z-10 w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-100 p-5 flex items-start justify-between rounded-t-3xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Bodega</p>
            <h3 className="text-xl font-semibold text-zinc-950 mt-1">{product.name}</h3>
            <p className="text-sm text-zinc-600 mt-1">Stock total registrado: <strong>{product.stock}</strong></p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="p-3 rounded-full bg-zinc-100 text-zinc-700 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-1 gap-3">
            {ACTIONS.map(action => {
              const active = movementType === action.id;
              const Icon = action.id === 'sale' ? MinusCircle : action.id === 'restock' ? PackagePlus : RefreshCw;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    setMovementType(action.id);
                    setQuantity(action.id === 'count' ? currentStock : 1);
                  }}
                  className={
                    'text-left rounded-2xl border p-4 flex items-start gap-3 transition-all ' +
                    (active ? 'border-black bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-900')
                  }
                >
                  <Icon size={22} className="mt-0.5 shrink-0" />
                  <span>
                    <span className="block text-base font-bold">{action.title}</span>
                    <span className={'block text-sm mt-1 ' + (active ? 'text-zinc-300' : 'text-zinc-500')}>{action.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {variantKeys.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-800">Talla / variante</label>
              <select
                value={selectedSize}
                onChange={event => {
                  const value = event.target.value;
                  setSelectedSize(value);
                  if (movementType === 'count') setQuantity(Number(product.inventory?.[value] ?? 0));
                }}
                className="w-full min-h-12 px-4 border border-zinc-300 rounded-xl text-base bg-white"
              >
                {variantKeys.map(size => (
                  <option key={size} value={size}>
                    {size === 'unico' ? 'Stock único' : 'Talla ' + size} · {product.inventory?.[size] ?? 0} un.
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4">
            <p className="text-sm text-zinc-600">Cantidad registrada ahora</p>
            <p className="text-3xl font-bold text-zinc-950 mt-1">{currentStock}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-800">{quantityLabel}</label>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={quantity}
              onChange={event => setQuantity(Number(event.target.value))}
              className="w-full min-h-14 px-4 border border-zinc-300 rounded-xl text-xl font-semibold"
            />
            {movementType === 'count' && (
              <p className="text-sm text-zinc-500">
                El conteo reemplaza la cantidad registrada. Si hubo una venta mientras esta ventana estaba abierta, el sistema pedirá recargar antes de guardar.
              </p>
            )}
          </div>

          {movementType === 'sale' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-800">¿Dónde se vendió?</label>
              <select value={channel} onChange={event => setChannel(event.target.value)} className="w-full min-h-12 px-4 border border-zinc-300 rounded-xl text-base bg-white">
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="presencial">Presencial</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-800">Nota opcional</label>
            <input
              value={note}
              maxLength={180}
              onChange={event => setNote(event.target.value)}
              placeholder="Ej: venta a clienta habitual / llegó pedido proveedor"
              className="w-full min-h-12 px-4 border border-zinc-300 rounded-xl text-base"
            />
          </div>

          <button type="button" disabled={busy} onClick={submit} className="w-full min-h-14 rounded-2xl bg-black text-white text-base font-bold disabled:opacity-50">
            {busy ? 'Guardando…' : 'Confirmar movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
