import type { Position } from '../../../types/position';
import { PositionCell } from '../../../components/PositionCell/PositionCell';
import './PositionGrid.css';

interface PositionGridProps {
  // Positions for the currently selected shelf + level, sorted by number.
  positions: Position[];
  selectedPositionId: string | null;
  onSelect: (position: Position) => void;
}

export function PositionGrid({ positions, selectedPositionId, onSelect }: PositionGridProps) {
  return (
    <div className="position-grid">
      {positions.map((position) => (
        <PositionCell
          key={position.id}
          position={position}
          onSelect={onSelect}
          selected={position.id === selectedPositionId}
          size="lg"
          disableWhenBlocked
        />
      ))}
    </div>
  );
}
