import type { Position, PositionStatus } from '../../../types/position';
import { PositionCell } from '../../../components/PositionCell/PositionCell';
import './PositionGrid.css';

interface PositionGridProps {
  // Positions for the currently selected shelf + level, sorted by number.
  positions: Position[];
  selectedPositionId: string | null;
  onSelect: (position: Position) => void;
  // Only cells with this status can be tapped — FREE while checking in,
  // OCCUPIED while checking out. Everything else (including BLOCKED) is
  // disabled, since it can't receive the movement already committed to.
  tappableStatus: PositionStatus;
}

export function PositionGrid({
  positions,
  selectedPositionId,
  onSelect,
  tappableStatus,
}: PositionGridProps) {
  return (
    <div className="position-grid">
      {positions.map((position) => (
        <PositionCell
          key={position.id}
          position={position}
          onSelect={onSelect}
          selected={position.id === selectedPositionId}
          size="lg"
          disabled={position.status !== tappableStatus}
        />
      ))}
    </div>
  );
}
