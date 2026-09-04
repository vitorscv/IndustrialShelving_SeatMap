import { useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Plus, Upload } from 'lucide-react';
import { useVendors } from '../../hooks/useVendors';
import { importVendors, updateVendorName } from '../../services/api';
import { useAuth } from '../../services/auth';
import type { Vendor } from '../../types/position';
import { AddVendorModal } from '../../components/AddVendorModal/AddVendorModal';
import './VendedoresPage.css';

interface VendorRowProps {
  vendor: Vendor;
  // Lets the Vendedores page refresh its list immediately after a rename,
  // instead of waiting for the next scheduled poll tick.
  onRenamed: () => void;
}

// Same inline click-to-rename pattern as ShelfInventoryCard's title edit —
// not abstracted into a shared component there either, so this mirrors it
// directly rather than introducing a new shared abstraction nobody asked
// for. Enter/blur saves, Escape cancels.
function VendorRow({ vendor, onRenamed }: VendorRowProps) {
  const { token } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(vendor.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setDraftName(vendor.name);
    setError(null);
    setEditing(true);
    // Autofocus + select-all happen on the next frame, once the input has
    // actually mounted in place of the plain text.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
    setDraftName(vendor.name);
  }

  async function commitEditing() {
    const trimmed = draftName.trim().toUpperCase();
    if (trimmed === '') {
      setError('O nome não pode ficar vazio');
      return;
    }
    if (trimmed === vendor.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateVendorName(vendor.id, trimmed, token!);
      setEditing(false);
      onRenamed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao renomear vendedor');
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    commitEditing();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  }

  return (
    <tr>
      <td>
        {editing ? (
          <form className="vendedores-page__name-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="vendedores-page__name-input"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEditing}
              disabled={saving}
            />
            {error && <p className="vendedores-page__name-error">{error}</p>}
          </form>
        ) : (
          <span
            className="vendedores-page__name vendedores-page__name--editable"
            onClick={startEditing}
            title="Clique para renomear"
          >
            {vendor.name}
          </span>
        )}
      </td>
    </tr>
  );
}

export function VendedoresPage() {
  const { token } = useAuth();
  const { vendors, loading, error, refresh } = useVendors();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Always reset the input value, success or failure — otherwise picking
    // the exact same file twice in a row wouldn't fire onChange again.
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await importVendors(file, token!);
      setImportResult(result);
      refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Falha ao importar planilha');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="vendedores-page">
      <div className="vendedores-page__header">
        <h1 className="vendedores-page__title">Vendedores</h1>
        <div className="vendedores-page__header-actions">
          <button
            type="button"
            className="vendedores-page__add-button"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus size={16} aria-hidden="true" />
            Adicionar vendedor
          </button>
          <button
            type="button"
            className="vendedores-page__import-button"
            onClick={handleImportClick}
            disabled={importing}
          >
            <Upload size={16} aria-hidden="true" />
            {importing ? 'Importando...' : 'Importar planilha'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            className="vendedores-page__file-input"
            onChange={handleFileSelected}
          />
        </div>
      </div>

      <div className="vendedores-page__content">
        {importResult && (
          <p className="vendedores-page__import-summary">
            {importResult.created} {importResult.created === 1 ? 'criado' : 'criados'},{' '}
            {importResult.skipped} {importResult.skipped === 1 ? 'duplicado ignorado' : 'duplicados ignorados'}
          </p>
        )}
        {importError && <p className="vendedores-page__error">{importError}</p>}

        {loading && <p className="vendedores-page__muted">Carregando vendedores...</p>}
        {error && <p className="vendedores-page__error">Falha ao carregar vendedores: {error}</p>}

        {!loading && !error && (
          <div className="vendedores-page__table-wrap">
            <table className="vendedores-page__table">
              <thead>
                <tr>
                  <th>Nome do vendedor</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 && (
                  <tr>
                    <td className="vendedores-page__empty">
                      Nenhum vendedor cadastrado ainda — importe uma planilha ou adicione manualmente para
                      começar.
                    </td>
                  </tr>
                )}
                {vendors.map((vendor) => (
                  <VendorRow key={vendor.id} vendor={vendor} onRenamed={refresh} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddVendorModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSuccess={refresh} />
    </div>
  );
}
