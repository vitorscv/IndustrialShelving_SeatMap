import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, List, Search } from 'lucide-react';
import { usePositionsPolling } from '../../hooks/usePositionsPolling';
import { fetchOccupancySummary } from '../../services/api';
import { useAuth } from '../../services/auth';
import type { OccupancySummary as OccupancySummaryData, Position } from '../../types/position';
import { formatShelfLabel } from '../../utils/format';
import { SeatMap } from '../../components/SeatMap/SeatMap';
import { PositionSidePanel } from '../../components/PositionSidePanel/PositionSidePanel';
import { MovementModal } from '../../components/MovementModal/MovementModal';
import { OccupancySummary } from './components/OccupancySummary';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { StatusLegend } from './components/StatusLegend';
import { PositionListView } from './components/PositionListView';
import './OverviewPage.css';

const SUMMARY_POLL_INTERVAL_MS = 7000;

type ViewMode = 'mapa' | 'lista';

export function OverviewPage() {
  const { shelves, loading, error, lastUpdated, refresh } = usePositionsPolling();
  const { token } = useAuth();
  const [summary, setSummary] = useState<OccupancySummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shelfFilter, setShelfFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('mapa');
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  // Persists across the modal's opens/closes within the session — the same
  // salesperson/city likely applies to several pallets moved in a row from
  // the dashboard too.
  const [salesInfo, setSalesInfo] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ticks once a second purely to force "Atualizado há Xs" to keep
  // recomputing as time passes — the underlying `lastUpdated` only changes
  // when a new poll actually lands.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const updatedText = (() => {
    if (!lastUpdated) return 'Atualizando...';
    const elapsedSeconds = Math.max(0, Math.floor((now - lastUpdated.getTime()) / 1000));
    return elapsedSeconds < 10 ? 'Atualizado agora' : `Atualizado há ${elapsedSeconds}s`;
  })();

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadSummary() {
      try {
        const data = await fetchOccupancySummary(token!);
        if (!cancelled) {
          setSummary(data);
          setSummaryError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSummaryError(err instanceof Error ? err.message : 'Failed to load summary');
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    }

    loadSummary();
    const intervalId = setInterval(loadSummary, SUMMARY_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [token]);

  // Ctrl/Cmd+K jumps straight to the search box, matching the shortcut
  // hint shown inside it.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Re-derived from the live polled shelves on every render (not a frozen
  // snapshot from the moment of the click) — so the side panel always
  // matches the position's real, current status.
  const selectedShelf = selectedPositionId
    ? shelves.find((shelf) => shelf.positions.some((p) => p.id === selectedPositionId))
    : undefined;
  const selectedPosition: Position | null = selectedShelf
    ? (selectedShelf.positions.find((p) => p.id === selectedPositionId) ?? null)
    : null;
  const selection =
    selectedPosition && selectedShelf
      ? { position: selectedPosition, shelfTitle: selectedShelf.title }
      : null;

  const visibleShelves = shelfFilter
    ? shelves.filter((shelf) => shelf.id === shelfFilter)
    : shelves;

  return (
    <div className="overview-page">
      <div className="overview-page__header">
        <h1 className="overview-page__title">Visão Geral</h1>
        <div className="overview-page__live-indicator">
          <span className="overview-page__live-dot" aria-hidden="true" />
          {updatedText}
        </div>
      </div>

      <div className="overview-page__body">
        <div className="overview-page__main">
          <div className="overview-page__toolbar">
            <div className="overview-page__search">
              <Search size={16} className="overview-page__search-icon" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                className="overview-page__search-input"
                placeholder="Buscar posição, produto ou quantidade..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <kbd className="overview-page__search-kbd">Ctrl K</kbd>
            </div>

            <select
              className="overview-page__shelf-filter"
              value={shelfFilter}
              onChange={(event) => setShelfFilter(event.target.value)}
            >
              <option value="">Todas estantes</option>
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>
                  {formatShelfLabel(shelf.title)}
                </option>
              ))}
            </select>

            <div className="overview-page__view-toggle" role="group" aria-label="Modo de visualização">
              <button
                type="button"
                className={`overview-page__view-button${viewMode === 'mapa' ? ' overview-page__view-button--active' : ''}`}
                onClick={() => setViewMode('mapa')}
              >
                <LayoutGrid size={15} aria-hidden="true" />
                Mapa
              </button>
              <button
                type="button"
                className={`overview-page__view-button${viewMode === 'lista' ? ' overview-page__view-button--active' : ''}`}
                onClick={() => setViewMode('lista')}
              >
                <List size={15} aria-hidden="true" />
                Lista
              </button>
            </div>
          </div>

          <OccupancySummary summary={summary} loading={summaryLoading} error={summaryError} />

          {loading && <DashboardSkeleton />}
          {error && <p className="overview-page__error">Failed to load shelves: {error}</p>}
          {!loading && !error && viewMode === 'mapa' && (
            <SeatMap
              shelves={visibleShelves}
              selectedPositionId={selectedPositionId}
              onSelectPosition={(position) => setSelectedPositionId(position.id)}
              searchQuery={searchQuery}
            />
          )}
          {!loading && !error && viewMode === 'lista' && (
            <PositionListView
              shelves={visibleShelves}
              searchQuery={searchQuery}
              selectedPositionId={selectedPositionId}
              onSelectPosition={(position) => setSelectedPositionId(position.id)}
            />
          )}

          {!loading && !error && <StatusLegend summary={summary} />}
        </div>

        <PositionSidePanel
          selection={selection}
          onClose={() => setSelectedPositionId(null)}
          onMovimentar={() => setMovementModalOpen(true)}
        />
      </div>

      <MovementModal
        selection={movementModalOpen ? selection : null}
        salesInfo={salesInfo}
        onSalesInfoChange={setSalesInfo}
        onClose={() => setMovementModalOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
