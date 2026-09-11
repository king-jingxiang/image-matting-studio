import { SegmentedElement, BBox } from './types';

function overlap(a: BBox, b: BBox, axis: 'x' | 'y'): number {
  const pos = axis === 'x' ? 'x' : 'y';
  const len = axis === 'x' ? 'w' : 'h';
  const a1 = a[pos];
  const a2 = a[pos] + a[len];
  const b1 = b[pos];
  const b2 = b[pos] + b[len];
  const inter = Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
  const minLen = Math.min(a[len], b[len]);
  return minLen === 0 ? 0 : inter / minLen;
}

function horizontalGap(a: BBox, b: BBox): number {
  if (a.x > b.x) return a.x - (b.x + b.w);
  return b.x - (a.x + a.w);
}

function mergeTwoBboxes(a: BBox, b: BBox): BBox {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function unionMasks(a: SegmentedElement, b: SegmentedElement): Uint8Array {
  const box = mergeTwoBboxes(a.bbox, b.bbox);
  const mask = new Uint8Array(box.w * box.h);
  const draw = (el: SegmentedElement) => {
    if (!el.mask) return;
    const ox = el.bbox.x - box.x;
    const oy = el.bbox.y - box.y;
    for (let y = 0; y < el.bbox.h; y++) {
      for (let x = 0; x < el.bbox.w; x++) {
        const src = y * el.bbox.w + x;
        const dst = (oy + y) * box.w + (ox + x);
        if (el.mask[src]) mask[dst] = 255;
      }
    }
  };
  draw(a);
  draw(b);
  return mask;
}

export function mergeRows(elements: SegmentedElement[], gapRatio: number, overlapRatio: number): SegmentedElement[] {
  if (elements.length === 0) return [];
  const sorted = [...elements].sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);
  const groups: SegmentedElement[][] = [];
  let current: SegmentedElement[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = current[current.length - 1];
    const el = sorted[i];
    const minHeight = Math.min(last.bbox.h, el.bbox.h);
    const vOverlap = overlap(last.bbox, el.bbox, 'y');
    const gap = horizontalGap(last.bbox, el.bbox);
    if (vOverlap >= overlapRatio && gap < minHeight * gapRatio) {
      current.push(el);
    } else {
      groups.push(current);
      current = [el];
    }
  }
  groups.push(current);

  return groups.map((group, idx) => {
    if (group.length === 1) return group[0];
    const box = group.reduce((acc, el) => mergeTwoBboxes(acc, el.bbox), group[0].bbox);
    const mask = new Uint8Array(box.w * box.h);
    for (const el of group) {
      if (!el.mask) continue;
      const ox = el.bbox.x - box.x;
      const oy = el.bbox.y - box.y;
      for (let y = 0; y < el.bbox.h; y++) {
        for (let x = 0; x < el.bbox.w; x++) {
          if (el.mask[y * el.bbox.w + x]) {
            mask[(oy + y) * box.w + (ox + x)] = 255;
          }
        }
      }
    }
    return {
      id: `row-${idx}`,
      bbox: box,
      mask,
      parent: null,
      children: [],
      visible: true,
      name: `行 ${idx + 1}`,
    };
  });
}

export function buildHierarchy(elements: SegmentedElement[], containThreshold = 0.9): SegmentedElement[] {
  const sorted = [...elements].sort((a, b) => b.bbox.w * b.bbox.h - a.bbox.w * a.bbox.h);
  for (const el of sorted) {
    el.parent = null;
    el.children = [];
  }
  for (let i = 0; i < sorted.length; i++) {
    const parent = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const child = sorted[j];
      if (child.parent) continue;
      const containment = computeContainment(parent.bbox, child.bbox);
      if (containment >= containThreshold) {
        child.parent = parent.id;
        parent.children.push(child.id);
      }
    }
  }
  return sorted;
}

function computeContainment(outer: BBox, inner: BBox): number {
  const x1 = Math.max(outer.x, inner.x);
  const y1 = Math.max(outer.y, inner.y);
  const x2 = Math.min(outer.x + outer.w, inner.x + inner.w);
  const y2 = Math.min(outer.y + outer.h, inner.y + inner.h);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const innerArea = inner.w * inner.h;
  return innerArea === 0 ? 0 : inter / innerArea;
}

export function mergeElements(a: SegmentedElement, b: SegmentedElement, newId: string): SegmentedElement {
  const box = mergeTwoBboxes(a.bbox, b.bbox);
  const mask = unionMasks(a, b);
  return {
    id: newId,
    bbox: box,
    mask,
    parent: null,
    children: [],
    visible: true,
    name: `合并 ${newId}`,
  };
}

export function mergeMultiple(elements: SegmentedElement[], newId: string): SegmentedElement {
  if (elements.length === 0) throw new Error('mergeMultiple requires at least one element');
  if (elements.length === 1) {
    const el = elements[0];
    return {
      ...el,
      id: newId,
      name: `合并 ${newId}`,
    };
  }
  const box = elements.reduce((acc, el) => mergeTwoBboxes(acc, el.bbox), elements[0].bbox);
  const mask = new Uint8Array(box.w * box.h);
  for (const el of elements) {
    if (!el.mask) continue;
    const ox = el.bbox.x - box.x;
    const oy = el.bbox.y - box.y;
    for (let y = 0; y < el.bbox.h; y++) {
      for (let x = 0; x < el.bbox.w; x++) {
        if (el.mask[y * el.bbox.w + x]) {
          mask[(oy + y) * box.w + (ox + x)] = 255;
        }
      }
    }
  }
  return {
    id: newId,
    bbox: box,
    mask,
    parent: null,
    children: [],
    visible: true,
    name: `合并 ${newId}`,
  };
}
