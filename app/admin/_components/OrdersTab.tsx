'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Search, Eye, Store, Truck, Clock, X, User, Mail, Phone, Copy, Tag,
  AlertTriangle, CheckCircle, ShoppingBag, Package, TrendingUp, ChevronRight
} from 'lucide-react';
import { type Order, type OrderStatus, type Product } from '../_types';
import { TabHeader } from '../_utils';

export const getFriendlyStatus = (status: string) => {
  const lower = status.toLowerCase();
  if (lower === 'pendiente') return 'Pendiente de pago';
  if (lower === 'pagado') return 'Pagado';
  if (lower === 'preparando') return 'Preparando';
  if (lower === 'enviado') return 'Despachado';
  if (lower === 'entregado') return 'Entregado';
  return status;
};

interface OrdersTabProps {
  orders: Order[];
  products: Product[];
  orderSearchTerm: string;
  setOrderSearchTerm: (term: string) => void;
  selectedOrder: Order | null;
  setSelectedOrder: (o: Order | null) => void;
  handleUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  copyToClipboard: (text: string | undefined, label: string) => void;
}

export default function OrdersTab({
  orders,
  products,
  orderSearchTerm,
  setOrderSearchTerm,
  selectedOrder,
  setSelectedOrder,
  handleUpdateOrderStatus,
  copyToClipboard,
}: OrdersTabProps) {
  const [dateFilter, setDateFilter] = useState<'hoy' | '7dias' | '30dias' | 'mes' | 'todo'>('todo');
  const [paymentGroup, setPaymentGroup] = useState<'confirmados' | 'pendientes' | 'todos'>('confirmados');

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

  // 2. Filtrar por tipo de pago (Confirmado vs Pendiente de pago)
  const filteredByPaymentAndDateOrders = useMemo(() => {
    return filteredByDateOrders.filter(o => {
      const status = o.status.toLowerCase();
      if (paymentGroup === 'confirmados') {
        return status !== 'pendiente';
      } else if (paymentGroup === 'pendientes') {
        return status === 'pendiente';
      }
      return true; // 'todos'
    });
  }, [filteredByDateOrders, paymentGroup]);

  // 3. Filtrar por término de búsqueda
  const finalFilteredOrders = useMemo(() => {
    if (!orderSearchTerm) return filteredByPaymentAndDateOrders;
    const lower = orderSearchTerm.toLowerCase();
    return filteredByPaymentAndDateOrders.filter(o =>
      o.id.toLowerCase().includes(lower) ||
      o.shipping_info?.firstName?.toLowerCase().includes(lower) ||
      o.shipping_info?.lastName?.toLowerCase().includes(lower) ||
      o.shipping_info?.email?.toLowerCase().includes(lower) ||
      o.email?.toLowerCase().includes(lower) ||
      o.status.toLowerCase().includes(lower)
    );
  }, [filteredByPaymentAndDateOrders, orderSearchTerm]);

  // Calcular estadísticas dinámicas para el período seleccionado
  const stats = useMemo(() => {
    // Solo ventas reales confirmadas
    const confirmedPeriod = filteredByDateOrders.filter(o => o.status.toLowerCase() !== 'pendiente');
    const sales = confirmedPeriod.reduce((sum, o) => sum + o.total_amount, 0);
    const count = confirmedPeriod.length;
    const pendingDespatch = confirmedPeriod.filter(o => ['pagado', 'preparando', 'enviado'].includes(o.status.toLowerCase())).length;
    const toPrepare = confirmedPeriod.filter(o => ['pagado', 'preparando'].includes(o.status.toLowerCase())).length;
    const pendingPayment = filteredByDateOrders.filter(o => o.status.toLowerCase() === 'pendiente').length;
    const lowStock = products.filter(p => p.stock <= 3).length;

    return { sales, count, pendingDespatch, toPrepare, pendingPayment, lowStock };
  }, [filteredByDateOrders, products]);

  const hasAlerts = stats.lowStock > 0 || stats.toPrepare > 0 || stats.pendingPayment > 0;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in text-gray-900">
      <TabHeader
        title="Pedidos"
        description="Historial y gestión de pedidos recibidos."
      />

      {/* LISTADO DE PEDIDOS */}
      <div className="space-y-4">
        {/* Controles de Búsqueda y Filtros de Pago */}
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Tabs Filtro de Pagos */}
            <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 shrink-0 select-none">
              <button
                onClick={() => setPaymentGroup('confirmados')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${paymentGroup === 'confirmados' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-black'}`}
              >
                Confirmados
              </button>
              <button
                onClick={() => setPaymentGroup('pendientes')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${paymentGroup === 'pendientes' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-black'}`}
              >
                Pendientes de Pago
              </button>
              <button
                onClick={() => setPaymentGroup('todos')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${paymentGroup === 'todos' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-black'}`}
              >
                Todos
              </button>
            </div>

            {/* Selector de Rango de Fechas */}
            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200 shrink-0 select-none px-2.5 h-10">
              <span className="text-[9px] font-bold uppercase text-zinc-400">Fecha:</span>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-zinc-700 hover:text-black outline-none cursor-pointer border-none p-0 pr-4 font-bold"
              >
                <option value="todo">Todo el tiempo</option>
                <option value="hoy">Hoy</option>
                <option value="7dias">Últimos 7 días</option>
                <option value="30dias">Últimos 30 días</option>
                <option value="mes">Este mes</option>
              </select>
            </div>
          </div>

          {/* Barra de Búsqueda */}
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
            <input
              value={orderSearchTerm}
              onChange={(e) => setOrderSearchTerm(e.target.value)}
              placeholder="Buscar pedido por ID, cliente, email o estado..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-black transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Tabla / Tarjetas de Pedidos */}
        <div>
          {/* Vista Desktop: Tabla */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-[9px] uppercase font-bold tracking-widest text-gray-400 border-b">
                  <tr>
                    <th className="p-5">ID / Fecha</th>
                    <th className="p-5">Cliente</th>
                    <th className="p-5">Método / Ciudad</th>
                    <th className="p-5">Estado</th>
                    <th className="p-5">Total</th>
                    <th className="p-5 text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {finalFilteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="p-5">
                        <p className="font-mono text-xs font-bold text-gray-900">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(o.created_at).toLocaleDateString('es-CL')}{' '}
                          {new Date(o.created_at).toLocaleTimeString('es-CL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="p-5">
                        <p className="font-bold text-xs text-gray-900">
                          {o.shipping_info?.firstName} {o.shipping_info?.lastName}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {o.shipping_info?.email || o.email || 'Sin email'}
                        </p>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          {o.shipping_info?.shipping_method === 'pickup' ? (
                            <Store size={12} className="text-purple-650" />
                          ) : (
                            <Truck size={12} className="text-zinc-650" />
                          )}
                          <span className="text-xs font-medium text-gray-800">
                            {o.shipping_info?.city || 'Retiro'}
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border ${
                            o.status === 'Pagado'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : o.status === 'Enviado'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : o.status === 'Entregado'
                              ? 'bg-gray-100 text-gray-700 border-gray-250'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}
                        >
                          {getFriendlyStatus(o.status)}
                        </span>
                      </td>
                      <td className="p-5 font-bold text-gray-900">
                        ${o.total_amount.toLocaleString('es-CL')}
                      </td>
                      <td className="p-5 text-right">
                        <button className="p-2 text-gray-400 group-hover:text-black transition-colors">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Móvil: Tarjetas Premium */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {finalFilteredOrders.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-3 active:bg-zinc-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs font-bold text-gray-900">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(o.created_at).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                      o.status === 'Pagado'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : o.status === 'Enviado'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}
                  >
                    {getFriendlyStatus(o.status)}
                  </span>
                </div>

                <div className="flex justify-between items-end border-t border-zinc-50 pt-2.5">
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {o.shipping_info?.firstName} {o.shipping_info?.lastName}
                    </p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1 font-medium">
                      {o.shipping_info?.shipping_method === 'pickup' ? (
                        <Store size={10} className="text-purple-650" />
                      ) : (
                        <Truck size={10} className="text-zinc-600" />
                      )}
                      {o.shipping_info?.city || 'Retiro en local'}
                    </p>
                  </div>
                  <p className="font-bold text-sm text-gray-900">
                    ${o.total_amount.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {finalFilteredOrders.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-xs italic bg-white rounded-2xl border border-zinc-200 shadow-sm">
              No se encontraron pedidos en esta categoría para el rango seleccionado.
            </div>
          )}
        </div>
      </div>

      {/* Modal Detalle Pedido (Con estilo Bottom-sheet en Móvil) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-fade-in text-gray-900">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] md:max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="p-5 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-base md:text-lg font-serif italic flex items-center gap-2">
                  Pedido #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  <span
                    className={`text-[8px] md:text-[9px] not-italic font-sans px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      selectedOrder.status === 'Pagado'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-zinc-100 border-zinc-250 text-zinc-600'
                    }`}
                  >
                    {getFriendlyStatus(selectedOrder.status)}
                  </span>
                </h2>
                <p className="text-[10px] text-gray-450 flex items-center gap-1 mt-1 font-mono">
                  <Clock size={10} />{' '}
                  {new Date(selectedOrder.created_at).toLocaleString('es-CL')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-zinc-50 rounded-full transition-colors text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Modal Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cliente Tarjeta */}
                <div className="p-4 bg-zinc-50 rounded-2xl text-sm border border-zinc-150 hover:border-zinc-300 transition-colors relative group">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <User size={12} />
                    <p className="text-[9px] font-bold uppercase tracking-widest">
                      Información del Cliente
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="font-bold text-sm text-gray-900">
                        {selectedOrder.shipping_info?.firstName}{' '}
                        {selectedOrder.shipping_info?.lastName}
                      </p>
                      {selectedOrder.shipping_info?.rut && (
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                          RUT: {selectedOrder.shipping_info.rut}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-200/50 space-y-2">
                      <div className="flex items-center justify-between group/item">
                        <p className="text-xs text-zinc-650 flex items-center gap-2 truncate pr-2">
                          <Mail size={12} className="text-gray-450 shrink-0" />
                          <span className="truncate">
                            {selectedOrder.shipping_info?.email ||
                              selectedOrder.email ||
                              'Sin email'}
                          </span>
                        </p>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              selectedOrder.shipping_info?.email ||
                                selectedOrder.email,
                              'Email'
                            )
                          }
                          className="text-gray-400 hover:text-black opacity-100"
                          title="Copiar"
                        >
                          <Copy size={12} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between group/item">
                        <p className="text-xs text-zinc-650 flex items-center gap-2">
                          <Phone size={12} className="text-gray-450" />
                          {selectedOrder.shipping_info?.phone || 'Sin teléfono'}
                        </p>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              selectedOrder.shipping_info?.phone,
                              'Teléfono'
                            )
                          }
                          className="text-gray-400 hover:text-black opacity-100"
                          title="Copiar"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Envío Tarjeta */}
                <div className="p-4 bg-zinc-50 rounded-2xl text-sm border border-zinc-150 hover:border-zinc-300 transition-colors relative group">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                    {selectedOrder.shipping_info?.shipping_method ===
                    'pickup' ? (
                      <Store size={12} />
                    ) : (
                      <Truck size={12} />
                    )}
                    <p className="text-[9px] font-bold uppercase tracking-widest">
                      {selectedOrder.shipping_info?.shipping_method ===
                      'pickup'
                        ? 'Retiro en Tienda'
                        : 'Detalles de Despacho'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {selectedOrder.shipping_info?.shipping_method ===
                    'pickup' ? (
                      <div className="p-2 bg-purple-50 text-purple-700 rounded-md text-[10px] font-bold border border-purple-100 uppercase tracking-wider">
                        Retiro presencial en local
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="pr-2">
                          <p className="font-bold leading-relaxed text-xs text-gray-905">
                            {selectedOrder.shipping_info?.address}
                          </p>
                          {selectedOrder.shipping_info?.apartment && (
                            <p className="text-zinc-600 font-bold bg-zinc-150 px-2 py-0.5 rounded text-[9px] border border-zinc-200 inline-block mt-1">
                              {selectedOrder.shipping_info.apartment}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `${selectedOrder.shipping_info?.address} ${
                                selectedOrder.shipping_info?.apartment || ''
                              }, ${selectedOrder.shipping_info?.city}`,
                              'Dirección'
                            )
                          }
                          className="text-gray-400 hover:text-black mt-0.5"
                          title="Copiar"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-200/50">
                      <p className="text-gray-800 font-bold text-xs">
                        {selectedOrder.shipping_info?.city || 'Iquique'}
                      </p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">
                        {selectedOrder.shipping_info?.region || 'Tarapacá'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ítems del Pedido */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">
                  Detalle de Artículos
                </p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl bg-white shadow-sm"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border bg-zinc-50 flex-shrink-0">
                        {item.image_url && (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-xs truncate">
                          {item.name}
                        </p>
                        <p className="text-[9px] text-gray-450 mt-0.5">
                          Talla:{' '}
                          <span className="font-bold text-black">
                            {item.selectedSize}
                          </span>{' '}
                          <span className="mx-1 text-gray-200">|</span> Cant:{' '}
                          {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-xs text-gray-950">
                        $
                        {(item.price * item.quantity).toLocaleString(
                          'es-CL'
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose final de caja */}
              <div className="flex justify-end pt-4 border-t border-zinc-100">
                <div className="text-right space-y-1">
                  {selectedOrder.discount_info && (
                    <div className="flex items-center justify-end gap-2 text-green-600">
                      <span className="text-[8px] font-bold uppercase flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        <Tag size={8} /> {selectedOrder.discount_info.code}
                      </span>
                      <span className="text-xs font-bold">
                        -$
                        {selectedOrder.discount_info.amount.toLocaleString(
                          'es-CL'
                        )}
                      </span>
                    </div>
                  )}
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">
                    Monto Total Recibido
                  </p>
                  <p className="text-xl md:text-2xl font-serif italic text-zinc-950">
                    ${selectedOrder.total_amount.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>

            {/* Cambiar Estado del pedido en Modal (Bottom action bar) */}
            <div className="p-4 bg-zinc-50 border-t flex flex-col items-center gap-2 pb-6 md:pb-4">
              <span className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">
                Actualizar estado del despacho
              </span>
              <div className="flex flex-wrap justify-center gap-1 w-full sm:w-auto">
                {([
                  'Pagado',
                  'Preparando',
                  'Enviado',
                  'Entregado',
                ] as OrderStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, s)}
                    className={`flex-1 sm:flex-none px-2.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                      selectedOrder.status === s
                        ? 'bg-black text-white border-black shadow-md ring-2 ring-offset-1 ring-black'
                        : 'bg-white text-gray-500 border-zinc-200 hover:text-black hover:border-black'
                    }`}
                  >
                    {getFriendlyStatus(s)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
