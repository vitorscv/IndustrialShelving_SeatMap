import { useEffect, useState } from 'react';
import { fetchShelves } from '../services/api';
import type { Shelf } from '../types/position';

const POLL_INTERVAL_MS = 7000;

interface UsePositionsPollingResult {
  shelves: Shelf[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePositionsPolling(): UsePositionsPollingResult {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchShelves();
        if (!cancelled) {
          setShelves(data);
          setError(null);
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
  }, [refreshIndex]);

  const refresh = () => setRefreshIndex((index) => index + 1);

  return { shelves, loading, error, refresh };
}
