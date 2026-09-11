import { BBox } from '@/core/types';

export async function blobToPngURL(blob: Blob): Promise<string> {
  return URL.createObjectURL(blob);
}

export function trimBbox(mask: Uint8Array, w: number, h: number): { x: number; y: number; w: number; h: number } {
  let x1 = w, y1 = h, x2 = -1, y2 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        x1 = Math.min(x1, x);
        y1 = Math.min(y1, y);
        x2 = Math.max(x2, x);
        y2 = Math.max(y2, y);
      }
    }
  }
  if (x2 === -1) return { x: 0, y: 0, w, h };
  return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
}

export function cropCanvas(source: HTMLCanvasElement | HTMLImageElement, bbox: BBox): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = bbox.w;
  canvas.height = bbox.h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, type);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
