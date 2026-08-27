import { useEffect, useState } from 'react';
import { fetchShelves } from '../services/api';
import { useAuth } from '../services/auth';
import type { Shelf } from '../types/position';

const POLL_INTERVAL_MS = 7000;

interface UsePositionsPollingResult {
  shelves: Shelf[];
  loading: boolean;
  error: string | null;
  // Wall-clock time of the last successful fetch — null until the first
  // one lands. Used to drive "Atualizado agora / há Xs" style indicators.
  lastUpdated: Date | null;
  refresh: () => void;
}

export function usePositionsPolling(): UsePositionsPollingResult {
  const { token } = useAuth();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchShelves(token!);
        if (!cancelled) {
          setShelves(data);
          setError(null);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load shelves');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    const intervalId = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [refreshIndex, token]);

  const refresh = () => setRefreshIndex((index) => index + 1);

  return { shelves, loading, error, lastUpdated, refresh };
}
