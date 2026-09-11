export interface RGB {
  r: number;
  g: number;
  b: number;
}

function rgbKey(r: number, g: number, b: number, binSize: number): string {
  return `${Math.floor(r / binSize)},${Math.floor(g / binSize)},${Math.floor(b / binSize)}`;
}

export function estimateBackgroundColor(data: Uint8ClampedArray, width: number, height: number, border = 10): RGB {
  const binSize = 8;
  const counts = new Map<string, { r: number; g: number; b: number; count: number }>();

  const add = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = rgbKey(r, g, b, binSize);
    const existing = counts.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      counts.set(key, { r, g, b, count: 1 });
    }
  };

  // 采样四边框
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < Math.min(border, width); x++) add(x, y);
    for (let x = Math.max(width - border, 0); x < width; x++) add(x, y);
  }
  for (let x = border; x < width - border; x++) {
    for (let y = 0; y < Math.min(border, height); y++) add(x, y);
    for (let y = Math.max(height - border, 0); y < height; y++) add(x, y);
  }

  let bestCount = -1;
  let bestR = 0;
  let bestG = 0;
  let bestB = 0;

  for (const value of counts.values()) {
    if (value.count > bestCount) {
      bestCount = value.count;
      bestR = Math.round(value.r / value.count);
      bestG = Math.round(value.g / value.count);
      bestB = Math.round(value.b / value.count);
    }
  }

  return { r: bestR, g: bestG, b: bestB };
}
