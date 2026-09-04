import { useState } from 'react';
import type { FormEvent } from 'react';
import type { MovementType, Position } from '../../types/position';
import { ProductAutocomplete } from '../ProductAutocomplete/ProductAutocomplete';
import { CidadeAutocomplete } from '../CidadeAutocomplete/CidadeAutocomplete';
import { VendedorAutocomplete } from '../VendedorAutocomplete/VendedorAutocomplete';
import { isQuantityBeingTyped, isQuantityValid } from '../../utils/quantity';
import './CheckinForm.css';

export interface CheckinFormSubmitInput {
  // Only meaningful (and only sent) on the CHECK_IN path — CHECK_OUT reads
  // quantity/orderNumber/product/vendorId/cidade from the Position
  // server-side instead.
  // Free text, not a plain number: one or more positive integers separated
  // by "/" (e.g. "2500/3000" for two orders combined on one pallet).
  quantity?: string;
  orderNumber?: string;
  product?: string;
  // Raw text as typed, possibly several vendor names joined by "/" (e.g.
  // "MACHADO/GOMES E LIMA") — the backend resolves this into a canonical
  // vendorId only for the single-exact-catalog-match case; see
  // movements.service.ts.
  vendedorText?: string;
  cidade?: string;
}

interface CheckinFormProps {
  position: Position;
  shelfTitle: string;
  vendedorText: string;
  onVendedorTextChange: (value: string) => void;
  cidade: string;
  onCidadeChange: (value: string) => void;
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
  vendedorText,
  onVendedorTextChange,
  cidade,
  onCidadeChange,
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

    if (isCheckIn && !isQuantityValid(quantity)) {
      setError(
        'Quantidade inválida — use um número (ex.: 5000) ou vários separados por "/" (ex.: 2500/3000)',
      );
      return;
    }

    const input: CheckinFormSubmitInput = isCheckIn
      ? { quantity: quantity.trim(), orderNumber, product, vendedorText, cidade }
      : {};
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
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
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
                type="text"
                inputMode="text"
                value={quantity}
                onChange={(e) => {
                  // Blocks letters/other stray characters as they're typed;
                  // still allows "2500/" mid-typing toward a valid value —
                  // full-shape validation only happens on submit.
                  if (isQuantityBeingTyped(e.target.value)) {
                    setQuantity(e.target.value);
                  }
                }}
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

      {isCheckIn ? (
        <>
          <label>
            Vendedor
            <VendedorAutocomplete value={vendedorText} onChange={onVendedorTextChange} required />
          </label>

          <label>
            Cidade
            <CidadeAutocomplete value={cidade} onChange={onCidadeChange} required />
          </label>
        </>
      ) : (
        <p className="checkin-form__info">
          Vendedor/Cidade: <strong>{position.salesInfo}</strong>
        </p>
      )}

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
