'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Trash2, Tag, Power, Plus, Loader2, AlertCircle } from 'lucide-react';

interface Coupon {
  id: number;
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  is_active: boolean;
  used_count: number;
  min_purchase: number;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el formulario de nuevo cupón
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'percent' | 'fixed' | 'shipping'>('percent');
  const [newValue, setNewValue] = useState(0);
  const [newMinPurchase, setNewMinPurchase] = useState(0);

  // 1. FUNCIÓN PARA OBTENER LOS CUPONES DE LA BASE DE DATOS
  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('id', { ascending: false });
      
      if (error) {
        console.error("Error de Supabase:", error.message);
        toast.error("No se pudieron cargar los cupones: " + error.message);
        return;
      }
      
      if (data) {
        setCoupons(data as Coupon[]);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. EFECTO DE MONTAJE (Usa setTimeout para evitar el error de cascading renders)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoupons();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // 3. FUNCIÓN PARA CREAR UN CUPÓN
  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCode = newCode.toUpperCase().trim();
    if (!cleanCode) return toast.error("El código no puede estar vacío");
    if (newValue < 0) return toast.error("El valor no puede ser negativo");

    const { error } = await supabase.from('coupons').insert({
      code: cleanCode,
      type: newType,
      value: newValue,
      min_purchase: newMinPurchase,
      is_active: true
    });

    if (error) {
      console.error("Error al crear:", error.message);
      if (error.code === '23505') {
        toast.error("Este código ya existe. Elige uno diferente.");
      } else {
        toast.error("Error al crear el cupón: " + error.message);
      }
    } else {
      toast.success("Cupón creado con éxito");
      setNewCode('');
      setNewValue(0);
      setNewMinPurchase(0);
      fetchCoupons(); // Recargamos la lista
    }
  };

  // 4. CAMBIAR ESTADO (ACTIVAR/DESACTIVAR)
  const toggleStatus = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error("No se pudo cambiar el estado");
    } else {
      toast.success(currentStatus ? "Cupón desactivado" : "Cupón activado");
      fetchCoupons();
    }
  };

  // 5. ELIMINAR CUPÓN
  const deleteCoupon = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar este cupón? No se puede deshacer.")) return;
    
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("No se puede eliminar (probablemente ya fue usado)");
    } else {
      toast.success("Cupón eliminado");
      fetchCoupons();
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans bg-white min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6"/> Gestión de Cupones</h1>
        <button onClick={fetchCoupons} className="text-xs text-gray-400 hover:text-black transition-colors underline">Refrescar lista</button>
      </div>

      {/* FORMULARIO DE CREACIÓN */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-10 shadow-sm">
        <h2 className="text-xs font-bold uppercase mb-4 text-gray-400 tracking-widest">Crear Nueva Promoción</h2>
        <form onSubmit={createCoupon} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="col-span-1 md:col-span-1">
            <label className="block text-[10px] font-bold mb-1 uppercase">Código</label>
            <input 
              className="w-full p-2 border rounded-md uppercase text-sm focus:ring-1 focus:ring-black outline-none" 
              placeholder="EJ: VERANO20" 
              value={newCode} 
              onChange={e => setNewCode(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1 uppercase">Tipo</label>
            <select 
              className="w-full p-2 border rounded-md text-sm bg-white cursor-pointer outline-none" 
              value={newType} 
              onChange={e => setNewType(e.target.value as 'percent' | 'fixed' | 'shipping')}
            >
              <option value="percent">Porcentaje (%)</option>
              <option value="fixed">Monto Fijo ($)</option>
              <option value="shipping">Envío Gratis</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1 uppercase">Valor</label>
            <input 
              type="number" 
              className="w-full p-2 border rounded-md text-sm outline-none" 
              placeholder="0" 
              value={newValue} 
              onChange={e => setNewValue(Number(e.target.value))} 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1 uppercase">Mín. Compra</label>
            <input 
              type="number" 
              className="w-full p-2 border rounded-md text-sm outline-none" 
              placeholder="0" 
              value={newMinPurchase} 
              onChange={e => setNewMinPurchase(Number(e.target.value))} 
            />
          </div>
          <button className="bg-black text-white px-4 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all h-[38px]">
            <Plus className="w-4 h-4"/> Crear Cupón
          </button>
        </form>
      </div>

      {/* LISTADO DE CUPONES */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
            <tr>
              <th className="p-4">Estado</th>
              <th className="p-4">Código</th>
              <th className="p-4">Beneficio</th>
              <th className="p-4">Mínimo</th>
              <th className="p-4">Usos</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-300"/>
                  <p className="mt-2 text-xs text-gray-400">Consultando base de datos...</p>
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto text-gray-200 mb-2"/>
                  <p className="text-sm text-gray-400">No se encontraron cupones creados.</p>
                </td>
              </tr>
            ) : coupons.map(coupon => (
              <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[9px] font-black tracking-tighter ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {coupon.is_active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </td>
                <td className="p-4 font-mono font-bold text-gray-900">{coupon.code}</td>
                <td className="p-4 text-gray-600">
                  {coupon.type === 'percent' && `${coupon.value}% de desc.`}
                  {coupon.type === 'fixed' && `$${coupon.value.toLocaleString('es-CL')} de desc.`}
                  {coupon.type === 'shipping' && `Envío Gratis`}
                </td>
                <td className="p-4 text-gray-500">${coupon.min_purchase.toLocaleString('es-CL')}</td>
                <td className="p-4 text-gray-400 text-xs">{coupon.used_count} veces usado</td>
                <td className="p-4 flex justify-end gap-3">
                  <button 
                    onClick={() => toggleStatus(coupon.id, coupon.is_active)} 
                    className={`p-2 rounded-md transition-colors ${coupon.is_active ? 'bg-gray-100 text-gray-400 hover:text-red-500' : 'bg-gray-100 text-gray-400 hover:text-green-600'}`}
                    title={coupon.is_active ? "Desactivar" : "Activar"}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteCoupon(coupon.id)} 
                    className="p-2 bg-gray-100 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}