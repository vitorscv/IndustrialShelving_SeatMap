import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { importProducts } from '../../services/api';
import { useAuth } from '../../services/auth';
import './ProdutosPage.css';

export function ProdutosPage() {
  const { token } = useAuth();
  const { products, loading, error, refresh } = useProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
      const result = await importProducts(file, token!);
      setImportResult(result);
      refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Falha ao importar planilha');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="produtos-page">
      <div className="produtos-page__header">
        <h1 className="produtos-page__title">Produtos</h1>
        <button
          type="button"
          className="produtos-page__import-button"
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
          className="produtos-page__file-input"
          onChange={handleFileSelected}
        />
      </div>

      <div className="produtos-page__content">
        {importResult && (
          <p className="produtos-page__import-summary">
            {importResult.created} {importResult.created === 1 ? 'criado' : 'criados'},{' '}
            {importResult.skipped} {importResult.skipped === 1 ? 'duplicado ignorado' : 'duplicados ignorados'}
          </p>
        )}
        {importError && <p className="produtos-page__error">{importError}</p>}

        {loading && <p className="produtos-page__muted">Carregando produtos...</p>}
        {error && <p className="produtos-page__error">Falha ao carregar produtos: {error}</p>}

        {!loading && !error && (
          <div className="produtos-page__table-wrap">
            <table className="produtos-page__table">
              <thead>
                <tr>
                  <th>Nome do produto</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr>
                    <td className="produtos-page__empty">
                      Nenhum produto cadastrado ainda — importe uma planilha para começar.
                    </td>
                  </tr>
                )}
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
