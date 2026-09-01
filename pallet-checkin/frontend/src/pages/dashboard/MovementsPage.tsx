import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Trash2 } from 'lucide-react';
import { usePositionsPolling } from '../../hooks/usePositionsPolling';
import { fetchMovements } from '../../services/api';
import { useAuth, useRole } from '../../services/auth';
import type { MovementListItem, PaginatedMovements } from '../../types/position';
import { DeleteMovementModal } from '../../components/DeleteMovementModal/DeleteMovementModal';
import './MovementsPage.css';

const LIMIT = 20;

export function MovementsPage() {
  const { token } = useAuth();
  const role = useRole();
  // MovementsPage already sits behind AdminRoute (see App.tsx), so this is
  // belt-and-suspenders — same pattern PositionSidePanel/Sidebar use to gate
  // ADMIN-only controls, kept here in case that route guard ever changes.
  const isAdmin = role === 'ADMIN';
  const { shelves } = usePositionsPolling();
  const [searchParams, setSearchParams] = useSearchParams();
  const positionIdFilter = searchParams.get('positionId');

  const [shelfId, setShelfId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<PaginatedMovements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MovementListItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Brief, self-dismissing confirmation — no toast system exists yet in
  // this app, so a small inline banner (auto-cleared) fills that role here.
  useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  // Any filter change (including the positionId scope from the side panel's
  // "Histórico da posição" link) restarts pagination at page 1. Adjusted
  // directly during render (React's recommended pattern for "reset state
  // when an input changes") rather than in an effect, since nothing here
  // depends on an external system — just derives `page` from the filters.
  const filterKey = `${shelfId}|${from}|${to}|${positionIdFilter ?? ''}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchMovements(token!, {
          page,
          limit: LIMIT,
          positionId: positionIdFilter ?? undefined,
          shelfId: positionIdFilter ? undefined : shelfId || undefined,
          from: from || undefined,
          to: to || undefined,
        });
        if (!cancelled) {
          setResult(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar movimentações');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, page, shelfId, from, to, positionIdFilter]);

  // Removes the row immediately (rather than re-fetching the current page)
  // and decrements the total shown in the pagination footer to match — the
  // modal already confirmed the delete succeeded server-side.
  function handleDeleted(id: string) {
    setResult((current) =>
      current
        ? {
            ...current,
            data: current.data.filter((item) => item.id !== id),
            total: Math.max(0, current.total - 1),
          }
        : current,
    );
    setSuccessMessage('Movimentação excluída com sucesso.');
  }

  const columnCount = isAdmin ? 10 : 9;

  return (
    <div className="movements-page">
      <div className="movements-page__header">
        <h1 className="movements-page__title">Movimentações</h1>
      </div>

      <div className="movements-page__content">
        {successMessage && (
          <div className="movements-page__success-banner" role="status">
            {successMessage}
          </div>
        )}

        {positionIdFilter && (
          <div className="movements-page__scope-banner">
            Filtrando pela posição selecionada
            <button
              type="button"
              className="movements-page__scope-clear"
              onClick={() => setSearchParams({})}
            >
              Ver todas as movimentações
            </button>
          </div>
        )}

        <div className="movements-page__filters">
          <label className="movements-page__filter">
            <span>Estante</span>
            <select
              value={shelfId}
              onChange={(event) => setShelfId(event.target.value)}
              disabled={Boolean(positionIdFilter)}
            >
              <option value="">Todas</option>
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>
                  {shelf.title}
                </option>
              ))}
            </select>
          </label>

          <label className="movements-page__filter">
            <span>De</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>

          <label className="movements-page__filter">
            <span>Até</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>

        {error && <p className="movements-page__error">{error}</p>}

        <div className="movements-page__table-wrap">
          <table className="movements-page__table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Tipo</th>
                <th>Estante</th>
                <th>Nível</th>
                <th>Posição</th>
                <th>Pedido/Cliente</th>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Vendedor/Cidade</th>
                {isAdmin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {!loading && result?.data.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="movements-page__empty">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              )}
              {result?.data.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.timestamp).toLocaleString('pt-BR')}</td>
                  <td>
                    <span
                      className={`movements-page__type movements-page__type--${item.type === 'CHECK_IN' ? 'in' : 'out'}`}
                    >
                      {item.type === 'CHECK_IN' ? (
                        <ArrowDownToLine size={13} aria-hidden="true" />
                      ) : (
                        <ArrowUpFromLine size={13} aria-hidden="true" />
                      )}
                      {item.type === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
                    </span>
                  </td>
                  <td>{item.shelfTitle}</td>
                  <td>{item.level}</td>
                  <td>{item.number}</td>
                  <td>{item.orderNumber}</td>
                  <td>{item.product}</td>
                  <td>{item.quantity}</td>
                  <td>{item.salesInfo}</td>
                  {isAdmin && (
                    <td>
                      <button
                        type="button"
                        className="movements-page__delete-button"
                        onClick={() => setDeleteTarget(item)}
                        aria-label="Excluir movimentação"
                        title="Excluir movimentação"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {result && result.total > 0 && (
          <div className="movements-page__pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span>
              Página {result.page} de {result.totalPages} ({result.total} registros)
            </span>
            <button
              type="button"
              disabled={page >= result.totalPages}
              onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      <DeleteMovementModal
        movement={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
