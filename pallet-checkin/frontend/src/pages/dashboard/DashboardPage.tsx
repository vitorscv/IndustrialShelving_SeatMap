import { useEffect, useState } from 'react';
import { usePositionsPolling } from '../../hooks/usePositionsPolling';
import { fetchOccupancySummary } from '../../services/api';
import { useAuth } from '../../services/auth';
import type { OccupancySummary as OccupancySummaryData } from '../../types/position';
import { SeatMap } from '../../components/SeatMap/SeatMap';
import { OccupancySummary } from './components/OccupancySummary';

const SUMMARY_POLL_INTERVAL_MS = 7000;

export function DashboardPage() {
  const { shelves, loading, error } = usePositionsPolling();
  const { token, setToken } = useAuth();
  const [summary, setSummary] = useState<OccupancySummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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

  return (
    <div className="page">
      <div className="page__header">
        <h1>Dashboard</h1>
        <button type="button" onClick={() => setToken(null)}>
          Log out
        </button>
      </div>

      <OccupancySummary summary={summary} loading={summaryLoading} error={summaryError} />

      {loading && <p>Loading shelves...</p>}
      {error && <p className="occupancy-summary__error">Failed to load shelves: {error}</p>}
      {!loading && !error && <SeatMap shelves={shelves} />}
    </div>
  );
}
