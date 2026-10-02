import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers';
import { PHOTO_MODEL, PHOTO_MODEL_REVISION } from '@/lib/product-photo';

// This module runs only in the worker, not on Vercel or on the storefront.
env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

let loading: Promise<[Awaited<ReturnType<typeof AutoModel.from_pretrained>>, Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>]> | undefined;

self.onmessage = async ({ data }: MessageEvent<{ blob: Blob }>) => {
  try {
    self.postMessage({ type: 'progress', message: 'Cargando recortador. La primera vez descarga el modelo; usa Wi-Fi.' });
    loading ??= Promise.all([
      AutoModel.from_pretrained(PHOTO_MODEL, { revision: PHOTO_MODEL_REVISION, dtype: 'fp32', device: 'wasm' }),
      AutoProcessor.from_pretrained(PHOTO_MODEL, { revision: PHOTO_MODEL_REVISION }),
    ]);
    const [model, processor] = await loading;
    self.postMessage({ type: 'progress', message: 'Separando la joya del fondo… Puedes cancelar si tarda demasiado.' });
    const image = await RawImage.fromBlob(data.blob);
    const { pixel_values } = await processor(image);
    const { output_image } = await model({ input_image: pixel_values });
    const mask = await RawImage.fromTensor(output_image[0].sigmoid().mul(255).to('uint8'))
      .resize(image.width, image.height);
    const alpha = new Uint8ClampedArray(mask.data);
    self.postMessage({ type: 'done', alpha }, { transfer: [alpha.buffer] });
    pixel_values.dispose();
    output_image.dispose();
  } catch {
    loading = undefined;
    self.postMessage({ type: 'error', message: 'No se pudo recortar en este dispositivo. Prueba desde un computador con Wi-Fi o conserva la original.' });
  }
};
