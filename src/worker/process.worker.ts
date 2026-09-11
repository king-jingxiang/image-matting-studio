import { ProcessParams, SegmentedElement } from '../core/types';
import { estimateBackgroundColor } from '../core/bgEstimate';
import { createAlphaMask, dilateMask } from '../core/matte';
import { connectedComponents } from '../core/ccl';
import { mergeRows, buildHierarchy } from '../core/merge';

export interface WorkerInput {
  imageData: ImageData;
  params: ProcessParams;
}

export interface WorkerOutput {
  elements: SegmentedElement[];
  softMask: Uint8Array;
}

function process({ imageData, params }: WorkerInput): WorkerOutput {
  const { width, height } = imageData;
  const bg = estimateBackgroundColor(imageData.data, width, height);
  const softMask = createAlphaMask(imageData.data, width, height, bg, params.t0, params.t1);
  const dilated = dilateMask(softMask, width, height, params.dilateRadius);

  const { elements: rawElements } = connectedComponents({
    mask: dilated,
    width,
    height,
    minArea: params.minArea,
  });

  const merged = mergeRows(rawElements, params.rowMergeGapRatio, params.rowMergeOverlapRatio);
  const elements = buildHierarchy(merged);

  return { elements, softMask };
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { imageData, params } = e.data;
  const result = process({ imageData, params });
  self.postMessage(result, [result.softMask.buffer]);
};
