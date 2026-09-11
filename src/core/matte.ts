import { RGB } from './bgEstimate';

function colorDistance(r: number, g: number, b: number, bg: RGB): number {
  const dr = r - bg.r;
  const dg = g - bg.g;
  const db = b - bg.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function createAlphaMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: RGB,
  t0: number,
  t1: number
): Uint8Array {
  const len = width * height;
  const mask = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const pi = i * 4;
    const dist = colorDistance(data[pi], data[pi + 1], data[pi + 2], bg);
    let alpha = 0;
    if (dist <= t0) {
      alpha = 0;
    } else if (dist >= t1) {
      alpha = 255;
    } else {
      alpha = Math.round(((dist - t0) / (t1 - t0)) * 255);
    }
    mask[i] = alpha;
  }
  return mask;
}

export function dilateMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask;
  let current = new Uint8Array(mask);
  for (let r = 0; r < radius; r++) {
    const next = new Uint8Array(current);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        if (current[i]) continue;
        // 8-邻域存在前景则膨胀
        if (
          current[i - 1] || current[i + 1] ||
          current[i - width] || current[i + width] ||
          current[i - width - 1] || current[i - width + 1] ||
          current[i + width - 1] || current[i + width + 1]
        ) {
          next[i] = 255;
        }
      }
    }
    current = next;
  }
  return current;
}

export function applyMaskToImageData(
  src: ImageData,
  mask: Uint8Array
): ImageData {
  const out = new ImageData(src.width, src.height);
  const data = src.data;
  for (let i = 0; i < mask.length; i++) {
    const pi = i * 4;
    out.data[pi] = data[pi];
    out.data[pi + 1] = data[pi + 1];
    out.data[pi + 2] = data[pi + 2];
    out.data[pi + 3] = Math.round((data[pi + 3] * mask[i]) / 255);
  }
  return out;
}
