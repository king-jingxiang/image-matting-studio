import { useState, useEffect } from 'react';
import './App.css';
import { DEFAULT_PARAMS, ProcessParams, SegmentedElement } from './core/types';
import { processImage } from './core/process';
import { mergeMultiple } from './core/merge';
import { createSpriteCanvas } from './core/sprite';
import { downsampleImage } from './core/downsample';
import { canvasToBlob, cropCanvas, downloadBlob } from './io/exportPng';
import { copyBlobToClipboard, canUseClipboard } from './io/clipboard';
import { packZip } from './io/zipExport';
import ThresholdPanel from './editor/ThresholdPanel';
import LayerTree from './editor/LayerTree';
import Canvas from './editor/Canvas';

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function App() {
  const [image, setImage] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const MAX_PROCESS_DIMENSION = 2048;
  const [elements, setElements] = useState<SegmentedElement[]>([]);
  const [alphaCanvas, setAlphaCanvas] = useState<HTMLCanvasElement | null>(null);
  const [positions, setPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [params, setParams] = useState<ProcessParams>(DEFAULT_PARAMS);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<'select' | 'marquee'>('select');
  const [message, setMessage] = useState('');

  function getCombinedCanvas(selectedEls: SegmentedElement[]) {
    if (selectedEls.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of selectedEls) {
      if (!el.sprite) continue;
      const pos = positions[el.id] || { x: el.bbox.x, y: el.bbox.y };
      const w = el.sprite.width;
      const h = el.sprite.height;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    }
    if (!isFinite(minX) || !isFinite(minY)) return null;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, maxX - minX);
    canvas.height = Math.max(1, maxY - minY);
    const ctx = canvas.getContext('2d')!;
    for (const el of selectedEls) {
      if (!el.sprite) continue;
      const pos = positions[el.id] || { x: el.bbox.x, y: el.bbox.y };
      ctx.drawImage(el.sprite, pos.x - minX, pos.y - minY);
    }
    return canvas;
  }

  const handleCopySelected = async () => {
    const selected = elements.filter((el) => selectedIds.has(el.id));
    if (selected.length === 0) {
      setMessage('请先选择要复制的元素');
      return;
    }
    const canvas = getCombinedCanvas(selected);
    if (!canvas) {
      setMessage('复制失败');
      return;
    }
    const blob = await canvasToBlob(canvas);
    const ok = await copyBlobToClipboard(blob);
    setMessage(ok ? '已复制到剪贴板' : '复制失败，请使用导出');
  };

  const handleExportSelected = async () => {
    const selected = elements.filter((el) => selectedIds.has(el.id));
    if (selected.length === 0) {
      setMessage('请先选择要导出的元素');
      return;
    }
    const canvas = getCombinedCanvas(selected);
    if (!canvas) {
      setMessage('导出失败');
      return;
    }
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob, 'selected.png');
    setMessage('已导出选中内容');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopySelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [elements, positions, selectedIds]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = await loadImage(file);
    const maxDim = Math.max(img.width, img.height);
    let source = img as HTMLImageElement | HTMLCanvasElement;
    if (maxDim > MAX_PROCESS_DIMENSION) {
      const { canvas } = downsampleImage(img, MAX_PROCESS_DIMENSION);
      source = canvas;
    }
    setImage(source);
    setImageSize({ w: source.width, h: source.height });
    runProcess(source, source.width, source.height);
  };

  const runProcess = async (img: HTMLImageElement | HTMLCanvasElement, w: number, h: number) => {
    setProcessing(true);
    setMessage('');
    try {
      const result = await processImage(img, w, h, params);
      setElements(result.elements);
      setAlphaCanvas(result.alphaCanvas);
      const initialPositions: { [id: string]: { x: number; y: number } } = {};
      for (const el of result.elements) {
        initialPositions[el.id] = { x: el.bbox.x, y: el.bbox.y };
      }
      setPositions(initialPositions);
      setSelectedIds(new Set());
      setMessage(`检测到 ${result.elements.length} 个元素`);
    } catch (err) {
      console.error(err);
      setMessage('处理失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleParamChange = (partial: Partial<ProcessParams>) => {
    setParams((prev) => ({ ...prev, ...partial }));
  };

  const handleProcess = () => {
    if (!image || !imageSize) return;
    runProcess(image, imageSize.w, imageSize.h);
  };

  const handleSelect = (id: string) => {
    setSelectedIds(new Set([id]));
  };

  const handleMove = (id: string, x: number, y: number) => {
    setPositions((prev) => ({ ...prev, [id]: { x, y } }));
  };

  const handleToggleVisible = (id: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, visible: !el.visible } : el))
    );
  };

  const handleMarquee = (bbox: { x: number; y: number; w: number; h: number }) => {
    // 导出选区
    if (!image || !imageSize) return;
    const canvas = cropCanvas(image, bbox);
    canvasToBlob(canvas).then((blob) => {
      downloadBlob(blob, 'selection.png');
      setMessage('已导出选区');
    });
  };

  const handleExportAll = async () => {
    const files = elements
      .filter((el) => el.visible && el.sprite)
      .map((el) => {
        const canvas = document.createElement('canvas');
        canvas.width = el.sprite!.width;
        canvas.height = el.sprite!.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(el.sprite!, 0, 0);
        return {
          name: `${el.name}.png`,
          blobPromise: canvasToBlob(canvas),
        };
      });
    const blobs = await Promise.all(files.map((f) => f.blobPromise));
    const zipFiles = files.map((f, i) => ({ name: f.name, blob: blobs[i] }));
    const zipBlob = await packZip(zipFiles);
    downloadBlob(zipBlob, 'elements.zip');
    setMessage('已导出 ZIP');
  };

  const handleMerge = () => {
    const selected = elements.filter((el) => selectedIds.has(el.id));
    if (selected.length < 2) {
      setMessage('请至少选中两个元素再合并');
      return;
    }
    if (!alphaCanvas) {
      setMessage('无法合并：缺少图像数据');
      return;
    }
    const mergedId = `merged-${Date.now()}`;
    const merged = mergeMultiple(selected, mergedId);
    merged.sprite = createSpriteCanvas(alphaCanvas, merged);

    const selectedIdSet = new Set(selected.map((el) => el.id));
    setElements((prev) => {
      const others = prev.filter((el) => !selectedIdSet.has(el.id));
      return [...others, merged];
    });
    setPositions((prev) => ({
      ...prev,
      [merged.id]: { x: merged.bbox.x, y: merged.bbox.y },
    }));
    setSelectedIds(new Set([merged.id]));
    setMessage('已合并元素');
  };

  const handleSplit = () => {
    setMessage('拆分功能：建议后续接入完整实现');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Icon Splitter</h1>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {message && <span className="message">{message}</span>}
      </header>

      <div className="main">
        <aside className="sidebar left">
          <ThresholdPanel
            params={params}
            onChange={handleParamChange}
            onProcess={handleProcess}
            processing={processing}
          />
          <div className="tools">
            <button onClick={() => setMode('select')}>选择模式</button>
            <button onClick={() => setMode('marquee')}>框选导出</button>
            <button onClick={handleMerge}>合并</button>
            <button onClick={handleSplit}>拆分</button>
          </div>
          {selectedIds.size > 0 && (
            <div className="selected-actions">
              <h4>已选中 {selectedIds.size} 个</h4>
              <button onClick={handleCopySelected}>复制选中 (Ctrl+C)</button>
              <button onClick={handleExportSelected}>导出选中</button>
              <button onClick={() => handleMerge()}>合并选中</button>
            </div>
          )}
          <button onClick={handleExportAll} disabled={elements.length === 0}>
            导出全部 ZIP
          </button>
          {!canUseClipboard() && <small>当前环境不支持剪贴板（需 HTTPS/localhost）</small>}
        </aside>

        <div className="canvas-area">
          {image && imageSize && (
            <Canvas
              elements={elements}
              positions={positions}
              selectedIds={selectedIds}
              mode={mode}
              width={imageSize.w}
              height={imageSize.h}
              onSelect={setSelectedIds}
              onMove={handleMove}
              onMarquee={handleMarquee}
            />
          )}
          {!image && <div className="placeholder">请先上传图片</div>}
        </div>

        <aside className="sidebar right">
          <LayerTree
            elements={elements}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onToggleVisible={handleToggleVisible}
          />
        </aside>
      </div>
    </div>
  );
}
