import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createVendor } from '../../services/api';
import { useAuth } from '../../services/auth';
import './AddVendorModal.css';

interface AddVendorModalProps {
  open: boolean;
  onClose: () => void;
  // Lets the Vendedores page refresh its list immediately on success,
  // instead of waiting for the next scheduled poll tick.
  onSuccess: () => void;
}

// Same shell/lifecycle pattern as AddProductModal — a plain isOpen-gated
// render with a mount-timing entrance fade, no frozen-content effect
// needed since this form always starts blank.
export function AddVendorModal({ open, onClose, onSuccess }: AddVendorModalProps) {
  const { token } = useAuth();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    setName('');
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

  const isValid = name.trim() !== '';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createVendor(name.trim(), token!);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar vendedor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`add-vendor-modal__backdrop${visible ? ' add-vendor-modal__backdrop--visible' : ''}`}
      onClick={onClose}
    >
      <div
        className={`add-vendor-modal${visible ? ' add-vendor-modal--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar vendedor"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="add-vendor-modal__close" onClick={onClose} aria-label="Fechar">
          <X size={16} aria-hidden="true" />
        </button>

        <form className="add-vendor-modal__form" onSubmit={handleSubmit}>
          <h3 className="add-vendor-modal__title">Adicionar vendedor</h3>

          <label>
            Nome do vendedor
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              required
              autoFocus
            />
          </label>

          <button type="submit" className="add-vendor-modal__submit" disabled={submitting || !isValid}>
            {submitting ? 'Criando...' : 'Criar vendedor'}
          </button>

          {error && (
            <p className="add-vendor-modal__error" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
