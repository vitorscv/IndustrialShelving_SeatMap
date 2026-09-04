import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { fetchVendorPositionsReport } from '../../services/api';
import { useAuth } from '../../services/auth';
import type { VendorPositionDetail, VendorPositionsReport } from '../../types/position';
import { formatShelfLabel, padNumber } from '../../utils/format';
import './RelatorioVendedorPage.css';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

// Client-side only — this vendor's dataset is already scoped small by the
// backend (just its own occupied positions), so there's no need for a
// dedicated search endpoint.
function matchesQuery(position: VendorPositionDetail, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const positionCode = `${position.shelfTitle} ${position.level}-${padNumber(position.number)}`.toLowerCase();
  return (
    positionCode.includes(normalized) ||
    (position.cidade ?? '').toLowerCase().includes(normalized) ||
    (position.product ?? '').toLowerCase().includes(normalized) ||
    (position.orderNumber ?? '').toLowerCase().includes(normalized)
  );
}

// Reached by clicking a vendor-linked "Resumo atual" row — combines every
// city that vendor has pallets in (unlike the summary row, this lists them
// individually). Phone-first: sellers are expected to open this mostly on
// their own phone, so the position list renders as stacked cards (no
// horizontal scroll) rather than a wide table, same mobile-usability
// priority as the rest of the dashboard.
export function RelatorioVendedorPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { token } = useAuth();
  const [report, setReport] = useState<VendorPositionsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token || !vendorId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchVendorPositionsReport(vendorId, token)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar relatório');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId, token]);

  const positions = report?.positions ?? [];
  const filteredPositions = positions.filter((position) => matchesQuery(position, query));

  return (
    <div className="relatorio-vendedor-page">
      <div className="relatorio-vendedor-page__header">
        <Link to="/dashboard/relatorios" className="relatorio-vendedor-page__back">
          <ArrowLeft size={18} aria-hidden="true" />
          Voltar
        </Link>

        {report && (
          <>
            <h1 className="relatorio-vendedor-page__title">{report.vendorName}</h1>
            <div className="relatorio-vendedor-page__stats">
              <div className="relatorio-vendedor-page__stat">
                <span className="relatorio-vendedor-page__stat-value">
                  {formatNumber(report.totalQuantity)}
                </span>
                <span className="relatorio-vendedor-page__stat-label">Quantidade total</span>
              </div>
              <div className="relatorio-vendedor-page__stat">
                <span className="relatorio-vendedor-page__stat-value">{report.positionCount}</span>
                <span className="relatorio-vendedor-page__stat-label">Posições</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relatorio-vendedor-page__content">
        {loading && <p className="relatorio-vendedor-page__muted">Carregando...</p>}
        {error && <p className="relatorio-vendedor-page__error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="relatorio-vendedor-page__search">
              <Search size={16} className="relatorio-vendedor-page__search-icon" aria-hidden="true" />
              <input
                type="text"
                className="relatorio-vendedor-page__search-input"
                placeholder="Buscar por cidade, produto, pedido ou posição..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            {filteredPositions.length === 0 ? (
              <p className="relatorio-vendedor-page__muted">
                {positions.length === 0
                  ? 'Nenhuma posição ocupada para este vendedor no momento.'
                  : 'Nenhum resultado para essa busca.'}
              </p>
            ) : (
              <ul className="relatorio-vendedor-page__list">
                {filteredPositions.map((position) => (
                  <li key={position.positionId} className="relatorio-vendedor-page__card">
                    <div className="relatorio-vendedor-page__card-header">
                      <span className="relatorio-vendedor-page__card-code">
                        {formatShelfLabel(position.shelfTitle)} · {position.level}-{padNumber(position.number)}
                      </span>
                      <span className="relatorio-vendedor-page__card-qty">{position.quantity ?? '—'}</span>
                    </div>
                    <dl className="relatorio-vendedor-page__card-details">
                      <div>
                        <dt>Cidade</dt>
                        <dd>{position.cidade ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Produto</dt>
                        <dd>{position.product ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Pedido/Cliente</dt>
                        <dd>{position.orderNumber ?? '—'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
