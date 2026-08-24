import type { ChangeEvent } from 'react';
import type { PositionStatus, Shelf } from '../../../types/position';
import './PositionSelector.css';

interface PositionSelectorProps {
  shelves: Shelf[];
  statusFilter: PositionStatus;
  onStatusFilterChange: (status: PositionStatus) => void;
  selectedPositionId: string;
  onSelectPosition: (positionId: string) => void;
}

export function PositionSelector({
  shelves,
  statusFilter,
  onStatusFilterChange,
  selectedPositionId,
  onSelectPosition,
}: PositionSelectorProps) {
  const options = shelves.flatMap((shelf) =>
    shelf.positions
      .filter((position) => position.status === statusFilter)
      .map((position) => ({
        id: position.id,
        label: `${shelf.title} - ${position.level} - ${position.number}`,
      })),
  );

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    onStatusFilterChange(event.target.value as PositionStatus);
    onSelectPosition('');
  }

  return (
    <div className="position-selector">
      <label>
        Show
        <select value={statusFilter} onChange={handleStatusChange}>
          <option value="FREE">Free positions (check-in)</option>
          <option value="OCCUPIED">Occupied positions (check-out)</option>
        </select>
      </label>

      <label>
        Position
        <select
          value={selectedPositionId}
          onChange={(event) => onSelectPosition(event.target.value)}
        >
          <option value="">Select a position...</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {options.length === 0 && (
        <p className="position-selector__empty">No {statusFilter.toLowerCase()} positions found.</p>
      )}
    </div>
  );
}
