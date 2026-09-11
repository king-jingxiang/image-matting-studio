import { ProcessParams, SegmentedElement } from '../core/types';

export interface WorkerResult {
  elements: SegmentedElement[];
  softMask: Uint8Array;
}

export function runProcessWorker(imageData: ImageData, params: ProcessParams): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./process.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerResult>) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };
    worker.postMessage({ imageData, params }, [imageData.data.buffer]);
  });
}
