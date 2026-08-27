import { useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Shelf } from '../../../types/position';
import { formatShelfLabel } from '../../../utils/format';
import { updateShelfTitle } from '../../../services/api';
import { useAuth } from '../../../services/auth';
import { ShelfMiniGrid } from './ShelfMiniGrid';
import './ShelfInventoryCard.css';

interface ShelfInventoryCardProps {
  shelf: Shelf;
  // Lets the Estantes page refresh its list immediately after a rename,
  // instead of waiting for the next scheduled poll tick.
  onRenamed: () => void;
}

// Deliberately simpler than SeatMap's shelf header — this page is about
// shelf INVENTORY (how many positions, how full), so the summary numbers
// come first; the position layout still shows below as a compact,
// non-interactive mini-grid (ShelfMiniGrid) rather than the full clickable
// per-level grid SeatMap renders.
export function ShelfInventoryCard({ shelf, onRenamed }: ShelfInventoryCardProps) {
  const { token } = useAuth();
  const [editing, setEditing] = useState(false);
  // Edits always work on the raw stored title (e.g. "Estante 1"), never
  // the uppercased/zero-padded display label — saving the display string
  // back would corrupt the real value.
  const [draftTitle, setDraftTitle] = useState(shelf.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = shelf.positions.length;
  const occupied = shelf.positions.filter((p) => p.status === 'OCCUPIED').length;
  const free = shelf.positions.filter((p) => p.status === 'FREE').length;
  const occupancyPct = total === 0 ? 0 : (occupied / total) * 100;
  const barBackgroundSize = occupancyPct > 0 ? `${10000 / occupancyPct}% 100%` : '100% 100%';

  function startEditing() {
    setDraftTitle(shelf.title);
    setError(null);
    setEditing(true);
    // Autofocus + select-all happen on the next frame, once the input has
    // actually mounted in place of the <h3>.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
    setDraftTitle(shelf.title);
  }

  async function commitEditing() {
    const trimmed = draftTitle.trim();
    if (trimmed === '') {
      setError('O nome não pode ficar vazio');
      return;
    }
    if (trimmed === shelf.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateShelfTitle(shelf.id, trimmed, token!);
      setEditing(false);
      onRenamed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao renomear estante');
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    commitEditing();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  }

  return (
    <div className="shelf-inventory-card">
      {editing ? (
        <form className="shelf-inventory-card__title-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="shelf-inventory-card__title-input"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEditing}
            disabled={saving}
          />
        </form>
      ) : (
        <h3
          className="shelf-inventory-card__title shelf-inventory-card__title--editable"
          onClick={startEditing}
          title="Clique para renomear"
        >
          {formatShelfLabel(shelf.title)}
        </h3>
      )}
      {error && <p className="shelf-inventory-card__title-error">{error}</p>}

      <div className="shelf-inventory-card__stats">
        <div className="shelf-inventory-card__stat">
          <span className="shelf-inventory-card__stat-value">{total}</span>
          <span className="shelf-inventory-card__stat-label">Posições</span>
        </div>
        <div className="shelf-inventory-card__stat">
          <span className="shelf-inventory-card__stat-value shelf-inventory-card__stat-value--occupied">
            {occupied}
          </span>
          <span className="shelf-inventory-card__stat-label">Ocupadas</span>
        </div>
        <div className="shelf-inventory-card__stat">
          <span className="shelf-inventory-card__stat-value shelf-inventory-card__stat-value--free">
            {free}
          </span>
          <span className="shelf-inventory-card__stat-label">Livres</span>
        </div>
      </div>

      <div className="shelf-inventory-card__bar-row">
        <div className="shelf-inventory-card__bar" title={`${occupancyPct.toFixed(0)}% ocupado`}>
          <div
            className="shelf-inventory-card__bar-fill"
            style={{ width: `${occupancyPct}%`, backgroundSize: barBackgroundSize }}
          />
        </div>
        <span className="shelf-inventory-card__bar-label">{occupancyPct.toFixed(0)}%</span>
      </div>

      {/* Always visible as part of the card's normal layout — the mini-grid
          mirrors the real position layout (same colors, same E→A row
          order) as a quick visual check without leaving the inventory
          list. */}
      <div className="shelf-inventory-card__preview">
        <ShelfMiniGrid positions={shelf.positions} />
        <span className="shelf-inventory-card__locations-caption">
          {shelf.locations} {shelf.locations === 1 ? 'locação' : 'locações'}
        </span>
      </div>
    </div>
  );
}
