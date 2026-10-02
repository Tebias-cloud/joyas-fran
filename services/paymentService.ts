import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';
import { serverEnv } from '@/lib/server-env';

function getMercadoPagoClient() {
  return new MercadoPagoConfig({ accessToken: serverEnv.mercadoPagoAccessToken });
}

/**
 * Crea una preferencia de pago en Mercado Pago para una orden dada.
 */
export async function createPaymentPreference(params: {
  orderId: string;
  amount: number;
  baseUrl: string;
}): Promise<{ id: string; initPoint: string }> {
  const preference = new Preference(getMercadoPagoClient());

  const response = await preference.create({
    body: buildPaymentPreferenceBody(params),
  });

  if (!response.id || !response.init_point) {
    throw new Error('No se pudo iniciar la transacción con Mercado Pago');
  }

  return {
    id: response.id,
    initPoint: response.init_point
  };
}

export function buildPaymentPreferenceBody(params: {
  orderId: string;
  amount: number;
  baseUrl: string;
}) {
  const paymentResultUrl = `${params.baseUrl}/payment/result`;
  return {
    items: [{
      id: params.orderId,
      title: 'Compra en Joyas Fran',
      quantity: 1,
      unit_price: params.amount,
      currency_id: 'CLP',
    }],
    external_reference: params.orderId,
    back_urls: {
      success: paymentResultUrl,
      failure: paymentResultUrl,
      pending: paymentResultUrl,
    },
    auto_return: 'approved' as const,
    notification_url: `${params.baseUrl}/api/payment/webhook`,
  };
}

/**
 * Consulta la información y el estado de un pago en Mercado Pago por su ID.
 */
export async function getPaymentDetails(paymentId: string) {
  const payment = new Payment(getMercadoPagoClient());
  const paymentData = await payment.get({ id: paymentId });
  return paymentData;
}

/**
 * Realiza un reembolso automático de un pago en Mercado Pago por su ID.
 */
export async function refundPayment(paymentId: string) {
  const refund = new PaymentRefund(getMercadoPagoClient());
  const refundData = await refund.create({ payment_id: paymentId });
  return refundData;
}
