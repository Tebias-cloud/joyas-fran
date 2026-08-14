'use client';

import { Plus, X, Package, Search, Edit, Trash2 } from 'lucide-react';
import { TabHeader } from '../_utils';
import type {
  Coupon,
  Category,
  CouponFormState,
} from '../_types';

interface DiscountsTabProps {
  coupons: Coupon[];
  filteredCoupons: Coupon[];
  couponSearchTerm: string;
  setCouponSearchTerm: (v: string) => void;
  showCouponForm: boolean;
  setShowCouponForm: (v: boolean) => void;
  couponForm: CouponFormState;
  setCouponForm: (v: CouponFormState) => void;
  editingCouponId: number | null;
  setEditingCouponId: (v: number | null) => void;
  handleSaveCoupon: (e: React.FormEvent) => void;
  handleEditCouponClick: (c: Coupon) => void;
  handleDeleteCoupon: (id: number, code: string) => void;
}

export default function DiscountsTab({
  coupons,
  filteredCoupons,
  couponSearchTerm,
  setCouponSearchTerm,
  showCouponForm,
  setShowCouponForm,
  couponForm,
  setCouponForm,
  editingCouponId,
  setEditingCouponId,
  handleSaveCoupon,
  handleEditCouponClick,
  handleDeleteCoupon,
}: DiscountsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <TabHeader
          title="Códigos de Descuento"
          description="Crea promociones por porcentaje, montos fijos o envío gratis."
        />
        {!showCouponForm && (
          <button
            onClick={() => {
              setEditingCouponId(null);
              setCouponForm({ code: '', type: 'percent', value: '', min_purchase: '', is_active: true });
              setShowCouponForm(true);
            }}
            className="bg-black text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-zinc-800 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={16} /> Crear Cupón
          </button>
        )}
      </div>

      {/* FORMULARIO CUPONES */}
      {showCouponForm && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-up">
          <h3 className="font-serif italic text-xl mb-6 pb-2 border-b">{editingCouponId ? 'Modificar Promoción' : 'Nueva Promoción'}</h3>

          <form onSubmit={handleSaveCoupon} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400">Código de Cupón</label>
                <input
                  required
                  value={couponForm.code}
                  onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm font-mono font-bold tracking-widest outline-none focus:border-black uppercase"
                  placeholder="EJ: VERANO26"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400">Tipo de Descuento</label>
                <select
                  value={couponForm.type}
                  onChange={e => setCouponForm({ ...couponForm, type: e.target.value as 'percent' | 'fixed' | 'shipping' })}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white cursor-pointer outline-none focus:border-black"
                >
                  <option value="percent">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo ($)</option>
                  <option value="shipping">Envío Gratis</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400">Valor de Descuento</label>
                <input
                  required
                  type="number"
                  value={couponForm.value}
                  onChange={e => setCouponForm({ ...couponForm, value: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                  placeholder="Valor"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400">Compra Mínima (CLP)</label>
                <input
                  type="number"
                  value={couponForm.min_purchase}
                  onChange={e => setCouponForm({ ...couponForm, min_purchase: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-black"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="coupon-active"
                checked={couponForm.is_active}
                onChange={e => setCouponForm({ ...couponForm, is_active: e.target.checked })}
                className="w-4 h-4 border-gray-300 rounded text-black focus:ring-black"
              />
              <label htmlFor="coupon-active" className="text-xs font-bold uppercase text-gray-700 cursor-pointer">Cupón Activo</label>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <button type="submit" className="bg-black text-white px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors">Guardar</button>
              <button type="button" onClick={() => { setEditingCouponId(null); setShowCouponForm(false); }} className="bg-zinc-100 text-zinc-650 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* LISTADO DE CUPONES */}
      {!showCouponForm && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
            <input
              value={couponSearchTerm}
              onChange={(e) => setCouponSearchTerm(e.target.value)}
              placeholder="Buscar promociones por código..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-black transition-all shadow-sm"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-[9px] uppercase font-bold tracking-widest text-gray-400 border-b">
                  <tr>
                    <th className="p-5">Código</th>
                    <th className="p-5">Beneficio</th>
                    <th className="p-5">Mínimo Compra</th>
                    <th className="p-5 text-center">Usos</th>
                    <th className="p-5 text-center">Estado</th>
                    <th className="p-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCoupons.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-5 font-mono font-bold text-gray-900 tracking-wider text-sm">{c.code}</td>
                      <td className="p-5 text-xs text-zinc-605 font-medium">
                        {c.type === 'percent' && `${c.value}% de desc.`}
                        {c.type === 'fixed' && `$${c.value.toLocaleString('es-CL')} de desc.`}
                        {c.type === 'shipping' && `Envío Gratis`}
                      </td>
                      <td className="p-5 text-zinc-500">${c.min_purchase.toLocaleString('es-CL')}</td>
                      <td className="p-5 text-center text-xs text-gray-400">{c.used_count || 0} veces</td>
                      <td className="p-5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${c.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {c.is_active ? 'Activo' : 'Pausado'}
                        </span>
                      </td>
                      <td className="p-5 text-right space-x-1">
                        <button onClick={() => handleEditCouponClick(c)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition-all"><Edit size={14} /></button>
                        <button onClick={() => handleDeleteCoupon(c.id, c.code)} className="p-2 text-gray-400 hover:text-red-655 hover:bg-red-50 rounded-md transition-all"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCoupons.length === 0 && (
              <div className="p-12 text-center text-gray-400 text-xs italic">
                {coupons.length === 0 ? 'No hay cupones creados aún.' : 'No se encontraron cupones con ese código.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
