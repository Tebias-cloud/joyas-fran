'use client';

import { useMemo, useState } from 'react';
import { Package, Truck, AlertTriangle, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { TabHeader } from '../_utils';
import type { Order, Product } from '../_types';

interface DashboardTabProps {
  orders: Order[];
  products: Product[];
  onViewReplenishmentProducts: () => void;
}

type DateFilter = 'hoy' | '7dias' | '30dias' | 'mes' | 'todo';

export default function DashboardTab({
  orders,
  products,
  onViewReplenishmentProducts,
}: DashboardTabProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('todo');

  // 1. Filtrar por rango de fechas
  const filteredByDateOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = new Date(o.created_at);
      const now = new Date();
      if (dateFilter === 'hoy') {
        return orderDate.toDateString() === now.toDateString();
      } else if (dateFilter === '7dias') {
        const limit = new Date();
        limit.setDate(now.getDate() - 7);
        return orderDate >= limit;
      } else if (dateFilter === '30dias') {
        const limit = new Date();
        limit.setDate(now.getDate() - 30);
        return orderDate >= limit;
      } else if (dateFilter === 'mes') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      return true; // 'todo'
    });
  }, [orders, dateFilter]);

  // 2. Calcular métricas para el período
  const stats = useMemo(() => {
    const confirmedPeriod = filteredByDateOrders.filter(o => o.status.toLowerCase() !== 'pendiente');
    const sales = confirmedPeriod.reduce((sum, o) => sum + o.total_amount, 0);
    const count = confirmedPeriod.length;
    const pendingDespatch = confirmedPeriod.filter(o =>
      ['pagado', 'preparando', 'enviado'].includes(o.status.toLowerCase())
    ).length;
    const toPrepare = confirmedPeriod.filter(o =>
      ['pagado', 'preparando'].includes(o.status.toLowerCase())
    ).length;
    const pendingPayment = filteredByDateOrders.filter(o => o.status.toLowerCase() === 'pendiente').length;
    
    // Cuenta de productos con stock <= 3 (reposición)
    const replenishmentCount = products.filter(p => p.stock <= 3).length;

    return { sales, count, pendingDespatch, toPrepare, pendingPayment, replenishmentCount };
  }, [filteredByDateOrders, products]);

  const hasAlerts = stats.replenishmentCount > 0 || stats.toPrepare > 0 || stats.pendingPayment > 0;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in text-gray-900">
      <TabHeader
        title="Inicio"
        description="Resumen operativo y métricas comerciales de Joyas Fran."
      />

      {/* SECCIÓN: QUÉ NECESITA TU ATENCIÓN */}
      {hasAlerts && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-widest block">
            ⚠️ Qué necesita tu atención
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.toPrepare > 0 && (
              <div className="bg-white p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0">
                  <Package size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Preparar despachos</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Tienes <strong>{stats.toPrepare}</strong> pedido(s) listo(s) para empaquetar y enviar.
                  </p>
                </div>
              </div>
            )}

            {stats.replenishmentCount > 0 && (
              <div className="bg-white p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-grow">
                  <h4 className="text-sm font-bold text-amber-950">Reposición de inventario</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Hay <strong>{stats.replenishmentCount}</strong> {stats.replenishmentCount === 1 ? 'producto que necesita' : 'productos que necesitan'} reposición de stock.
                  </p>
                  <button
                    onClick={onViewReplenishmentProducts}
                    className="mt-2.5 text-xs font-bold uppercase tracking-wider text-black hover:text-zinc-700 flex items-center gap-0.5 transition-colors"
                  >
                    Ver productos <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {stats.pendingPayment > 0 && (
              <div className="bg-white p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Pagos pendientes</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Hay <strong>{stats.pendingPayment}</strong> compra(s) iniciada(s) con pago pendiente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN: MÉTRICAS Y FILTRO DE FECHA */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-zinc-150">
          <div>
            <h3 className="text-base font-bold uppercase tracking-wider text-zinc-800">Rendimiento Comercial</h3>
            <p className="text-xs text-zinc-500 font-light mt-0.5">Ventas y pedidos acumulados en el período.</p>
          </div>
          {/* Selector de Rango de Fechas */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Filtrar por:</span>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as DateFilter)}
              className="p-2 border border-zinc-200 rounded-lg text-xs bg-zinc-55 hover:bg-zinc-100 outline-none cursor-pointer font-bold text-zinc-700 transition-colors"
            >
              <option value="todo">Todo el tiempo</option>
              <option value="hoy">Hoy</option>
              <option value="7dias">Últimos 7 días</option>
              <option value="30dias">Últimos 30 días</option>
              <option value="mes">Este mes</option>
            </select>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Ventas */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1.5">
              <TrendingUp size={13} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Ventas del Período</span>
            </div>
            <div>
              <p className="text-lg md:text-xl font-serif italic text-zinc-900 font-semibold">
                ${stats.sales.toLocaleString('es-CL')}
              </p>
              <span className="text-[9px] text-zinc-400 block mt-0.5">Ingresos reales confirmados</span>
            </div>
          </div>

          {/* Pedidos */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1.5">
              <Package size={13} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Pedidos del Período</span>
            </div>
            <div>
              <p className="text-lg md:text-xl font-serif italic text-zinc-900 font-semibold">
                {stats.count} {stats.count === 1 ? 'pedido' : 'pedidos'}
              </p>
              <span className="text-[9px] text-zinc-400 block mt-0.5">Transacciones pagadas</span>
            </div>
          </div>

          {/* Por Despachar */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1.5">
              <Truck size={13} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Pendientes de Despacho</span>
            </div>
            <div>
              <p className="text-lg md:text-xl font-serif italic text-zinc-900 font-semibold">
                {stats.pendingDespatch}
              </p>
              <span className="text-[9px] text-zinc-400 block mt-0.5">Pedidos listos/en camino</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
