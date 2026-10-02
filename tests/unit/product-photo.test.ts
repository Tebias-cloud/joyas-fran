import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPhotoMask, cropPixels, FULL_PHOTO, validatePhoto, photoPlacement } from '../../lib/product-photo';

test('mask changes only alpha, keeping jewelry RGB intact', () => {
  const original = new Uint8ClampedArray([120, 130, 140, 255, 1, 2, 3, 128]);
  assert.deepEqual([...applyPhotoMask(original, new Uint8Array([255, 0]))], [120, 130, 140, 255, 1, 2, 3, 0]);
  assert.deepEqual([...original], [120, 130, 140, 255, 1, 2, 3, 128]);
  assert.equal(applyPhotoMask(original, new Uint8Array([128, 128]))[7], 64);
  assert.throws(() => applyPhotoMask(original, new Uint8Array([255])));
});

test('centering keeps faint chain ends and proportions inside a square', () => {
  const mask = new Uint8Array(100 * 200);
  mask[10 * 100 + 40] = 3;
  mask[189 * 100 + 59] = 255;
  const frame = photoPlacement(mask, 100, 200);
  const scale = frame.width / 100;
  assert.equal(frame.height / 200, scale);
  assert.ok(Math.abs(frame.y + 10 * scale - 132) < 0.001);
  assert.ok(Math.abs(frame.y + 190 * scale - 1068) < 0.001);
  assert.ok(Math.abs(frame.x + 50 * scale - 600) < 0.001);
  assert.throws(() => photoPlacement(new Uint8Array(10), 10, 10));
  assert.throws(() => photoPlacement(new Uint8Array(100), 10, 10));
});

test('crop percentages preserve full image and stay within bounds', () => {
  assert.deepEqual(cropPixels(FULL_PHOTO, 710, 1536), { x: 0, y: 0, width: 710, height: 1536 });
  assert.deepEqual(cropPixels({ x: 0, y: 20, width: 100, height: 60 }, 710, 1536), { x: 0, y: 307, width: 710, height: 922 });
  assert.deepEqual(cropPixels({ x: 90, y: 90, width: 100, height: 100 }, 100, 100), { x: 90, y: 90, width: 10, height: 10 });
  assert.throws(() => cropPixels({ ...FULL_PHOTO, y: NaN }, 100, 100));
  assert.deepEqual(cropPixels({ x: 99, y: 99, width: 1, height: 1 }, 1, 1), { x: 0, y: 0, width: 1, height: 1 });
});

test('photo input rejects unsupported formats and oversized files', () => {
  validatePhoto(new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));
  assert.throws(() => validatePhoto(new File(['svg'], 'photo.svg', { type: 'image/svg+xml' })));
  assert.throws(() => validatePhoto(new File([new Uint8Array(16 * 1024 * 1024)], 'photo.png', { type: 'image/png' })));
});
