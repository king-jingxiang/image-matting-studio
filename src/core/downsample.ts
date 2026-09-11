export function downsampleImage(
  image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  maxDimension: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const srcWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const srcHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;

  const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));
  const width = Math.max(1, Math.floor(srcWidth * scale));
  const height = Math.max(1, Math.floor(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}
