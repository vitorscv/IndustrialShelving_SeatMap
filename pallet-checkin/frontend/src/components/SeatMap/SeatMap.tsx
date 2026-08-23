import { useState } from 'react';
import type { Position, Shelf } from '../../types/position';
import { PositionCell } from './PositionCell';
import './SeatMap.css';

interface SeatMapProps {
  shelves: Shelf[];
}

function groupByLevel(positions: Position[]): Map<number, Position[]> {
  const byLevel = new Map<number, Position[]>();
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

export function SeatMap({ shelves }: SeatMapProps) {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  return (
    <div className="seat-map">
      {shelves.map((shelf) => {
        const byLevel = groupByLevel(shelf.positions);
        const levels = Array.from(byLevel.keys()).sort((a, b) => b - a);

        return (
          <section key={shelf.id} className="seat-map__shelf">
            <h3>
              {shelf.title} <span className="seat-map__aisle">({shelf.aisle})</span>
            </h3>
            {levels.map((level) => (
              <div key={level} className="seat-map__level">
                <span className="seat-map__level-label">Level {level}</span>
                <div className="seat-map__row">
                  {byLevel.get(level)!.map((position) => (
                    <PositionCell
                      key={position.id}
                      position={position}
                      onSelect={setSelectedPosition}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {selectedPosition && (
        <div className="seat-map__details">
          <h4>Position details</h4>
          <p>Level: {selectedPosition.level}</p>
          <p>Number: {selectedPosition.number}</p>
          <p>Status: {selectedPosition.status}</p>
          <p>Pallet code: {selectedPosition.palletCode ?? '—'}</p>
          <button type="button" onClick={() => setSelectedPosition(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
