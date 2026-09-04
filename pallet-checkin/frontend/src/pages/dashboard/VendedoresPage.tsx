import { useRef, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { useVendors } from '../../hooks/useVendors';
import { importVendors } from '../../services/api';
import { useAuth } from '../../services/auth';
import { AddVendorModal } from '../../components/AddVendorModal/AddVendorModal';
import './VendedoresPage.css';

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
                  <tr key={vendor.id}>
                    <td>{vendor.name}</td>
                  </tr>
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
