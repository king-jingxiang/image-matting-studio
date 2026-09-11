import { ProcessParams, SegmentedElement } from './types';
import { createSpriteCanvas, createFullAlphaCanvas } from './sprite';
import { runProcessWorker } from '../worker/processWorker';

export interface ProcessResult {
  elements: SegmentedElement[];
  softMask: Uint8Array;
  alphaCanvas: HTMLCanvasElement;
}

export async function processImage(
  image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  width: number,
  height: number,
  params: ProcessParams
): Promise<ProcessResult> {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d')!;
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const { elements, softMask } = await runProcessWorker(imageData, params);

  const alphaCanvas = createFullAlphaCanvas(image, softMask, width, height);
  for (const el of elements) {
    el.sprite = createSpriteCanvas(alphaCanvas, el);
  }

  return { elements, softMask, alphaCanvas };
}
