import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';

// Inicializamos el cliente del SDK de Mercado Pago
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

/**
 * Crea una preferencia de pago en Mercado Pago para una orden dada.
 */
export async function createPaymentPreference(params: {
  orderId: string;
  amount: number;
  baseUrl: string;
}): Promise<{ id: string; initPoint: string }> {
  const preference = new Preference(mpClient);
  const urlSegura = `${params.baseUrl}/payment/result`;

  const response = await preference.create({
    body: {
      items: [
        {
          id: params.orderId,
          title: 'Compra en Joyas Fran',
          quantity: 1,
          unit_price: params.amount,
          currency_id: 'CLP',
        }
      ],
      external_reference: params.orderId,
      back_urls: {
        success: urlSegura,
        failure: urlSegura,
        pending: urlSegura
      },
      auto_return: 'approved',
    }
  });

  if (!response.id || !response.init_point) {
    throw new Error('No se pudo iniciar la transacción con Mercado Pago');
  }

  return {
    id: response.id,
    initPoint: response.init_point
  };
}

/**
 * Consulta la información y el estado de un pago en Mercado Pago por su ID.
 */
export async function getPaymentDetails(paymentId: string) {
  const payment = new Payment(mpClient);
  const paymentData = await payment.get({ id: paymentId });
  return paymentData;
}

/**
 * Realiza un reembolso automático de un pago en Mercado Pago por su ID.
 */
export async function refundPayment(paymentId: string) {
  const refund = new PaymentRefund(mpClient);
  const refundData = await refund.create({ payment_id: paymentId });
  return refundData;
}
