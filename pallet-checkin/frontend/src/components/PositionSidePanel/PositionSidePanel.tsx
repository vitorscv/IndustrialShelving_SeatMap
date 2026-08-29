import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Eye, History, Package, X } from 'lucide-react';
import type { Position } from '../../types/position';
import { fetchMovements } from '../../services/api';
import { useAuth, useRole } from '../../services/auth';
import { formatShelfLabel, padNumber } from '../../utils/format';
import './PositionSidePanel.css';

const TRANSITION_MS = 200;

export interface PositionSelection {
  position: Position;
  shelfTitle: string;
}

interface PositionSidePanelProps {
  selection: PositionSelection | null;
  onClose: () => void;
  // Opens the dashboard's own check-in/check-out modal for this position —
  // the standalone operation page was retired, so this is the only flow.
  onMovimentar: () => void;
}

const STATUS_LABELS: Record<Position['status'], string> = {
  FREE: 'Livre',
  OCCUPIED: 'Ocupada',
  BLOCKED: 'Bloqueada',
};

export function PositionSidePanel({ selection, onClose, onMovimentar }: PositionSidePanelProps) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const role = useRole();
  const isAdmin = role === 'ADMIN';
  // Kept mounted (with its own last-known content) across the null
  // transition so the exit animation has something to fade/slide out
  // instead of the panel just vanishing the instant the selection clears.
  const [content, setContent] = useState<PositionSelection | null>(null);
  const [visible, setVisible] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const [lastMovementText, setLastMovementText] = useState<string | null>(null);

  useEffect(() => {
    if (selection) {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setContent(selection);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      setContent(null);
    }, TRANSITION_MS);
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, onClose]);

  // Real data (not fabricated): the position's most recent movement, fetched
  // from Phase 1's paginated endpoint scoped to just this one position.
  // GET /movements is ADMIN-only (RolesGuard) — an OPERATOR would always
  // get a 403 here, so this is skipped entirely for that role rather than
  // firing a doomed request and leaving "…" stuck forever.
  useEffect(() => {
    const positionId = selection?.position.id;
    if (!positionId || !token || !isAdmin) {
      setLastMovementText(null);
      return;
    }
    let cancelled = false;
    fetchMovements(token, { positionId, limit: 1 })
      .then((result) => {
        if (cancelled) return;
        const latest = result.data[0];
        setLastMovementText(latest ? new Date(latest.timestamp).toLocaleString('pt-BR') : '—');
      })
      .catch(() => {
        if (!cancelled) setLastMovementText(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selection?.position.id, token, isAdmin]);

  if (!content) return null;

  const { position, shelfTitle } = content;
  const statusKey = position.status.toLowerCase();

  return (
    <>
      {/* Only visible at mobile/tablet widths (see PositionSidePanel.css) —
          desktop's side rail has no backdrop. Dimming only, pointer-events
          stays none so taps still reach the seat map underneath — that's
          what lets tapping the same/a different cell close or switch the
          sheet; closing by tapping the backdrop itself isn't supported. */}
      <div
        className={`position-side-panel__backdrop${visible ? ' position-side-panel__backdrop--visible' : ''}`}
        aria-hidden="true"
      />
      <aside
        className={`position-side-panel${visible ? ' position-side-panel--visible' : ''}`}
        aria-label={`Posição selecionada: ${shelfTitle} - ${position.level}${position.number}`}
      >
      <div className="position-side-panel__header">
        <div className={`position-side-panel__icon-box position-side-panel__icon-box--${statusKey}`}>
          <Package size={20} aria-hidden="true" />
        </div>
        <div className="position-side-panel__heading">
          <span className="position-side-panel__eyebrow">Posição selecionada</span>
          <h3 className="position-side-panel__title">
            {position.level}-{padNumber(position.number)}
          </h3>
        </div>
        <button
          type="button"
          className="position-side-panel__close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <p className="position-side-panel__subtitle">
        {formatShelfLabel(shelfTitle)} • Nível {position.level} • Posição{' '}
        {padNumber(position.number)}
      </p>

      <span className={`position-side-panel__badge position-side-panel__badge--${statusKey}`}>
        {STATUS_LABELS[position.status]}
      </span>

      <div className="position-side-panel__section">
        <span className="position-side-panel__section-title">Informações</span>

        {position.status === 'OCCUPIED' && (
          <dl className="position-side-panel__list">
            <div className="position-side-panel__row">
              <dt>Pedido/Cliente</dt>
              <dd>{position.orderNumber ?? '—'}</dd>
            </div>
            <div className="position-side-panel__row">
              <dt>Produto</dt>
              <dd>{position.product ?? '—'}</dd>
            </div>
            <div className="position-side-panel__row">
              <dt>Quantidade</dt>
              <dd>
                {position.quantity !== null
                  ? new Intl.NumberFormat('pt-BR').format(position.quantity)
                  : '—'}
              </dd>
            </div>
            {isAdmin && (
              <div className="position-side-panel__row">
                <dt>Última movimentação</dt>
                <dd>{lastMovementText ?? '…'}</dd>
              </div>
            )}
          </dl>
        )}

        {position.status === 'FREE' && (
          <p className="position-side-panel__message">Posição livre</p>
        )}

        {position.status === 'BLOCKED' && (
          <p className="position-side-panel__message">Posição bloqueada</p>
        )}
      </div>

      <div className="position-side-panel__section">
        <span className="position-side-panel__section-title">Ações rápidas</span>
        <div className="position-side-panel__actions">
          {/* "Ver produto" and "Histórico da posição" navigate to
              AdminRoute-protected pages — hidden entirely for OPERATOR
              rather than left clickable and silently bouncing back,
              same "hide, don't dead-end" rule applied to the sidebar nav. */}
          {isAdmin && (
            <button
              type="button"
              className="position-side-panel__action"
              onClick={() => navigate('/dashboard/produtos')}
            >
              <Eye size={16} aria-hidden="true" />
              Ver produto
            </button>
          )}
          <button
            type="button"
            className="position-side-panel__action"
            onClick={onMovimentar}
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
            Movimentar
          </button>
          {isAdmin && (
            <button
              type="button"
              className="position-side-panel__action"
              onClick={() => navigate(`/dashboard/movimentacoes?positionId=${position.id}`)}
            >
              <History size={16} aria-hidden="true" />
              Histórico da posição
            </button>
          )}
        </div>
      </div>
      </aside>
    </>
  );
}
