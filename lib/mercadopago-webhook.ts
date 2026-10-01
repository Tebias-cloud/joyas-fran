import { createHmac, timingSafeEqual } from 'node:crypto';

interface WebhookSignatureInput {
  dataId: string;
  requestId: string;
  signature: string;
  secret: string;
}

export function buildWebhookManifest(dataId: string, requestId: string, timestamp: string): string {
  return `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
}

export function verifyWebhookSignature({
  dataId,
  requestId,
  signature,
  secret,
}: WebhookSignatureInput): boolean {
  const values = new Map(
    signature.split(',').map(part => {
      const [key, ...rest] = part.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  const timestamp = values.get('ts');
  const receivedHash = values.get('v1');

  if (!timestamp || !receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
    return false;
  }

  const expectedHash = createHmac('sha256', secret)
    .update(buildWebhookManifest(dataId, requestId, timestamp))
    .digest('hex');

  const expected = Buffer.from(expectedHash, 'hex');
  const received = Buffer.from(receivedHash, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
