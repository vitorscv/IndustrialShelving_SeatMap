import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { MovementListItem } from '../../types/position';
import { deleteMovement } from '../../services/api';
import { useAuth } from '../../services/auth';
import { padNumber } from '../../utils/format';
import './DeleteMovementModal.css';

const TRANSITION_MS = 180;

interface DeleteMovementModalProps {
  // null = closed. Passing the target itself (not a separate `open` flag)
  // is what lets the confirmation text below show which exact movement is
  // about to be deleted.
  movement: MovementListItem | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

// Same "freeze last content across the null transition" trick as
// PositionSidePanel — movement flips to null the instant the parent closes
// this, but the exit fade still needs something on screen to fade out
// instead of the dialog's text just vanishing mid-animation.
export function DeleteMovementModal({ movement, onClose, onDeleted }: DeleteMovementModalProps) {
  const { token } = useAuth();
  const [content, setContent] = useState<MovementListItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (movement) {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setContent(movement);
      setReason('');
      setError(null);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    closeTimeoutRef.current = window.setTimeout(() => setContent(null), TRANSITION_MS);
    return () => {
      if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current);
    };
  }, [movement]);

  useEffect(() => {
    if (!movement) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movement, onClose]);

  if (!content) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content) return;
    const trimmedReason = reason.trim();
    if (trimmedReason === '') return;

    setError(null);
    setSubmitting(true);
    try {
      await deleteMovement(content.id, trimmedReason, token!);
      onDeleted(content.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir movimentação');
    } finally {
      setSubmitting(false);
    }
  }

  const typeLabel = content.type === 'CHECK_IN' ? 'Check-in' : 'Check-out';

  return (
    <div
      className={`delete-movement-modal__backdrop${visible ? ' delete-movement-modal__backdrop--visible' : ''}`}
      onClick={onClose}
    >
      <div
        className={`delete-movement-modal${visible ? ' delete-movement-modal--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Excluir movimentação"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="delete-movement-modal__close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <form className="delete-movement-modal__form" onSubmit={handleSubmit}>
          <div className="delete-movement-modal__icon-box">
            <AlertTriangle size={18} aria-hidden="true" />
          </div>

          <h3 className="delete-movement-modal__title">Excluir movimentação</h3>

          <p className="delete-movement-modal__summary">
            {typeLabel} · {content.shelfTitle} · Nível {content.level}-{padNumber(content.number)}
            {' · '}Pedido/Cliente {content.orderNumber}
          </p>

          <p className="delete-movement-modal__warning">
            Essa ação não pode ser desfeita. O registro fica salvo no log de exclusões, com o
            motivo abaixo, para auditoria.
          </p>

          <label className="delete-movement-modal__label">
            Motivo da exclusão
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              autoFocus
              rows={3}
              placeholder="Ex.: Movimentação fictícia de teste feita em produção por engano"
            />
          </label>

          {error && (
            <p className="delete-movement-modal__error" role="alert">
              {error}
            </p>
          )}

          <div className="delete-movement-modal__actions">
            <button type="button" className="delete-movement-modal__cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="delete-movement-modal__confirm"
              disabled={submitting || reason.trim() === ''}
            >
              {submitting ? 'Excluindo...' : 'Excluir movimentação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
