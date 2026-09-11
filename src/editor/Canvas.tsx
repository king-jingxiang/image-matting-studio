import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { SegmentedElement, BBox } from '@/core/types';

interface PositionMap {
  [id: string]: { x: number; y: number };
}

interface Props {
  elements: SegmentedElement[];
  positions: PositionMap;
  selectedIds: Set<string>;
  mode: 'select' | 'marquee';
  width: number;
  height: number;
  onSelect: (ids: Set<string>) => void;
  onMove: (id: string, x: number, y: number) => void;
  onMarquee: (bbox: BBox) => void;
}

export interface CanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number, size = 16) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e0e0e0';
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      if ((x / size + y / size) % 2 === 0) {
        ctx.fillRect(x, y, size, size);
      }
    }
  }
}

const Canvas = forwardRef<CanvasHandle, Props>(
  ({ elements, positions, selectedIds, mode, width, height, onSelect, onMove, onMarquee }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef({
      isDragging: false,
      dragId: '',
      dragStartX: 0,
      dragStartY: 0,
      initialX: 0,
      initialY: 0,
      multiSelect: false,
      marquee: null as { x: number; y: number; w: number; h: number } | null,
      marqueeStart: { x: 0, y: 0 },
    });

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }));

    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      drawCheckerboard(ctx, width, height);

      for (const el of elements) {
        if (!el.visible || !el.sprite) continue;
        const pos = positions[el.id] || { x: el.bbox.x, y: el.bbox.y };
        ctx.drawImage(el.sprite, pos.x, pos.y);
      }

      // 绘制选中框
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2;
      for (const el of elements) {
        if (!selectedIds.has(el.id)) continue;
        const pos = positions[el.id] || { x: el.bbox.x, y: el.bbox.y };
        ctx.strokeRect(pos.x, pos.y, el.sprite?.width || el.bbox.w, el.sprite?.height || el.bbox.h);
      }

      // 绘制选框
      const ms = stateRef.current.marquee;
      if (ms) {
        ctx.strokeStyle = '#ff0000';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(ms.x, ms.y, ms.w, ms.h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(ms.x, ms.y, ms.w, ms.h);
      }
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      redraw();
    }, [elements, positions, selectedIds, width, height]);

    const getMousePos = (e: React.MouseEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) * canvas.width) / rect.width,
        y: ((e.clientY - rect.top) * canvas.height) / rect.height,
      };
    };

    const hitTest = (x: number, y: number) => {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        const pos = positions[el.id] || { x: el.bbox.x, y: el.bbox.y };
        const w = el.sprite?.width || el.bbox.w;
        const h = el.sprite?.height || el.bbox.h;
        if (x >= pos.x && x <= pos.x + w && y >= pos.y && y <= pos.y + h) {
          return el;
        }
      }
      return null;
    };

    const isMulti = (e: React.MouseEvent) => e.ctrlKey || e.metaKey;

    const handleMouseDown = (e: React.MouseEvent) => {
      const { x, y } = getMousePos(e);
      const multi = isMulti(e);
      if (mode === 'select') {
        const hit = hitTest(x, y);
        if (hit) {
          if (multi) {
            const next = new Set(selectedIds);
            if (next.has(hit.id)) next.delete(hit.id);
            else next.add(hit.id);
            onSelect(next);
          } else {
            stateRef.current = {
              ...stateRef.current,
              isDragging: true,
              dragId: hit.id,
              dragStartX: x,
              dragStartY: y,
              initialX: positions[hit.id]?.x || hit.bbox.x,
              initialY: positions[hit.id]?.y || hit.bbox.y,
              multiSelect: false,
            };
            onSelect(new Set([hit.id]));
          }
        } else {
          stateRef.current = {
            ...stateRef.current,
            isDragging: false,
            multiSelect: multi,
            marquee: { x, y, w: 0, h: 0 },
            marqueeStart: { x, y },
          };
          if (!multi) {
            onSelect(new Set());
          }
        }
      } else {
        stateRef.current = {
          ...stateRef.current,
          isDragging: false,
          multiSelect: false,
          marquee: { x, y, w: 0, h: 0 },
          marqueeStart: { x, y },
        };
      }
      redraw();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      const { x, y } = getMousePos(e);
      const state = stateRef.current;
      if (state.isDragging) {
        const dx = x - state.dragStartX;
        const dy = y - state.dragStartY;
        onMove(state.dragId, state.initialX + dx, state.initialY + dy);
      } else if (state.marquee) {
        const start = state.marqueeStart;
        const minX = Math.min(start.x, x);
        const minY = Math.min(start.y, y);
        const maxX = Math.max(start.x, x);
        const maxY = Math.max(start.y, y);
        state.marquee = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        redraw();
      }
    };

    const handleMouseUp = () => {
      const state = stateRef.current;
      if (state.marquee && (mode === 'marquee' || !state.isDragging)) {
        const box = state.marquee;
        if (mode === 'marquee') {
          onMarquee({ x: box.x, y: box.y, w: box.w, h: box.h });
        } else {
          const selected = state.multiSelect ? new Set(selectedIds) : new Set<string>();
          for (const el of elements) {
            const pos = positions[el.id] || { x: el.bbox.x, y: el.bbox.y };
            const w = el.sprite?.width || el.bbox.w;
            const h = el.sprite?.height || el.bbox.h;
            if (
              pos.x < box.x + box.w &&
              pos.x + w > box.x &&
              pos.y < box.y + box.h &&
              pos.y + h > box.y
            ) {
              selected.add(el.id);
            }
          }
          onSelect(selected);
        }
      }
      stateRef.current = {
        ...state,
        isDragging: false,
        dragId: '',
        multiSelect: false,
        marquee: null,
      };
      redraw();
    };

    return (
      <canvas
        ref={canvasRef}
        style={{ maxWidth: '100%', border: '1px solid #ccc', cursor: mode === 'select' ? 'default' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    );
  }
);

export default Canvas;
