import type { Position } from '../../types/position';
import './PositionCell.css';

interface PositionCellProps {
  position: Position;
  onSelect: (position: Position) => void;
}

export function PositionCell({ position, onSelect }: PositionCellProps) {
  return (
    <button
      type="button"
      className={`position-cell position-cell--${position.status.toLowerCase()}`}
      onClick={() => onSelect(position)}
      title={`Level ${position.level} / Position ${position.number}`}
    >
      {position.number}
    </button>
  );
}
