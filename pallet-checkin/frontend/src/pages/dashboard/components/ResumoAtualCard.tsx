import { Fragment, useEffect, useState } from 'react';
import { Boxes, RefreshCw } from 'lucide-react';
import { fetchReportsSummary } from '../../../services/api';
import { useAuth } from '../../../services/auth';
import type { ReportsSummary } from '../../../types/position';
import './ResumoAtualCard.css';

const INITIAL_VISIBLE_GROUPS = 8;

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

// CURRENT state (right now), unlike every other card on this page — those
// all export a historical .xlsx over a date range. Fetched once on page
// load rather than polled: Relatórios is a page an admin visits to check
// or export something, not left open as a live operational view the way
// the seat map is — a manual "Atualizar" button covers "I want the latest
// number right now" without spending a request every few seconds on a
// page nobody's actively watching.
export function ResumoAtualCard() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllGroups, setShowAllGroups] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReportsSummary(token!);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar resumo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  const groups = summary?.bySalesInfo ?? [];
  const visibleGroups = showAllGroups ? groups : groups.slice(0, INITIAL_VISIBLE_GROUPS);
  const hiddenCount = groups.length - visibleGroups.length;

  return (
    <section className="resumo-atual">
      <div className="resumo-atual__header">
        <h2 className="resumo-atual__title">Resumo atual</h2>
        <button
          type="button"
          className="resumo-atual__refresh"
          onClick={load}
          disabled={loading}
          aria-label="Atualizar resumo"
        >
          <RefreshCw size={14} aria-hidden="true" className={loading ? 'resumo-atual__refresh-icon--spinning' : ''} />
          Atualizar
        </button>
      </div>

      {error && <p className="resumo-atual__error">{error}</p>}

      {!error && (
        <>
          {/* Hero banner — full-width, centered, the single number this
              whole page leads with. A small side-by-side card felt like just
              another stat tile; this is meant to read as the headline. */}
          <div className="resumo-atual__hero">
            <div className="resumo-atual__hero-icon-box">
              <Boxes size={26} aria-hidden="true" />
            </div>
            <span className="resumo-atual__hero-value">
              {loading && !summary ? '—' : formatNumber(summary?.totalQuantity ?? 0)}
            </span>
            <span className="resumo-atual__hero-label">Quantidade total ocupada agora</span>
          </div>

          <div className="resumo-atual__breakdown">
            {/* No standalone "Por Vendedor/Cidade" label here anymore — it
                said the same thing the table's own "Vendedor/Cidade" column
                header already says, right above it. One label, not two. */}
            {loading && !summary && <p className="resumo-atual__muted">Carregando...</p>}

            {!loading && groups.length === 0 && (
              <p className="resumo-atual__muted">Nenhuma posição ocupada no momento.</p>
            )}

            {visibleGroups.length > 0 && (
              // One shared CSS Grid (not one grid per row) is what makes the
              // Quantidade/Posições columns actually line up — every row's
              // cells share the same 3 column tracks, auto-sized to the
              // widest value in each, instead of each row independently
              // sizing its own "auto" columns.
              <div className="resumo-atual__table" role="table">
                <span className="resumo-atual__table-head" role="columnheader">
                  Vendedor/Cidade
                </span>
                <span
                  className="resumo-atual__table-head resumo-atual__table-head--right"
                  role="columnheader"
                >
                  Quantidade
                </span>
                <span
                  className="resumo-atual__table-head resumo-atual__table-head--right"
                  role="columnheader"
                >
                  Posições
                </span>

                {visibleGroups.map((group) => {
                  const total = summary?.totalQuantity ?? 0;
                  const sharePct = total > 0 ? (group.quantity / total) * 100 : 0;
                  return (
                    <Fragment key={group.salesInfo}>
                      <span className="resumo-atual__cell-name" role="cell">
                        {group.salesInfo}
                      </span>
                      <span className="resumo-atual__cell-qty" role="cell">
                        {formatNumber(group.quantity)}
                      </span>
                      <span className="resumo-atual__cell-count" role="cell">
                        {group.positionCount}
                      </span>
                      <div
                        className="resumo-atual__bar-track"
                        role="presentation"
                        title={`${sharePct.toFixed(0)}% do total`}
                      >
                        <div
                          className="resumo-atual__bar-fill"
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            )}

            {hiddenCount > 0 && (
              <button
                type="button"
                className="resumo-atual__toggle"
                onClick={() => setShowAllGroups(true)}
              >
                Ver mais {hiddenCount}
              </button>
            )}
            {showAllGroups && groups.length > INITIAL_VISIBLE_GROUPS && (
              <button
                type="button"
                className="resumo-atual__toggle"
                onClick={() => setShowAllGroups(false)}
              >
                Ver menos
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
