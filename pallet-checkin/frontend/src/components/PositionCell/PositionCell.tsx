import type { Position } from '../../types/position';
import { padNumber } from '../../utils/format';
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
  // Dims a cell that doesn't match an active search — kept in place (not
  // hidden) so the grid layout never jumps around while typing.
  dimmed?: boolean;
}

export function PositionCell({
  position,
  onSelect,
  selected = false,
  size = 'sm',
  disabled = false,
  dimmed = false,
}: PositionCellProps) {
  const classNames = [
    'position-cell',
    `position-cell--${size}`,
    `position-cell--${position.status.toLowerCase()}`,
    selected ? 'position-cell--selected' : '',
    dimmed ? 'position-cell--dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => onSelect(position)}
      disabled={disabled}
      title={`Nível ${position.level} / Posição ${padNumber(position.number)}`}
    >
      {padNumber(position.number)}
    </button>
  );
}
