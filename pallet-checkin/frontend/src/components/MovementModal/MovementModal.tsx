import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Position } from '../../types/position';
import { createMovement } from '../../services/api';
import { CheckinForm, type CheckinFormSubmitInput } from '../CheckinForm/CheckinForm';
import './MovementModal.css';

const TRANSITION_MS = 200;

export interface MovementSelection {
  position: Position;
  shelfTitle: string;
}

interface MovementModalProps {
  selection: MovementSelection | null;
  salesInfo: string;
  onSalesInfoChange: (value: string) => void;
  onClose: () => void;
  // Lets the dashboard refresh its polled data immediately on success,
  // instead of waiting for the next scheduled poll tick.
  onSuccess: () => void;
}

// Same "keep last content through the exit transition" shell used by
// PositionSidePanel — there's no shared Modal wrapper here on purpose: the
// form below (CheckinForm) has its own live-typed input state and its own
// submitting/error state, and threading those through a generic wrapper
// that snapshots "children" via an effect would lag them by a render tick
// (the wrapper's effect only re-fires after commit). Owning the shell
// directly means CheckinForm re-renders normally, on its own state changes,
// with no extra indirection.
export function MovementModal({
  selection,
  salesInfo,
  onSalesInfoChange,
  onClose,
  onSuccess,
}: MovementModalProps) {
  const [content, setContent] = useState<MovementSelection | null>(null);
  const [visible, setVisible] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  if (!content) return null;

  const { position, shelfTitle } = content;

  async function handleSubmit(input: CheckinFormSubmitInput) {
    setSubmitting(true);
    try {
      await createMovement({
        positionId: position.id,
        type: position.status === 'OCCUPIED' ? 'CHECK_OUT' : 'CHECK_IN',
        quantity: input.quantity,
        orderNumber: input.orderNumber,
        product: input.product,
        salesInfo: input.salesInfo,
      });
      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
    // Errors intentionally propagate up uncaught — CheckinForm's own
    // try/catch displays the backend's exact message (e.g. a 409 conflict)
    // inline and keeps itself mounted, so the modal stays open.
  }

  return (
    <div
      className={`movement-modal__backdrop${visible ? ' movement-modal__backdrop--visible' : ''}`}
      onClick={onClose}
    >
      <div
        className={`movement-modal${visible ? ' movement-modal--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Movimentar ${shelfTitle} - ${position.level}${position.number}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="movement-modal__close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <CheckinForm
          position={position}
          shelfTitle={shelfTitle}
          salesInfo={salesInfo}
          onSalesInfoChange={onSalesInfoChange}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
