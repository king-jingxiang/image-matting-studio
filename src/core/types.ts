export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SegmentedElement {
  id: string;
  bbox: BBox;
  // 用于生成 sprite 的像素掩码（相对于 bbox）
  mask?: Uint8Array;
  // 相对于原图的像素坐标列表（可选，小图用）
  pixels?: number[];
  parent: string | null;
  children: string[];
  // 内部存储用的 sprite canvas，避免反复绘制
  sprite?: HTMLCanvasElement;
  // 编辑层状态
  visible: boolean;
  name: string;
}

export interface ProcessParams {
  t0: number;
  t1: number;
  dilateRadius: number;
  minArea: number;
  rowMergeGapRatio: number;
  rowMergeOverlapRatio: number;
}

export const DEFAULT_PARAMS: ProcessParams = {
  t0: 10,
  t1: 60,
  dilateRadius: 1,
  minArea: 50,
  rowMergeGapRatio: 0.6,
  rowMergeOverlapRatio: 0.5,
};
