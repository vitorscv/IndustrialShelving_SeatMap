import type { CreateMovementInput, Movement, OccupancySummary, Position, Shelf } from '../types/position';

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
