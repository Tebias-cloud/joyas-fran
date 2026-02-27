'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js'; 
import { 
  ChevronDown, ChevronUp, Loader2, ArrowLeft, X, 
  ShoppingBag, Truck, AlertCircle, Tag, MapPin, 
  Store 
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { REGIONES_Y_COMUNAS } from '@/lib/chile-data'; 

// --- UTILIDADES DE VALIDACIÓN ---
const cleanRut = (rut: string) => typeof rut === 'string' ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';

const formatRut = (rut: string) => {
  const value = cleanRut(rut); 
  if (value.length <= 1) return value;
  const dv = value.slice(-1);
  let body = value.slice(0, -1);
  body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${dv}`;
};

const validateRut = (rut: string): boolean => {
  if (!rut.includes('-')) return false;
  const clean = cleanRut(rut);
  if (clean.length < 8) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let suma = 0;
  let multiplo = 2;
  for (let i = 1; i <= body.length; i++) {
    const index = body.length - i;
    const valor = parseInt(body.charAt(index));
    suma += valor * multiplo;
    if (multiplo < 7) multiplo += 1;
    else multiplo = 2;
  }
  const dvEsperado = 11 - (suma % 11);
  let dvCalculado = '';
  if (dvEsperado === 11) dvCalculado = '0';
  else if (dvEsperado === 10) dvCalculado = 'K';
  else dvCalculado = dvEsperado.toString();
  return dv === dvCalculado;
};

// --- TYPES ---
interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  selectedSize?: string;
  compare_at_price?: number | null;
  slug?: string;
}

interface RegionData {
  region: string;
  comunas: string[];
}

interface ShippingRate {
  name: string;
  price: number;
  days: string;
}

interface Discount {
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  amount: number;
}

interface ApiResponse {
  rate?: ShippingRate;
  discount?: Discount;
  error?: string;
}

type DeliveryMethod = 'shipping' | 'pickup';

const PICKUP_RATE: ShippingRate = {
  name: 'Retiro en Tienda (Iquique)',
  price: 0,
  days: 'Listo en 24hrs'
};

const POLICY_CONTENT: Record<string, React.ReactNode> = {
  'Política de reembolso': (
    <div className="space-y-2 text-[11px]"><p><strong>Garantía Legal (6 Meses):</strong> Cubrimos fallas de fabricación.</p></div>
  ),
  'Política de envío': (
    <div className="space-y-2 text-[11px]"><p>Despachamos desde Iquique en 1-2 días hábiles.</p></div>
  ),
  'Términos del servicio': <p className="text-[11px]">Plata Ley 925 garantizada.</p>
};

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart(); 
  const router = useRouter();
  const toastShownRef = useRef(false);

  // Estados UI/Lógica
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false); 
  const isProcessingRef = useRef(false); 
  const [calculating, setCalculating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showSummaryMobile, setShowSummaryMobile] = useState(false);
  const [openPolicy, setOpenPolicy] = useState<string | null>(null);

  // Estados Checkout
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('shipping');
  const [saveInfo, setSaveInfo] = useState(false); 
  const [shippingRate, setShippingRate] = useState<ShippingRate | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [formData, setFormData] = useState({
    email: '', firstName: '', lastName: '', rut: '', phone: '+56 9 ',
    address: '', apartment: '', region: '', city: '', paymentMethod: 'webpay'
  });

  const [errors, setErrors] = useState({ rut: '', phone: '' });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const regionData = REGIONES_Y_COMUNAS.find((r: RegionData) => r.region === formData.region);
  const comunasDisponibles: string[] = REGIONES_Y_COMUNAS.find((r: RegionData) => r.region === formData.region)?.comunas || [];
  
  const subtotal = cartTotal;
  const currentShippingPrice = deliveryMethod === 'pickup' ? 0 : (shippingRate?.price || 0);
  const finalShippingCost = (discount?.type === 'shipping') ? 0 : currentShippingPrice;
  const discountAmountMoney = (discount && discount.type !== 'shipping') ? discount.amount : 0;
  const total = Math.round(Math.max(0, subtotal - discountAmountMoney) + finalShippingCost);

  // --- VALIDACIÓN DEL FORMULARIO ---
  const isFormValid = useMemo(() => {
    if (errors.rut || errors.phone) return false;
    const contactValid = 
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.rut.trim() !== '' && validateRut(formData.rut) && 
      formData.phone.length >= 12;

    if (deliveryMethod === 'pickup') {
      return contactValid && cart.length > 0;
    }

    const isCityValid = formData.city !== '' && comunasDisponibles.includes(formData.city);
    return (
      contactValid &&
      formData.address.trim() !== '' &&
      formData.region !== '' &&
      isCityValid && 
      shippingRate !== null && 
      cart.length > 0
    );
  }, [formData, shippingRate, comunasDisponibles, cart, deliveryMethod, errors]);

  // Redirección
  useEffect(() => {
    if (!loading && cart.length === 0) {
      router.replace('/');
    }
  }, [cart, loading, router]);

  // Carga inicial
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!toastShownRef.current) {
           toast.error("Inicia sesión para finalizar tu compra.");
           toastShownRef.current = true;
        }
        router.replace('/login?redirect=/checkout');
        return;
      }
      setUser(session.user);
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      
      if (profile) {
        const savedRegion = profile.region || '';
        const savedCity = profile.city || '';
        
        const formattedRut = profile.rut ? formatRut(profile.rut) : '';
        let formattedPhone = profile.phone || '+56 9 ';
        if (profile.phone && !profile.phone.startsWith('+56')) {
             formattedPhone = '+56 9 ' + profile.phone;
        }

        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          rut: formattedRut,
          phone: formattedPhone,
          address: profile.address || '',
          apartment: profile.apartment || '', 
          region: savedRegion,
          city: savedCity
        }));

        if (savedRegion && savedCity) {
           void fetch('/api/shipping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ region: savedRegion, city: savedCity, cartTotal })
           }).then(res => res.json()).then(data => {
                if (data.rate) setShippingRate(data.rate);
           });
        }
      }
      setLoading(false);
    };
    init();
  }, [router, cartTotal]);

  // Efecto métodos entrega
  useEffect(() => {
    if (deliveryMethod === 'pickup') {
      setShippingRate(PICKUP_RATE);
    } else {
      if (formData.region && formData.city) {
        calculateShipping(formData.region, formData.city);
      } else {
        setShippingRate(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMethod]);

  const calculateShipping = async (region: string, city: string) => {
    if (deliveryMethod === 'pickup') return; 
    if (!region || !city) return;
    
    setCalculating(true);
    setShippingRate(null);
    try {
        const res = await fetch('/api/shipping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ region, city, cartTotal })
        });
        const data: ApiResponse = await res.json();
        if (data.rate) setShippingRate(data.rate);
    } catch {
        toast.error("Error al calcular envío.");
    } finally {
        setCalculating(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, cartTotal: subtotal, userId: user?.id })
      });
      const data: ApiResponse = await res.json();
      if (res.ok && data.discount) {
        setDiscount(data.discount);
        toast.success(`¡Descuento aplicado!`);
      } else {
        toast.error(data.error || "Cupón inválido");
        setCouponCode('');
      }
    } catch {
      toast.error("Error validando cupón");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'rut') {
        const formatted = formatRut(value);
        setFormData(prev => ({ ...prev, rut: formatted }));
        if (formatted.length > 0 && !validateRut(formatted)) {
           if (formatted.length > 8) setErrors(prev => ({...prev, rut: 'RUT inválido'}));
        } else {
           setErrors(prev => ({...prev, rut: ''}));
        }
    } else if (name === 'phone') {
        let input = value;
        if (!input.startsWith('+56 9 ')) input = '+56 9 ';
        const numberPart = input.slice(6).replace(/\D/g, '');
        const trimmedNumber = numberPart.slice(0, 8);
        setFormData(prev => ({ ...prev, phone: `+56 9 ${trimmedNumber}` }));
        if (trimmedNumber.length === 8) setErrors(prev => ({...prev, phone: ''}));
        else if (trimmedNumber.length > 0) setErrors(prev => ({...prev, phone: 'Faltan dígitos'}));
    } else if (name === 'region') {
        setFormData(prev => ({ ...prev, region: value, city: '' }));
        if (deliveryMethod === 'shipping') setShippingRate(null);
    } else if (name === 'city') {
        setFormData(prev => ({ ...prev, city: value }));
        if (value && deliveryMethod === 'shipping') calculateShipping(formData.region, value);
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRutBlur = () => {
    if (formData.rut.length > 0 && !validateRut(formData.rut)) {
        setErrors(prev => ({...prev, rut: 'RUT Incorrecto'}));
    } else {
        setErrors(prev => ({...prev, rut: ''}));
    }
  };

  // --- LÓGICA DE PAGO ACTUALIZADA A MERCADO PAGO ---
  const handleFinalizeOrder = async () => {
    if (isProcessingRef.current) return;

    if (!isFormValid) {
        if (errors.rut) toast.error("El RUT ingresado no es válido");
        else if (deliveryMethod === 'shipping' && (!formData.region || !formData.city)) toast.error("Selecciona Región y Comuna");
        else if (deliveryMethod === 'shipping' && !shippingRate) toast.error("Calculando envío...");
        else toast.error("Por favor completa todos los datos correctamente.");
        return;
    }
    if (!user) return toast.error("Sesión expirada");

    isProcessingRef.current = true;
    setProcessing(true);

    try {
        // 1. Guardar perfil si se seleccionó
        if (saveInfo) {
          const updates = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            rut: formData.rut,
            phone: formData.phone,
            address: formData.address,
            apartment: formData.apartment, 
            region: formData.region,
            city: formData.city,
            updated_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

          if (updateError) console.error("Error al guardar perfil:", updateError);
        }

        console.log("🚀 Iniciando proceso de pago...");

        const shippingInfoToSend = {
            ...formData,
            addressDetails: formData.apartment, 
            shipping_method: deliveryMethod,
            shipping_cost: finalShippingCost
        };

        // 2. Crear Orden en BD (RPC)
        const { data: orderId, error: rpcError } = await supabase.rpc('process_checkout', {
            p_user_id: user.id,
            p_items: cart,
            p_total: total,
            p_shipping_info: shippingInfoToSend,
            p_discount_info: discount
        });

        if (rpcError) throw new Error(rpcError.message);

        // 3. Forzar estado a "Pendiente Pago"
        await supabase.from('orders').update({ status: 'Pendiente Pago' }).eq('id', orderId);

        // 4. Registrar uso de Cupón
        if (discount && orderId) {
            const { data: cpn } = await supabase.from('coupons').select('id, used_count').eq('code', discount.code).single();
            if (cpn) {
                await supabase.from('coupon_usage').insert({ coupon_id: cpn.id, user_id: user.id, order_id: orderId });
                await supabase.from('coupons').update({ used_count: cpn.used_count + 1 }).eq('id', cpn.id);
            }
        }

        // 5. Llamar a API de Mercado Pago para obtener URL de cobro
        const res = await fetch('/api/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, amount: total })
        });

        const paymentData = await res.json();

        // 6. Redirección simple y limpia a Mercado Pago
        if (paymentData.url) {
            console.log("💳 Redirigiendo a Mercado Pago...");
            window.location.href = paymentData.url;
        } else {
            throw new Error(paymentData.error || "No se pudo iniciar la transacción con Mercado Pago");
        }

    } catch (error) {
        console.error("❌ Error Checkout:", error);
        toast.error(error instanceof Error ? error.message : "Error al procesar la compra.");
        isProcessingRef.current = false;
        setProcessing(false);
    }
  };

  const CartItemRow = ({ item }: { item: CartItem }) => {
    const hasDiscount = item.compare_at_price != null && item.compare_at_price > item.price;
    return (
        <div className="flex gap-4 items-center">
            <div className="relative w-16 h-16 shrink-0 border border-gray-200 bg-white rounded-md overflow-hidden">
                <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
                <span className="absolute top-1 right-1 bg-black text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold z-20 shadow-sm">
                   {item.quantity}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{item.name}</p>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                    {item.selectedSize && item.selectedSize !== 'Talla Única' ? `Talla: ${item.selectedSize}` : 'Talla Única'}
                </p>
            </div>
            <div className="text-right">
                {hasDiscount && (
                    <p className="text-[10px] text-gray-400 line-through decoration-gray-400">
                        ${(item.compare_at_price! * item.quantity).toLocaleString('es-CL')}
                    </p>
                )}
                <p className={`text-sm font-medium ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`}>
                    ${(item.price * item.quantity).toLocaleString('es-CL')}
                </p>
            </div>
        </div>
    );
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans text-gray-900">
      
      {/* IZQUIERDA: FORMULARIO */}
      <div className="flex-1 lg:w-[58%] py-12 px-6 lg:px-16 border-r border-gray-200 order-2 lg:order-1">
        <div className="max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <Link href="/" className="font-serif italic text-3xl tracking-wide hover:opacity-80 transition-opacity">Joyas Fran</Link>
                <Link href="/carrito" className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                    <ArrowLeft className="w-3 h-3"/> Volver
                </Link>
            </div>

            {/* SELECCIÓN DE MÉTODO DE ENTREGA */}
            <div className="mb-8">
               <h2 className="text-lg font-medium mb-4">Método de entrega</h2>
               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setDeliveryMethod('shipping')}
                    className={`flex flex-col items-center justify-center gap-2 p-4 border rounded-sm transition-all ${deliveryMethod === 'shipping' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Truck className={`w-5 h-5 ${deliveryMethod === 'shipping' ? 'text-black' : 'text-gray-400'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wide ${deliveryMethod === 'shipping' ? 'text-black' : 'text-gray-500'}`}>Despacho</span>
                  </button>
                  <button 
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`flex flex-col items-center justify-center gap-2 p-4 border rounded-sm transition-all ${deliveryMethod === 'pickup' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Store className={`w-5 h-5 ${deliveryMethod === 'pickup' ? 'text-black' : 'text-gray-400'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wide ${deliveryMethod === 'pickup' ? 'text-black' : 'text-gray-500'}`}>Retiro en Tienda</span>
                  </button>
               </div>
            </div>

            <div className="mb-10 space-y-6">
                <h2 className="text-lg font-medium">Datos de contacto y facturación</h2>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <input name="firstName" placeholder="Nombre" value={formData.firstName} onChange={handleInputChange} className="p-3 border border-gray-300 rounded-sm w-full text-sm outline-none focus:border-black transition-colors" />
                        <input name="lastName" placeholder="Apellidos" value={formData.lastName} onChange={handleInputChange} className="p-3 border border-gray-300 rounded-sm w-full text-sm outline-none focus:border-black transition-colors" />
                    </div>
                    
                    {/* INPUT RUT CON VALIDACIÓN VISUAL */}
                    <div className="relative">
                        <input 
                            name="rut" 
                            placeholder="RUT (ej: 12.345.678-9)" 
                            value={formData.rut} 
                            onChange={handleInputChange} 
                            onBlur={handleRutBlur}
                            className={`p-3 border rounded-sm w-full text-sm outline-none transition-colors ${errors.rut ? 'border-red-500 focus:border-red-500 text-red-600' : 'border-gray-300 focus:border-black'}`} 
                        />
                        {errors.rut && <span className="text-[10px] text-red-500 absolute right-2 top-3.5 font-bold">{errors.rut}</span>}
                    </div>

                    {/* INPUT TELÉFONO CON AUTOCOMPLETADO */}
                    <div className="relative">
                        <input 
                            name="phone" 
                            placeholder="+56 9" 
                            value={formData.phone} 
                            onChange={handleInputChange} 
                            className={`p-3 border rounded-sm w-full text-sm outline-none transition-colors ${errors.phone ? 'border-red-500' : 'border-gray-300 focus:border-black'}`}
                        />
                         {errors.phone && <span className="text-[10px] text-red-500 absolute right-2 top-3.5 font-bold">{errors.phone}</span>}
                    </div>
                    
                    <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                           {deliveryMethod === 'shipping' ? 'Dirección de Entrega' : 'Dirección (Facturación)'}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <select 
                                  name="region" 
                                  value={formData.region} 
                                  onChange={handleInputChange} 
                                  className="p-3 border border-gray-300 rounded-sm w-full bg-white appearance-none text-sm outline-none focus:border-black transition-colors cursor-pointer"
                                >
                                    <option value="">Región</option>
                                    {REGIONES_Y_COMUNAS.map(r => <option key={r.region} value={r.region}>{r.region}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-4 w-3 h-3 text-gray-400 pointer-events-none"/>
                            </div>
                            <div className="relative">
                                <select 
                                    name="city" 
                                    value={formData.city} 
                                    onChange={handleInputChange} 
                                    disabled={!formData.region} 
                                    className="p-3 border border-gray-300 rounded-sm w-full bg-white appearance-none text-sm outline-none focus:border-black transition-colors cursor-pointer disabled:bg-gray-50"
                                >
                                    <option value="">Comuna</option>
                                    {comunasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-4 w-3 h-3 text-gray-400 pointer-events-none"/>
                            </div>
                        </div>

                        <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400"/>
                            <input 
                                name="address" 
                                placeholder="Calle y Número (Ej: Av. Principal 1234)" 
                                value={formData.address} 
                                onChange={handleInputChange} 
                                className="p-3 pl-10 border border-gray-300 rounded-sm w-full text-sm outline-none focus:border-black transition-colors" 
                            />
                        </div>

                        <input 
                            name="apartment" 
                            placeholder="Depto, Block, Piso, Torre (Opcional)" 
                            value={formData.apartment} 
                            onChange={handleInputChange} 
                            className="p-3 border border-gray-300 rounded-sm w-full text-sm outline-none focus:border-black transition-colors bg-gray-50/50 focus:bg-white" 
                        />
                    </div>
                </div>
            </div>

            <div className="mb-8">
                {deliveryMethod === 'shipping' ? (
                   <>
                     <h2 className="text-lg font-medium mb-4">Costo de envío</h2>
                     <div className={`border rounded-sm p-4 min-h-[70px] flex items-center transition-all ${shippingRate ? 'border-black bg-gray-50' : 'border-gray-200'}`}>
                         {calculating ? (
                             <span className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin"/> Cotizando envío...</span>
                         ) : shippingRate ? (
                             <div className="w-full flex justify-between items-center animate-fade-in">
                                 <div className="flex items-center gap-3">
                                     <div className="bg-white p-2 border border-gray-200 rounded-full">
                                         <Truck className="w-4 h-4 text-black"/>
                                     </div>
                                     <div>
                                         <p className="text-sm font-bold text-gray-900">{shippingRate.name}</p>
                                         <p className="text-[11px] text-gray-500">{shippingRate.days}</p>
                                     </div>
                                 </div>
                                 <span className="font-bold text-sm">
                                     {discount?.type === 'shipping' ? <span className="text-green-600 bg-green-50 px-2 py-1 rounded-sm">GRATIS</span> : shippingRate.price === 0 ? 'GRATIS' : `$${shippingRate.price.toLocaleString('es-CL')}`}
                                 </span>
                             </div>
                         ) : (
                             <div className="flex items-center gap-2 text-sm text-gray-400">
                                 <AlertCircle className="w-4 h-4" />
                                 <span>Completa la dirección para calcular el envío</span>
                             </div>
                         )}
                     </div>
                   </>
                ) : (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-sm flex items-start gap-3">
                     <Store className="w-5 h-5 text-blue-600 mt-0.5" />
                     <div>
                        <p className="text-sm font-bold text-blue-900">Retiro Gratis en Iquique</p>
                        <p className="text-xs text-blue-700 mt-1">Te notificaremos cuando tu pedido esté listo para retiro.</p>
                     </div>
                  </div>
                )}
            </div>

            {/* OPCIÓN GUARDAR DATOS */}
            <div className="mb-6 flex items-center gap-2">
               <input 
                 type="checkbox" 
                 id="save-info" 
                 checked={saveInfo} 
                 onChange={(e) => setSaveInfo(e.target.checked)}
                 className="w-4 h-4 border-gray-300 rounded text-black focus:ring-black"
               />
               <label htmlFor="save-info" className="text-xs text-gray-600 cursor-pointer select-none">
                 Guardar mi información y dirección para la próxima compra
               </label>
            </div>

            <button 
                onClick={handleFinalizeOrder} 
                disabled={processing || !isFormValid} 
                className={`w-full py-4 rounded-sm font-bold uppercase tracking-[0.2em] text-[11px] transition-all flex justify-center items-center gap-2 shadow-sm 
                ${processing || !isFormValid 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                    : 'bg-black text-white hover:bg-zinc-800 hover:shadow-md'}`}
            >
                {processing ? <Loader2 className="w-4 h-4 animate-spin"/> : 'IR A PAGAR'}
            </button>
            
            <div className="mt-16 pt-8 border-t border-gray-100 space-y-1">
                {Object.keys(POLICY_CONTENT).map(key => (
                    <div key={key} className="border-b border-gray-50 last:border-0">
                        <button onClick={() => setOpenPolicy(openPolicy === key ? null : key)} className="w-full flex justify-between items-center text-[10px] text-gray-400 hover:text-black py-3 uppercase tracking-wider transition-colors">
                            {key}
                            {openPolicy === key ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                        </button>
                        {openPolicy === key && <div className="pb-4 animate-fade-in text-gray-500 leading-relaxed">{POLICY_CONTENT[key]}</div>}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* DERECHA: RESUMEN */}
      <div className="lg:w-[42%] bg-[#fafafa] lg:h-screen lg:sticky lg:top-0 p-8 lg:p-12 border-l border-gray-200 hidden lg:flex flex-col order-1 lg:order-2">
         <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-6">
            {cart.map((item, idx) => (
                <CartItemRow key={`${item.id}-${item.selectedSize}-${idx}`} item={item} />
            ))}
         </div>

         <div className="mt-8 pt-8 border-t border-gray-200/60 pb-32">
             <div className="flex gap-2 mb-8">
                <div className="relative flex-1">
                    <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} disabled={!!discount} placeholder="CÓDIGO DE DESCUENTO" className="w-full p-3 border border-gray-200 rounded-sm text-sm outline-none bg-white uppercase disabled:bg-gray-100 focus:border-black transition-colors" />
                    {discount && <X onClick={() => {setDiscount(null); setCouponCode('');}} className="absolute right-3 top-3 w-4 h-4 text-gray-400 cursor-pointer hover:text-red-500 transition-colors"/>}
                    <Tag className="absolute right-3 top-3.5 w-4 h-4 text-gray-300 pointer-events-none" />
                </div>
                {!discount && (
                    <button onClick={applyCoupon} disabled={validatingCoupon || !couponCode} className="bg-zinc-200 text-zinc-600 px-6 rounded-sm text-xs font-bold hover:bg-zinc-300 disabled:opacity-50 transition-colors">
                        {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin"/> : 'USAR'}
                    </button>
                )}
             </div>

             <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-gray-900 font-medium">${subtotal.toLocaleString('es-CL')}</span>
                </div>
                {discount && (
                    <div className="flex justify-between text-green-600 items-center bg-green-50 p-2 rounded-sm -mx-2">
                        <span className="flex items-center gap-1.5"><Tag className="w-3 h-3"/> Cupón {discount.code}</span>
                        <span>-${discount.amount.toLocaleString('es-CL')}</span>
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <span>Envío</span>
                    <span className="text-gray-900 font-medium">
                        {discount?.type === 'shipping' 
                            ? <span className="text-green-600">Gratis</span> 
                            : deliveryMethod === 'pickup'
                              ? 'Gratis (Retiro)'
                              : shippingRate 
                                ? shippingRate.price === 0 
                                    ? 'Gratis' 
                                    : `$${shippingRate.price.toLocaleString('es-CL')}` 
                                : <span className="text-xs text-gray-400">Por calcular</span>}
                    </span>
                </div>
             </div>
             <div className="border-t border-gray-200 my-6"></div>
             <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <div className="text-right">
                    <span className="text-[10px] text-gray-400 block leading-none mb-1 uppercase tracking-widest">CLP</span>
                    <span className="text-3xl font-serif italic text-black">${total.toLocaleString('es-CL')}</span>
                </div>
             </div>
         </div>
      </div>
      
      {/* RESUMEN MÓVIL */}
      <div className="lg:hidden bg-gray-50 border-b border-gray-200 p-4 order-1 sticky top-0 z-30 shadow-sm">
         <button onClick={() => setShowSummaryMobile(!showSummaryMobile)} className="w-full flex justify-between items-center text-zinc-600 text-sm font-medium">
             <span className="flex items-center gap-2 text-black">
                 <ShoppingBag className="w-4 h-4"/> 
                 {showSummaryMobile ? 'Ocultar resumen' : 'Mostrar resumen'}
                 {showSummaryMobile ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
             </span>
             <span className="text-black font-bold text-lg font-serif italic">${total.toLocaleString('es-CL')}</span>
         </button>
         
         {showSummaryMobile && (
             <div className="mt-4 space-y-4 animate-fade-in border-t border-gray-200 pt-4">
                 {cart.map((item, idx) => (
                     <CartItemRow key={`${item.id}-${idx}-mobile`} item={item} />
                 ))}
             </div>
         )}
      </div>
    </div>
  );
}