import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Position } from '../../types/position';
import { editOccupiedPosition } from '../../services/api';
import { useAuth } from '../../services/auth';
import { useVendors } from '../../hooks/useVendors';
import { ProductAutocomplete } from '../ProductAutocomplete/ProductAutocomplete';
import { CidadeAutocomplete } from '../CidadeAutocomplete/CidadeAutocomplete';
import { isQuantityBeingTyped, isQuantityValid } from '../../utils/quantity';
import './EditOccupiedPositionModal.css';

const TRANSITION_MS = 200;

export interface EditOccupiedPositionSelection {
  position: Position;
  shelfTitle: string;
}

interface EditOccupiedPositionModalProps {
  selection: EditOccupiedPositionSelection | null;
  onClose: () => void;
  // Lets the dashboard refresh its polled data immediately on success,
  // instead of waiting for the next scheduled poll tick.
  onSuccess: () => void;
}

// OPERATOR-only correction tool (see PositionSidePanel's "Editar dados"
// action, hidden entirely for ADMIN) for fixing typos or retroactively
// attaching a Fase 1 catalog Vendor to an old free-text salesInfo record —
// on the CURRENT Position row only. This is deliberately NOT a
// check-in/check-out: no Movement is created, and "Última movimentação"
// (sourced from the latest Movement's timestamp — see PositionSidePanel)
// is untouched by design.
export function EditOccupiedPositionModal({
  selection,
  onClose,
  onSuccess,
}: EditOccupiedPositionModalProps) {
  const { token } = useAuth();
  const { vendors } = useVendors();
  const [content, setContent] = useState<EditOccupiedPositionSelection | null>(null);
  const [visible, setVisible] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  // Tracks which position's data the form fields were last initialized
  // from — see the pre-fill effect below for why this is needed.
  const initializedForPositionIdRef = useRef<string | null>(null);

  const [orderNumber, setOrderNumber] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [cidade, setCidade] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Pre-fills the form from the position's current values — but only once
  // per open "session" for a given position, not on every re-render this
  // effect sees. `selection` is a fresh object every dashboard poll tick
  // (see usePositionsPolling), so depending on it directly and always
  // resetting the fields would silently wipe whatever the operator is
  // mid-typing every few seconds. Guarded by position id instead: reset
  // happens only the first time a given id is seen while open, and the
  // guard clears on close so reopening (even the same position) starts
  // fresh from its latest values next time.
  useEffect(() => {
    if (!selection) {
      initializedForPositionIdRef.current = null;
      return;
    }
    if (initializedForPositionIdRef.current === selection.position.id) return;
    initializedForPositionIdRef.current = selection.position.id;

    // An old record with only legacy salesInfo text has no vendorId yet,
    // so Vendedor starts blank (must be explicitly selected) rather than
    // guessing one from the free text.
    setOrderNumber(selection.position.orderNumber ?? '');
    setProduct(selection.position.product ?? '');
    setQuantity(selection.position.quantity ?? '');
    setVendorId(selection.position.vendorId ?? '');
    setCidade(selection.position.cidade ?? '');
    setError(null);
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isQuantityValid(quantity)) {
      setError(
        'Quantidade inválida — use um número (ex.: 5000) ou vários separados por "/" (ex.: 2500/3000)',
      );
      return;
    }

    setSubmitting(true);
    try {
      await editOccupiedPosition(
        position.id,
        { orderNumber, product, quantity: quantity.trim(), vendorId, cidade },
        token!,
      );
      onSuccess();
      onClose();
    } catch (err) {
      // Surface the backend's exact message inline and keep the modal
      // open, same pattern as CheckinForm.
      setError(err instanceof Error ? err.message : 'Falha ao salvar edição');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`edit-occupied-modal__backdrop${visible ? ' edit-occupied-modal__backdrop--visible' : ''}`}
      onClick={onClose}
    >
      <div
        className={`edit-occupied-modal${visible ? ' edit-occupied-modal--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Editar dados de ${shelfTitle} - ${position.level}${position.number}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="edit-occupied-modal__close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <form className="edit-occupied-modal__form" onSubmit={handleSubmit}>
          <h3 className="edit-occupied-modal__title">
            Editar dados — {shelfTitle} - {position.level} - {position.number}
          </h3>

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
                if (isQuantityBeingTyped(e.target.value)) {
                  setQuantity(e.target.value);
                }
              }}
              required
            />
          </label>

          <label>
            Vendedor
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
              <option value="" disabled>
                Selecione um vendedor
              </option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cidade
            <CidadeAutocomplete value={cidade} onChange={setCidade} required />
          </label>

          <button type="submit" className="edit-occupied-modal__submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar alterações'}
          </button>

          {error && (
            <p className="edit-occupied-modal__error" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
