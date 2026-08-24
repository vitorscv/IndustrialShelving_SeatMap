import type { Position } from '../../types/position';
import './PositionCell.css';

interface PositionCellProps {
  position: Position;
  onSelect: (position: Position) => void;
  selected?: boolean;
  size?: 'sm' | 'lg';
  // BLOCKED positions aren't actionable in a picker flow (no valid
  // check-in/check-out to perform), but should stay clickable in a
  // read-only view like the dashboard's details panel.
  disableWhenBlocked?: boolean;
}

export function PositionCell({
  position,
  onSelect,
  selected = false,
  size = 'sm',
  disableWhenBlocked = false,
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
      disabled={disableWhenBlocked && position.status === 'BLOCKED'}
      title={`Level ${position.level} / Position ${position.number}`}
    >
      {position.number}
    </button>
  );
}
