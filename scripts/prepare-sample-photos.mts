// Run per photo to release model memory: node --import tsx scripts/prepare-sample-photos.mts INPUT_DIRECTORY SLUG
import sharp from 'sharp';
import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { SAMPLE_CATALOG } from '../lib/sample-catalog';
import { PHOTO_MODEL, PHOTO_MODEL_REVISION, photoPlacement } from '../lib/product-photo';

const item = SAMPLE_CATALOG.find(item => item.slug === process.argv[3]);
if (!item || !process.argv[2]) throw new Error('Indica carpeta de originales y slug.');
const output = join(process.cwd(), 'public', 'sample-catalog');
const cutouts = join(process.cwd(), 'tmp', 'sample-cutouts');
await mkdir(output, { recursive: true });
await mkdir(cutouts, { recursive: true });
const original = sharp(join(process.argv[2], item.source));
const metadata = await original.metadata();
const cropped = await original.extract({ left: 0, top: item.top, width: metadata.width!, height: item.bottom - item.top }).png().toBuffer();
await sharp(cropped).webp({ quality: 95 }).toFile(join(output, `${item.slug}-original.webp`));
const model = await AutoModel.from_pretrained(PHOTO_MODEL, { revision: PHOTO_MODEL_REVISION, dtype: 'fp32', device: 'cpu', session_options: { intraOpNumThreads: 1, interOpNumThreads: 1, enableCpuMemArena: false, enableMemPattern: false } });
const processor = await AutoProcessor.from_pretrained(PHOTO_MODEL, { revision: PHOTO_MODEL_REVISION });
const image = await RawImage.fromBlob(new Blob([new Uint8Array(cropped)], { type: 'image/png' }));
const { pixel_values } = await processor(image);
const { output_image } = await model({ input_image: pixel_values });
const mask = await RawImage.fromTensor(output_image[0].sigmoid().mul(255).to('uint8')).resize(image.width, image.height);
const rgba = image.rgba();
for (let i = 0; i < mask.data.length; i++) rgba.data[i * 4 + 3] = mask.data[i];
const frame = photoPlacement(mask.data, image.width, image.height);
const cutout = await sharp(rgba.data, { raw: { width: image.width, height: image.height, channels: 4 } }).png().toBuffer();
await sharp(cutout).toFile(join(cutouts, `${item.slug}-cutout.png`));
// Use integer placement and clip the invisible canvas margin before compositing.
const scale = frame.width / image.width;
const scaled = await sharp(cutout).resize(Math.round(frame.width), Math.round(frame.height)).png().toBuffer();
const x = Math.round(frame.x), y = Math.round(frame.y);
const sw = Math.round(frame.width), sh = Math.round(frame.height);
const layer = await sharp(scaled).extract({ left: Math.max(0, -x), top: Math.max(0, -y), width: Math.min(sw + Math.min(0, x), 1200 - Math.max(0, x)), height: Math.min(sh + Math.min(0, y), 1200 - Math.max(0, y)) }).png().toBuffer();
await sharp('public/img/backdrop-noir.webp').resize(1200, 1200, { fit: 'cover' }).composite([{ input: layer, left: Math.max(0, x), top: Math.max(0, y) }]).webp({ quality: 94 }).toFile(join(output, `${item.slug}.webp`));
pixel_values.dispose(); output_image.dispose(); await model.dispose();
console.log(JSON.stringify({ prepared: item.slug, scale }));
