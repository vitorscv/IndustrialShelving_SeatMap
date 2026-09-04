import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchReservaEstoque } from '../../services/api';
import { useAuth } from '../../services/auth';
import type { ReservaEstoquePositionDetail, ReservaEstoqueReport } from '../../types/position';
import { formatShelfLabel, padNumber } from '../../utils/format';
import './ReservaEstoquePage.css';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

// Client-side only — the backend already scopes this to just the flagged
// positions, a small dataset, so there's no need for a dedicated search
// endpoint. orderNumber is always "RESERVA DE ESTOQUE" here (that's what
// got the position onto this page in the first place), so it's not worth
// matching against — cidade/produto/posição are what actually vary.
function matchesQuery(position: ReservaEstoquePositionDetail, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const positionCode = `${position.shelfTitle} ${position.level}-${padNumber(position.number)}`.toLowerCase();
  return (
    positionCode.includes(normalized) ||
    (position.cidade ?? '').toLowerCase().includes(normalized) ||
    (position.product ?? '').toLowerCase().includes(normalized)
  );
}

// A direct sidebar destination (visible to every role, unlike most other
// report-shaped pages) — not a drill-down reached by clicking something
// else, so unlike RelatorioVendedorPage this has no "Voltar" link. Same
// phone-first card list + client-side search pattern otherwise, since
// it's functionally the same "filtered position list" shape.
export function ReservaEstoquePage() {
  const { token } = useAuth();
  const [report, setReport] = useState<ReservaEstoqueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchReservaEstoque(token)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar reserva de estoque');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const positions = report?.positions ?? [];
  const filteredPositions = positions.filter((position) => matchesQuery(position, query));

  return (
    <div className="reserva-estoque-page">
      <div className="reserva-estoque-page__header">
        <h1 className="reserva-estoque-page__title">Reserva de Estoque</h1>
        {report && (
          <div className="reserva-estoque-page__stats">
            <div className="reserva-estoque-page__stat">
              <span className="reserva-estoque-page__stat-value">
                {formatNumber(report.totalQuantity)}
              </span>
              <span className="reserva-estoque-page__stat-label">Quantidade total</span>
            </div>
            <div className="reserva-estoque-page__stat">
              <span className="reserva-estoque-page__stat-value">{report.positionCount}</span>
              <span className="reserva-estoque-page__stat-label">Posições</span>
            </div>
          </div>
        )}
      </div>

      <div className="reserva-estoque-page__content">
        {loading && <p className="reserva-estoque-page__muted">Carregando...</p>}
        {error && <p className="reserva-estoque-page__error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="reserva-estoque-page__search">
              <Search size={16} className="reserva-estoque-page__search-icon" aria-hidden="true" />
              <input
                type="text"
                className="reserva-estoque-page__search-input"
                placeholder="Buscar por cidade, produto ou posição..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            {filteredPositions.length === 0 ? (
              <p className="reserva-estoque-page__muted">
                {positions.length === 0
                  ? 'Nenhuma posição marcada como reserva de estoque no momento.'
                  : 'Nenhum resultado para essa busca.'}
              </p>
            ) : (
              <ul className="reserva-estoque-page__list">
                {filteredPositions.map((position) => (
                  <li key={position.positionId} className="reserva-estoque-page__card">
                    <div className="reserva-estoque-page__card-header">
                      <span className="reserva-estoque-page__card-code">
                        {formatShelfLabel(position.shelfTitle)} · {position.level}-{padNumber(position.number)}
                      </span>
                      <span className="reserva-estoque-page__card-qty">{position.quantity ?? '—'}</span>
                    </div>
                    <dl className="reserva-estoque-page__card-details">
                      <div>
                        <dt>Cidade</dt>
                        <dd>{position.cidade ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Produto</dt>
                        <dd>{position.product ?? '—'}</dd>
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
