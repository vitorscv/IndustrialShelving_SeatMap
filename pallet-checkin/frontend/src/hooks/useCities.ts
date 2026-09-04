import { useEffect, useState } from 'react';
import { fetchCities } from '../services/api';
import { useAuth } from '../services/auth';

// Module-level cache shared across every mount for the lifetime of the
// page — the IBGE municipality list (~5570 entries, formatted "Cidade -
// UF") is fetched at most once per browser session, not once every time
// the Cidade field mounts (e.g. every time the check-in modal opens). The
// backend itself also caches this (see CitiesService), but there's no
// reason to pay even that cheap round trip more than once client-side.
let citiesPromise: Promise<string[]> | null = null;

export function useCities(): string[] {
  const { token } = useAuth();
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    if (!citiesPromise) {
      citiesPromise = fetchCities(token);
    }
    let cancelled = false;
    citiesPromise
      .then((data) => {
        if (!cancelled) setCities(data);
      })
      .catch(() => {
        // Allow a later mount to retry instead of caching a permanent failure.
        citiesPromise = null;
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return cities;
}
