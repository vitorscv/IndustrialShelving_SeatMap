import { useState } from 'react';
import type { Position } from '../../../types/position';
import './CheckinSummary.css';

interface CheckinSummaryProps {
  shelfTitle: string;
  position: Position;
  orderNumber: string;
  product: string;
  palletCode: string;
  operatorName: string;
  onConfirm: () => Promise<void>;
  submitting: boolean;
}

export function CheckinSummary({
  shelfTitle,
  position,
  orderNumber,
  product,
  palletCode,
  operatorName,
  onConfirm,
  submitting,
}: CheckinSummaryProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      // Surface the backend's exact message (e.g. a 409 conflict — someone
      // else took this exact position while it was being reviewed here).
      setError(err instanceof Error ? err.message : 'Falha ao registrar movimentação');
    }
  }

  return (
    <div className="checkin-summary">
      <h3 className="checkin-summary__title">
        {shelfTitle} - {position.level} - {position.number}
      </h3>

      <dl className="checkin-summary__list">
        <div className="checkin-summary__row">
          <dt>Pedido</dt>
          <dd>{orderNumber}</dd>
        </div>
        <div className="checkin-summary__row">
          <dt>Produto</dt>
          <dd>{product}</dd>
        </div>
        <div className="checkin-summary__row">
          <dt>Código do palete</dt>
          <dd>{palletCode}</dd>
        </div>
        <div className="checkin-summary__row">
          <dt>Operador</dt>
          <dd>{operatorName}</dd>
        </div>
      </dl>

      <button
        type="button"
        className="checkin-summary__submit"
        onClick={handleConfirm}
        disabled={submitting}
      >
        {submitting ? 'Enviando...' : 'Confirmar check-in'}
      </button>

      {error && (
        <p className="checkin-summary__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
