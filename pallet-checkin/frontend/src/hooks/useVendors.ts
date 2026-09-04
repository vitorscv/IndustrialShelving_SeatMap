import { useEffect, useState } from 'react';
import { fetchVendors } from '../services/api';
import { useAuth } from '../services/auth';
import type { Vendor } from '../types/position';

interface UseVendorsResult {
  vendors: Vendor[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Fetched once (not polled) — the catalog only changes via an explicit
// import or the Adicionar vendedor modal, so there's no live-update need
// like the position grid has.
export function useVendors(): UseVendorsResult {
  const { token } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetchVendors(token)
      .then((data) => {
        if (!cancelled) {
          setVendors(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load vendors');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, refreshIndex]);

  const refresh = () => setRefreshIndex((index) => index + 1);

  return { vendors, loading, error, refresh };
}
