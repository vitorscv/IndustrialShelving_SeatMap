import { useEffect, useState } from 'react';
import { fetchProducts } from '../services/api';
import { useAuth } from '../services/auth';
import type { Product } from '../types/position';

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Fetched once (not polled) — the catalog only changes via an explicit
// import, so there's no live-update need like the position grid has.
export function useProducts(): UseProductsResult {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetchProducts(token)
      .then((data) => {
        if (!cancelled) {
          setProducts(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load products');
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

  return { products, loading, error, refresh };
}
