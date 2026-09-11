import { BBox, SegmentedElement } from './types';

export interface CCLOptions {
  mask: Uint8Array;
  width: number;
  height: number;
  minArea?: number;
}

function find(parent: Int32Array, i: number): number {
  let root = i;
  while (parent[root] >= 0 && parent[root] !== root) {
    root = parent[root];
  }
  // 路径压缩
  let p = i;
  while (p !== root && parent[p] >= 0) {
    const next = parent[p];
    parent[p] = root;
    p = next;
  }
  return root;
}

function union(parent: Int32Array, i: number, j: number) {
  const ri = find(parent, i);
  const rj = find(parent, j);
  if (ri !== rj) {
    parent[rj] = ri;
  }
}

export interface CCLResult {
  elements: SegmentedElement[];
  labelMap: Int32Array;
}

export function connectedComponents({ mask, width, height, minArea = 50 }: CCLOptions): CCLResult {
  const len = width * height;
  const parent = new Int32Array(len).fill(-1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      parent[i] = i;
      // 已扫描的 4 邻域
      if (x > 0 && mask[i - 1]) union(parent, i, i - 1);
      if (y > 0 && mask[i - width]) union(parent, i, i - width);
      if (x > 0 && y > 0 && mask[i - width - 1]) union(parent, i, i - width - 1);
      if (x < width - 1 && y > 0 && mask[i - width + 1]) union(parent, i, i - width + 1);
    }
  }

  const labelMap = new Int32Array(len).fill(-1);
  const roots: number[] = [];
  for (let i = 0; i < len; i++) {
    if (parent[i] < 0) continue;
    const root = find(parent, i);
    if (labelMap[root] === -1) {
      labelMap[root] = roots.length;
      roots.push(root);
    }
    labelMap[i] = labelMap[root];
  }

  // 计算 bbox 与像素数
  const bboxes = new Map<number, { x1: number; y1: number; x2: number; y2: number; count: number }>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const label = labelMap[i];
      if (label < 0) continue;
      let box = bboxes.get(label);
      if (!box) {
        box = { x1: x, y1: y, x2: x, y2: y, count: 0 };
        bboxes.set(label, box);
      }
      box.x1 = Math.min(box.x1, x);
      box.y1 = Math.min(box.y1, y);
      box.x2 = Math.max(box.x2, x);
      box.y2 = Math.max(box.y2, y);
      box.count++;
    }
  }

  const elements: SegmentedElement[] = [];
  let idCounter = 0;
  for (const [label, box] of bboxes.entries()) {
    const w = box.x2 - box.x1 + 1;
    const h = box.y2 - box.y1 + 1;
    if (box.count < minArea) continue;

    const localMask = new Uint8Array(w * h);
    for (let y = box.y1; y <= box.y2; y++) {
      for (let x = box.x1; x <= box.x2; x++) {
        const i = y * width + x;
        if (labelMap[i] === label) {
          localMask[(y - box.y1) * w + (x - box.x1)] = 255;
        }
      }
    }

    const bbox: BBox = { x: box.x1, y: box.y1, w, h };
    elements.push({
      id: `el-${idCounter++}`,
      bbox,
      mask: localMask,
      parent: null,
      children: [],
      visible: true,
      name: `元素 ${idCounter}`,
    });
  }

  return { elements, labelMap };
}
