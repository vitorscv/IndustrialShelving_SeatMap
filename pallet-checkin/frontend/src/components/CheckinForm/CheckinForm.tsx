import { useState } from 'react';
import type { FormEvent } from 'react';
import type { MovementType, Position } from '../../types/position';
import { ProductAutocomplete } from '../ProductAutocomplete/ProductAutocomplete';
import './CheckinForm.css';

export interface CheckinFormSubmitInput {
  // Only meaningful (and only sent) on the CHECK_IN path — CHECK_OUT reads
  // quantity/orderNumber/product from the Position server-side instead.
  quantity?: number;
  orderNumber?: string;
  product?: string;
  salesInfo: string;
}

interface CheckinFormProps {
  position: Position;
  shelfTitle: string;
  salesInfo: string;
  onSalesInfoChange: (value: string) => void;
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
  salesInfo,
  onSalesInfoChange,
  onSubmit,
  submitting,
}: CheckinFormProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const movementType = movementTypeFor(position);
  const isCheckIn = movementType === 'CHECK_IN';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const input: CheckinFormSubmitInput = isCheckIn
      ? { quantity: Number(quantity), orderNumber, product, salesInfo }
      : { salesInfo };
    try {
      await onSubmit(input);
      setOrderNumber('');
      setProduct('');
      setQuantity('');
    } catch (err) {
      // Surface the backend's exact message (e.g. a 409 conflict — someone
      // else already checked a pallet into this exact position) instead of
      // a generic error.
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
              Pedido/Cliente
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
              <ProductAutocomplete value={product} onChange={setProduct} required />
            </label>

            <label>
              Quantidade
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>
          </>
        ) : (
          <>
            <p className="checkin-form__info">
              Quantidade: <strong>{position.quantity}</strong>
            </p>
            <p className="checkin-form__info">
              Pedido/Cliente: <strong>{position.orderNumber}</strong>
            </p>
            <p className="checkin-form__info">
              Produto: <strong>{position.product}</strong>
            </p>
          </>
        )}
      </fieldset>

      <label>
        Vendedor/Cidade
        <input
          type="text"
          value={salesInfo}
          onChange={(e) => onSalesInfoChange(e.target.value)}
          required
        />
      </label>

      <button
        type="submit"
        className={isCheckIn ? 'checkin-form__submit--checkin' : 'checkin-form__submit--checkout'}
        disabled={submitting}
      >
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
