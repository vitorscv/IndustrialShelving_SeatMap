import { useEffect, useState } from 'react';
import type { Position, Shelf } from '../../types/position';
import { PositionCell } from '../PositionCell/PositionCell';
import { formatShelfLabel } from '../../utils/format';
import './SeatMap.css';

interface SeatMapProps {
  shelves: Shelf[];
  selectedPositionId?: string | null;
  onSelectPosition: (position: Position) => void;
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

export function SeatMap({
  shelves,
  selectedPositionId = null,
  onSelectPosition,
}: SeatMapProps) {
  // Drives the entrance transition via a class toggle (plain CSS transition)
  // rather than a @keyframes animation — an animation's fill-forwards state
  // would otherwise keep "winning" over the hover lift's transform, since
  // animations take precedence over normal cascade rules like :hover.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="seat-map">
      {shelves.map((shelf, shelfIndex) => {
        const byLevel = groupByLevel(shelf.positions);
        // Levels are letters, A (bottom) to E (top); show the top level first.
        const levels = Array.from(byLevel.keys()).sort((a, b) => b.localeCompare(a));
        const totalCount = shelf.positions.length;
        const occupiedCount = shelf.positions.filter((p) => p.status === 'OCCUPIED').length;
        const freeCount = shelf.positions.filter((p) => p.status === 'FREE').length;
        const occupancyPct = totalCount === 0 ? 0 : (occupiedCount / totalCount) * 100;
        // The fill's gradient is authored to represent the FULL bar (green
        // at 0%, red at 100%), so a narrow fill needs its background
        // stretched by the inverse of its own width — otherwise a 2%-wide
        // sliver shows the gradient's full green-to-red range compressed
        // into those few pixels, reading as mostly red (i.e. "high
        // occupancy") regardless of how low the real percentage is.
        const barBackgroundSize = occupancyPct > 0 ? `${10000 / occupancyPct}% 100%` : '100% 100%';

        return (
          <section
            key={shelf.id}
            className={`seat-map__shelf${mounted ? ' seat-map__shelf--visible' : ''}`}
            style={{ transitionDelay: `${shelfIndex * 50}ms` }}
          >
            <div className="seat-map__shelf-header">
              <div className="seat-map__shelf-heading">
                <h3>{formatShelfLabel(shelf.title)}</h3>
                <span
                  className="seat-map__status-indicator"
                  title="Estante conectada ao monitoramento em tempo real"
                >
                  <span className="seat-map__status-dot" aria-hidden="true" />
                  Online
                </span>
              </div>

              <div className="seat-map__shelf-stats">
                <span>
                  <strong>{totalCount}</strong> posições
                </span>
                <span className="seat-map__shelf-stats-occupied">
                  <strong>{occupiedCount}</strong> ocupadas
                </span>
                <span className="seat-map__shelf-stats-free">
                  <strong>{freeCount}</strong> livres
                </span>
                <span>
                  <strong>{occupancyPct.toFixed(0)}%</strong> ocupação
                </span>
              </div>
            </div>

            <div className="seat-map__occupancy-bar-row">
              <div
                className="seat-map__occupancy-bar"
                title={`${occupancyPct.toFixed(0)}% ocupado`}
              >
                <div
                  className="seat-map__occupancy-bar-fill"
                  style={{ width: `${occupancyPct}%`, backgroundSize: barBackgroundSize }}
                />
              </div>
              <span className="seat-map__occupancy-bar-label">{occupancyPct.toFixed(0)}%</span>
            </div>

            {/* Wrapped so the right-edge fade (::after, below) stays fixed
                to the card edge instead of scrolling away with the grid
                content — it lives outside .seat-map__grid's own scrolling
                box, as a sibling overlay on top of it. */}
            <div className="seat-map__grid-wrap">
              {/* One scroll container for the whole grid — not per row — so
                  all 5 levels scroll horizontally in sync under a single
                  scrollbar, with the level label frozen via sticky. */}
              <div className="seat-map__grid">
                {levels.map((level) => (
                  <div key={level} className="seat-map__level">
                    <span className="seat-map__level-label">Nível {level}</span>
                    <div className="seat-map__row">
                      {byLevel.get(level)!.map((position) => (
                        <PositionCell
                          key={position.id}
                          position={position}
                          selected={position.id === selectedPositionId}
                          onSelect={onSelectPosition}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
