import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { buildWebhookManifest, verifyWebhookSignature } from '../../lib/mercadopago-webhook';
import { buildPaymentPreferenceBody } from '../../services/paymentService';

test('verifica una firma válida de Mercado Pago', () => {
  const dataId = '123456789';
  const requestId = 'request-123';
  const timestamp = '1742505638683';
  const secret = 'webhook-secret';
  const hash = createHmac('sha256', secret)
    .update(buildWebhookManifest(dataId, requestId, timestamp))
    .digest('hex');

  assert.equal(verifyWebhookSignature({
    dataId,
    requestId,
    secret,
    signature: `ts=${timestamp},v1=${hash}`,
  }), true);
});

test('rechaza firmas inválidas o incompletas', () => {
  assert.equal(verifyWebhookSignature({
    dataId: '123',
    requestId: 'request-123',
    secret: 'secret',
    signature: 'ts=123,v1=invalid',
  }), false);
});

test('configura retorno y notificación en la preferencia', () => {
  const body = buildPaymentPreferenceBody({
    orderId: 'order-1',
    amount: 25_000,
    baseUrl: 'https://joyasfran.cl',
  });

  assert.equal(body.external_reference, 'order-1');
  assert.equal(body.notification_url, 'https://joyasfran.cl/api/payment/webhook');
  assert.equal(body.back_urls.success, 'https://joyasfran.cl/payment/result');
  assert.equal(body.items[0].unit_price, 25_000);
});
