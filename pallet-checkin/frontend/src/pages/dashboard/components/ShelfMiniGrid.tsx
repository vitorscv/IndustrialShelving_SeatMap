import type { Position } from '../../../types/position';
import './ShelfMiniGrid.css';

interface ShelfMiniGridProps {
  positions: Position[];
}

function groupByLevel(positions: Position[]): Map<string, Position[]> {
  const byLevel = new Map<string, Position[]>();
  for (const position of positions) {
    const levelPositions = byLevel.get(position.level) ?? [];
    levelPositions.push(position);
    byLevel.set(position.level, levelPositions);
  }
  for (const levelPositions of byLevel.values()) {
    levelPositions.sort((a, b) => a.number - b.number);
  }
  return byLevel;
}

// A compressed, non-interactive thumbnail of the shelf's real layout —
// same row/column shape as SeatMap (levels E at top down to A), same
// status colors as PositionCell, just too small to read cell-by-cell.
// Deliberately plain <div>s rather than reusing <PositionCell> itself:
// that component is a <button> built for a numbered, clickable, full-size
// cell, and none of that (text, focus, hover-scale, click handler) applies
// at a few pixels across — only the status→color mapping is shared here.
export function ShelfMiniGrid({ positions }: ShelfMiniGridProps) {
  const byLevel = groupByLevel(positions);
  const levels = Array.from(byLevel.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="shelf-mini-grid" aria-hidden="true">
      {levels.map((level) => (
        <div key={level} className="shelf-mini-grid__row">
          {byLevel.get(level)!.map((position) => (
            <div
              key={position.id}
              className={`shelf-mini-grid__cell shelf-mini-grid__cell--${position.status.toLowerCase()}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
