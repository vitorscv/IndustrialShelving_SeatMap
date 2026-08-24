import type { Position } from '../../types/position';
import './PositionCell.css';

interface PositionCellProps {
  position: Position;
  onSelect: (position: Position) => void;
  selected?: boolean;
  size?: 'sm' | 'lg';
  // Left to the caller: a read-only view (dashboard details) never disables
  // cells, while a picker flow disables whichever statuses aren't actionable
  // for the intent currently being carried out.
  disabled?: boolean;
}

export function PositionCell({
  position,
  onSelect,
  selected = false,
  size = 'sm',
  disabled = false,
}: PositionCellProps) {
  const classNames = [
    'position-cell',
    `position-cell--${size}`,
    `position-cell--${position.status.toLowerCase()}`,
    selected ? 'position-cell--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => onSelect(position)}
      disabled={disabled}
      title={`Level ${position.level} / Position ${position.number}`}
    >
      {position.number}
    </button>
  );
}
