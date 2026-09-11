import { ProcessParams } from '@/core/types';

interface Props {
  params: ProcessParams;
  onChange: (params: Partial<ProcessParams>) => void;
  onProcess: () => void;
  processing: boolean;
}

export default function ThresholdPanel({ params, onChange, onProcess, processing }: Props) {
  return (
    <div className="threshold-panel">
      <h3>参数控制</h3>
      <div className="field">
        <label>软边缘低阈值 t0: {params.t0}</label>
        <input
          type="range"
          min={0}
          max={100}
          value={params.t0}
          onChange={(e) => onChange({ t0: Number(e.target.value) })}
        />
      </div>
      <div className="field">
        <label>软边缘高阈值 t1: {params.t1}</label>
        <input
          type="range"
          min={10}
          max={200}
          value={params.t1}
          onChange={(e) => onChange({ t1: Number(e.target.value) })}
        />
      </div>
      <div className="field">
        <label>膨胀半径: {params.dilateRadius}px</label>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={params.dilateRadius}
          onChange={(e) => onChange({ dilateRadius: Number(e.target.value) })}
        />
      </div>
      <div className="field">
        <label>最小面积: {params.minArea}</label>
        <input
          type="range"
          min={10}
          max={500}
          step={10}
          value={params.minArea}
          onChange={(e) => onChange({ minArea: Number(e.target.value) })}
        />
      </div>
      <div className="field">
        <label>行合并间距系数: {params.rowMergeGapRatio.toFixed(2)}</label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={params.rowMergeGapRatio}
          onChange={(e) => onChange({ rowMergeGapRatio: Number(e.target.value) })}
        />
      </div>
      <button onClick={onProcess} disabled={processing}>
        {processing ? '处理中...' : '重新处理'}
      </button>
    </div>
  );
}
