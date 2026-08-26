import type {
  CreateMovementInput,
  ListMovementsParams,
  Movement,
  OccupancySummary,
  PaginatedMovements,
  Position,
  Shelf,
} from '../types/position';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request to ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchShelves(): Promise<Shelf[]> {
  return request<Shelf[]>('/shelves');
}

export function fetchOccupancySummary(token: string): Promise<OccupancySummary> {
  return request<OccupancySummary>('/shelves/occupancy-summary', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createMovement(
  input: CreateMovementInput,
): Promise<{ movement: Movement; position: Position }> {
  return request('/movements', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchMovements(
  token: string,
  params: ListMovementsParams = {},
): Promise<PaginatedMovements> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const queryString = query.toString();
  return request<PaginatedMovements>(`/movements${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
