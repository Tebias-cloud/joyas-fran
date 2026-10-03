import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export const runtime = 'nodejs';

const REGIONS = [
  { left: 0, top: 0, width: 320, height: 693 },
  { left: 320, top: 0, width: 320, height: 693 },
  { left: 0, top: 693, width: 320, height: 693 },
  { left: 320, top: 693, width: 320, height: 693 },
] as const;

export async function GET(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id < 0 || id >= REGIONS.length) {
    return NextResponse.json({ error: 'Foto inválida' }, { status: 400 });
  }

  const sheet = await readFile(join(process.cwd(), 'public', 'prueba-fotos', 'madre-contact.webp'));
  const image = await sharp(sheet)
    .extract(REGIONS[id])
    .webp({ quality: 92 })
    .toBuffer();

  return new NextResponse(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
