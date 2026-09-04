import { useEffect, useState } from 'react';
import { fetchCidadeSuggestions } from '../services/api';
import { useAuth } from '../services/auth';

// Fetched once per mount — same "small reference list, no live-update
// need" reasoning as useProducts/useVendors. Starts empty on a fresh
// install and grows as new check-ins are recorded through the updated
// form; that's expected, not an error state.
export function useCidadeSuggestions(): string[] {
  const { token } = useAuth();
  const [cidades, setCidades] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetchCidadeSuggestions(token)
      .then((data) => {
        if (!cancelled) setCidades(data);
      })
      .catch(() => {
        // Best-effort suggestions only — a failed fetch just means an empty
        // list, never blocks typing a city manually.
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return cidades;
}
