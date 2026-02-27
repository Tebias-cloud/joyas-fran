'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

// 1. Renombramos tu componente original a PaymentResultContent
function PaymentResultContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  
  // Parámetros que envía Mercado Pago en la URL al volver
  const payment_id = searchParams.get('payment_id');
  const payment_status = searchParams.get('status');
  const external_reference = searchParams.get('external_reference');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu pago con el banco...');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const verifyPayment = async () => {
      // 1. CASO ERROR DE NAVEGACIÓN O PARÁMETROS FALTANTES
      if (!payment_id || !payment_status) {
        setStatus('error');
        setMessage('No se recibió información válida del pago.');
        return;
      }

      // 2. CASO RECHAZO O CANCELACIÓN DEL USUARIO
      if (payment_status !== 'approved') {
        setStatus('error');
        setMessage('El pago no fue aprobado o fue cancelado. No se han realizado cargos.');
        return;
      }

      // 3. CASO VALIDACIÓN EXITOSA (Vamos al backend a confirmar)
      try {
        const res = await fetch('/api/payment/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id, status: payment_status, external_reference }),
        });

        const data = await res.json();

        if (data.success) {
          setStatus('success');
          clearCart(); // Vaciamos el carrito si todo salió bien
        } else {
          setStatus('error');
          setMessage(data.message || 'El pago fue rechazado al verificar.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Error de conexión al verificar el pago.');
      }
    };

    verifyPayment();

  }, [payment_id, payment_status, external_reference, clearCart]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-gray-400"/>
          <p className="text-sm text-gray-500">Confirmando transacción...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-serif italic text-gray-900">Pago no completado</h2>
          <p className="text-gray-500 text-sm">{message}</p>
          <Link href="/checkout" className="block bg-black text-white py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">
            Intentar Nuevamente
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto border-4 border-green-100">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-serif italic text-gray-900">¡Gracias por tu compra!</h1>
        <p className="text-gray-500 text-sm">Tu pedido ha sido confirmado correctamente.</p>
        
        <div className="space-y-3 pt-4">
          <Link href="/cuenta" className="block w-full bg-black text-white py-4 rounded-sm text-[11px] uppercase tracking-widest font-bold hover:bg-zinc-800 transition-colors">
            Ver mis Pedidos
          </Link>
          <Link href="/catalogo" className="block w-full border border-gray-200 py-4 rounded-sm text-[11px] uppercase tracking-widest font-bold hover:bg-gray-50 transition-colors text-black">
            Seguir Comprando
          </Link>
        </div>
      </div>
    </div>
  );
}

// 2. Exportamos el componente envolviendo todo en un Suspense
export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-gray-400"/>
          <p className="text-sm text-gray-500">Cargando confirmación...</p>
        </div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}