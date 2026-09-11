import { SegmentedElement } from '@/core/types';

interface Props {
  elements: SegmentedElement[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
}

export default function LayerTree({ elements, selectedIds, onSelect, onToggleVisible }: Props) {
  return (
    <div className="layer-tree">
      <h3>图层列表</h3>
      <ul>
        {elements.map((el) => (
          <li
            key={el.id}
            className={selectedIds.has(el.id) ? 'selected' : ''}
            onClick={() => onSelect(el.id)}
          >
            <input
              type="checkbox"
              checked={el.visible}
              onChange={(e) => {
                e.stopPropagation();
                onToggleVisible(el.id);
              }}
            />
            <span>{el.name}</span>
            <small>{el.bbox.w}×{el.bbox.h}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
