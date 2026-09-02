import type { Position, Shelf } from '../../../types/position';
import { matchesPositionSearch } from '../../../utils/positionSearch';
import { formatShelfLabel, padNumber } from '../../../utils/format';
import './PositionListView.css';

interface PositionListViewProps {
  shelves: Shelf[];
  selectedPositionId: string | null;
  onSelectPosition: (position: Position) => void;
  // Ambient dim effect, alongside (not instead of) PositionSearchBar's own
  // dropdown. Lista originally FILTERED (hid) non-matching rows entirely —
  // deliberately not restoring that here: this task's whole point is a
  // lightweight, non-layout-shifting affordance, so Lista gets the same
  // opacity-based dim as the grid instead, for a consistent feel across
  // both views rather than reviving the older, more disruptive behavior.
  searchQuery?: string;
}

const STATUS_LABELS: Record<Position['status'], string> = {
  FREE: 'Livre',
  OCCUPIED: 'Ocupada',
  BLOCKED: 'Bloqueada',
};

export function PositionListView({
  shelves,
  selectedPositionId,
  onSelectPosition,
  searchQuery = '',
}: PositionListViewProps) {
  const rows = shelves
    .flatMap((shelf) =>
      shelf.positions.map((position) => ({ position, shelfTitle: shelf.title })),
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
            <th>Pedido/Cliente</th>
            <th>Quantidade</th>
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
              className={[
                position.id === selectedPositionId ? 'position-list-view__row--selected' : '',
                !matchesPositionSearch(position, shelfTitle, searchQuery)
                  ? 'position-list-view__row--dimmed'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectPosition(position)}
              data-position-id={position.id}
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
              <td>{position.quantity ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
