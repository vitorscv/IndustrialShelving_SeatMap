import { useState } from 'react';
import type { FormEvent } from 'react';
import type { MovementType, Position } from '../../../types/position';
import './CheckinForm.css';

interface CheckinFormSubmitInput {
  palletCode: string;
  orderNumber?: string;
  product?: string;
  operatorName: string;
}

interface CheckinFormProps {
  position: Position;
  shelfTitle: string;
  operatorName: string;
  onOperatorNameChange: (name: string) => void;
  onSubmit: (input: CheckinFormSubmitInput) => Promise<void>;
  submitting: boolean;
}

// The type sent to the API is always derived from the position's current
// (live, polled) status — there is no manual type selector anywhere.
function movementTypeFor(position: Position): MovementType {
  return position.status === 'OCCUPIED' ? 'CHECK_OUT' : 'CHECK_IN';
}

export function CheckinForm({
  position,
  shelfTitle,
  operatorName,
  onOperatorNameChange,
  onSubmit,
  submitting,
}: CheckinFormProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [product, setProduct] = useState('');
  const [palletCode, setPalletCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const movementType = movementTypeFor(position);
  const isCheckIn = movementType === 'CHECK_IN';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const input: CheckinFormSubmitInput = isCheckIn
      ? { palletCode, orderNumber, product, operatorName }
      : { palletCode: position.palletCode ?? '', operatorName };
    try {
      await onSubmit(input);
      setOrderNumber('');
      setProduct('');
      setPalletCode('');
    } catch (err) {
      // Surface the backend's exact message (e.g. a 409 conflict telling the
      // operator which pallet is already there) instead of a generic error.
      setError(err instanceof Error ? err.message : 'Falha ao registrar movimentação');
    }
  }

  return (
    <form className="checkin-form" onSubmit={handleSubmit}>
      <h3 className="checkin-form__title">
        {shelfTitle} - {position.level} - {position.number}
      </h3>

      <fieldset className="checkin-form__fieldset">
        <legend>Dados do palete</legend>

        {isCheckIn ? (
          <>
            <label>
              Pedido
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
                autoFocus
              />
            </label>

            <label>
              Produto
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                required
              />
            </label>

            <label>
              Código do palete
              <input
                type="text"
                value={palletCode}
                onChange={(e) => setPalletCode(e.target.value)}
                required
              />
            </label>
          </>
        ) : (
          <>
            <p className="checkin-form__info">
              Palete atual: <strong>{position.palletCode}</strong>
            </p>
            <p className="checkin-form__info">
              Pedido: <strong>{position.orderNumber}</strong>
            </p>
            <p className="checkin-form__info">
              Produto: <strong>{position.product}</strong>
            </p>
          </>
        )}
      </fieldset>

      <label>
        Nome do operador
        <input
          type="text"
          value={operatorName}
          onChange={(e) => onOperatorNameChange(e.target.value)}
          required
        />
      </label>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Enviando...' : isCheckIn ? 'Confirmar check-in' : 'Confirmar check-out'}
      </button>

      {error && (
        <p className="checkin-form__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
