// Deterministic composition: never generates or repaints the photographed jewelry.
import sharp from 'sharp';
import { join } from 'node:path';
import { SAMPLE_CATALOG } from '../lib/sample-catalog';
import { photoPlacement } from '../lib/product-photo';

const directory = 'public/sample-catalog';
const cutouts = process.argv[2] || 'tmp/sample-cutouts';
for (const item of SAMPLE_CATALOG) {
  const source = join(cutouts, `${item.slug}-cutout.png`);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = new Uint8Array(info.width * info.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  const frame = photoPlacement(alpha, info.width, info.height);
  const width = Math.round(frame.width), height = Math.round(frame.height);
  const x = Math.round(frame.x), y = Math.round(frame.y);
  const resized = await sharp(source).resize(width, height).png().toBuffer();
  const layer = await sharp(resized).extract({ left: Math.max(0, -x), top: Math.max(0, -y), width: Math.min(width + Math.min(0, x), 1200 - Math.max(0, x)), height: Math.min(height + Math.min(0, y), 1200 - Math.max(0, y)) }).png().toBuffer();
  await sharp('public/img/backdrop-noir.webp').resize(1200, 1200, { fit: 'cover' }).composite([{ input: layer, left: Math.max(0, x), top: Math.max(0, y) }]).webp({ quality: 90 }).toFile(join(directory, `${item.slug}.webp`));
}
const heroLayers = [];
for (const [slug, left, top, size] of [['dije-corazones', 325, 600, 370], ['dije-cisnes', 1125, 565, 390]] as const) {
  const input = await sharp(join(cutouts, `${slug}-cutout.png`)).trim({ threshold: 5 }).resize(size, size, { fit: 'inside' }).png().toBuffer();
  heroLayers.push({ input, left, top });
}
await sharp('public/img/backdrop-noir.webp').resize(1920, 1080, { fit: 'cover' }).composite(heroLayers).webp({ quality: 92 }).toFile(join(directory, 'portada.webp'));
console.log('Prepared ten real designs and cover using the fixed background.');
