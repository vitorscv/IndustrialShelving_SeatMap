import type { Position, Shelf } from '../../../types/position';
import { matchesPositionSearch } from '../../../utils/positionSearch';
import { formatShelfLabel, padNumber } from '../../../utils/format';
import './PositionListView.css';

interface PositionListViewProps {
  shelves: Shelf[];
  searchQuery: string;
  selectedPositionId: string | null;
  onSelectPosition: (position: Position) => void;
}

const STATUS_LABELS: Record<Position['status'], string> = {
  FREE: 'Livre',
  OCCUPIED: 'Ocupada',
  BLOCKED: 'Bloqueada',
};

export function PositionListView({
  shelves,
  searchQuery,
  selectedPositionId,
  onSelectPosition,
}: PositionListViewProps) {
  const rows = shelves
    .flatMap((shelf) =>
      shelf.positions
        .filter((position) => matchesPositionSearch(position, shelf.title, searchQuery))
        .map((position) => ({ position, shelfTitle: shelf.title })),
    )
    // Same order as the grid: shelf, then level top-to-bottom, then number.
    .sort((a, b) => {
      if (a.shelfTitle !== b.shelfTitle) return a.shelfTitle.localeCompare(b.shelfTitle);
      if (a.position.level !== b.position.level) {
        return b.position.level.localeCompare(a.position.level);
      }
      return a.position.number - b.position.number;
    });

  return (
    <div className="position-list-view">
      <table className="position-list-view__table">
        <thead>
          <tr>
            <th>Posição</th>
            <th>Estante</th>
            <th>Status</th>
            <th>Produto</th>
            <th>Pedido</th>
            <th>Palete</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="position-list-view__empty">
                Nenhuma posição encontrada.
              </td>
            </tr>
          )}
          {rows.map(({ position, shelfTitle }) => (
            <tr
              key={position.id}
              className={
                position.id === selectedPositionId ? 'position-list-view__row--selected' : ''
              }
              onClick={() => onSelectPosition(position)}
            >
              <td>
                {position.level}-{padNumber(position.number)}
              </td>
              <td>{formatShelfLabel(shelfTitle)}</td>
              <td>
                <span
                  className={`position-list-view__badge position-list-view__badge--${position.status.toLowerCase()}`}
                >
                  {STATUS_LABELS[position.status]}
                </span>
              </td>
              <td>{position.product ?? '—'}</td>
              <td>{position.orderNumber ?? '—'}</td>
              <td>{position.palletCode ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
