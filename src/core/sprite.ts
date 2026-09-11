import { SegmentedElement } from './types';

export function createSpriteCanvas(
  alphaCanvas: HTMLCanvasElement,
  element: SegmentedElement
): HTMLCanvasElement {
  const { bbox, mask } = element;
  const canvas = document.createElement('canvas');
  canvas.width = bbox.w;
  canvas.height = bbox.h;
  const ctx = canvas.getContext('2d')!;

  // 从全图 alpha 画布裁剪
  ctx.drawImage(alphaCanvas, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);
  if (!mask) return canvas;

  const imageData = ctx.getImageData(0, 0, bbox.w, bbox.h);
  const data = imageData.data;

  for (let y = 0; y < bbox.h; y++) {
    for (let x = 0; x < bbox.w; x++) {
      const localIdx = y * bbox.w + x;
      const pi = localIdx * 4;
      if (!mask[localIdx]) {
        data[pi + 3] = 0;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function createFullAlphaCanvas(
  sourceImage: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  softMask: Uint8Array,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sourceImage, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < softMask.length; i++) {
    const pi = i * 4;
    data[pi + 3] = Math.round((data[pi + 3] * softMask[i]) / 255);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
