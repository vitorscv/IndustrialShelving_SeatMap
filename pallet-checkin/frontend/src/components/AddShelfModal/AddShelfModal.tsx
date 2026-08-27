import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createShelf } from '../../services/api';
import { useAuth } from '../../services/auth';
import './AddShelfModal.css';

const LEVELS = 5;
const POSITIONS_PER_LOCATION = 2;

interface AddShelfModalProps {
  open: boolean;
  onClose: () => void;
  // Lets the Estantes page refresh its list immediately on success,
  // instead of waiting for the next scheduled poll tick.
  onSuccess: () => void;
}

// Unlike MovementModal/PositionSidePanel, there's no per-item "selection"
// object whose last-known value needs preserving through an exit fade —
// this form always starts blank, so a plain isOpen-gated render (with a
// simple mount-timing entrance fade, same trick as SeatMap's cards) is
// enough; no frozen-content effect needed.
export function AddShelfModal({ open, onClose, onSuccess }: AddShelfModalProps) {
  const { token } = useAuth();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [locations, setLocations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    setTitle('');
    setLocations('');
    setError(null);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const locationsNumber = Number(locations);
  const isValidLocations = locations.trim() !== '' && Number.isInteger(locationsNumber) && locationsNumber > 0;
  const previewCount = isValidLocations ? locationsNumber * POSITIONS_PER_LOCATION * LEVELS : null;
  const isValid = title.trim() !== '' && isValidLocations;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createShelf({ title: title.trim(), locations: locationsNumber }, token!);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar estante');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`add-shelf-modal__backdrop${visible ? ' add-shelf-modal__backdrop--visible' : ''}`}
      onClick={onClose}
    >
      <div
        className={`add-shelf-modal${visible ? ' add-shelf-modal--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar estante"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="add-shelf-modal__close" onClick={onClose} aria-label="Fechar">
          <X size={16} aria-hidden="true" />
        </button>

        <form className="add-shelf-modal__form" onSubmit={handleSubmit}>
          <h3 className="add-shelf-modal__title">Adicionar estante</h3>

          <label>
            Nome da estante
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            Número de locações
            <input
              type="number"
              min="1"
              step="1"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              required
            />
          </label>

          <p className="add-shelf-modal__preview">
            {previewCount !== null
              ? `Isso vai criar ${locationsNumber} × 2 × 5 = ${previewCount} posições`
              : 'Informe o número de locações para ver quantas posições serão criadas'}
          </p>

          <button type="submit" className="add-shelf-modal__submit" disabled={submitting || !isValid}>
            {submitting ? 'Criando...' : 'Criar estante'}
          </button>

          {error && (
            <p className="add-shelf-modal__error" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
