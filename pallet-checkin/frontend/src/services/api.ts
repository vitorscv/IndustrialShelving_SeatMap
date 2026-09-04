import type {
  CreateMovementInput,
  CreateShelfInput,
  CreateShelfResult,
  EditOccupiedPositionInput,
  ImportProductsResult,
  ImportVendorsResult,
  ListMovementsParams,
  Movement,
  MovementDeletionLog,
  MovementType,
  OccupancySummary,
  PaginatedMovements,
  Position,
  Product,
  ReportsSummary,
  ReservaEstoqueReport,
  Shelf,
  Vendor,
  VendorPositionsReport,
} from '../types/position';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // FormData bodies (the spreadsheet upload) must NOT get an explicit
  // Content-Type — the browser sets its own multipart boundary, which it
  // can only do if this header is left for it to fill in.
  const isFormData = options?.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    // Token missing/invalid/expired — the session is dead either way, so
    // bounce to the login screen instead of letting every caller render a
    // broken "Failed to load..." state. A hard redirect is intentional:
    // the token lives only in React state (never persisted), so there is
    // no in-memory session worth preserving through a softer transition.
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (response.status === 403) {
    // Distinct from 401: the token is valid, but this role isn't allowed
    // to do this — no redirect, just a clear message the caller can show
    // inline (the session itself is still fine).
    throw new Error('Você não tem permissão para essa ação.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request to ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchShelves(token: string): Promise<Shelf[]> {
  return request<Shelf[]>('/shelves', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function fetchOccupancySummary(token: string): Promise<OccupancySummary> {
  return request<OccupancySummary>('/shelves/occupancy-summary', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createShelf(input: CreateShelfInput, token: string): Promise<CreateShelfResult> {
  return request('/shelves', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function updateShelfTitle(id: string, title: string, token: string): Promise<Shelf> {
  return request(`/shelves/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title }),
  });
}

export function createMovement(
  input: CreateMovementInput,
  token: string,
): Promise<{ movement: Movement; position: Position }> {
  return request('/movements', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

// OPERATOR-only (backend-enforced, ADMIN gets 403) — corrects typos or
// attaches a catalog Vendor to an old free-text record on a currently
// OCCUPIED position. Creates no Movement and doesn't touch history.
export function editOccupiedPosition(
  id: string,
  input: EditOccupiedPositionInput,
  token: string,
): Promise<Position> {
  return request<Position>(`/positions/${id}/edit-occupied`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function fetchProducts(token: string): Promise<Product[]> {
  return request<Product[]>('/products', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createProduct(name: string, token: string): Promise<Product> {
  return request<Product>('/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
}

export function importProducts(file: File, token: string): Promise<ImportProductsResult> {
  const formData = new FormData();
  formData.append('file', file);
  return request<ImportProductsResult>('/products/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

export function fetchVendors(token: string): Promise<Vendor[]> {
  return request<Vendor[]>('/vendors', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createVendor(name: string, token: string): Promise<Vendor> {
  return request<Vendor>('/vendors', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
}

// Renames a catalog vendor (fixing a typo, say) — ADMIN only
// (backend-enforced). Every Position/Movement referencing it does so via
// the stable vendorId FK, so this never breaks that linkage; only the
// already-stored salesInfo snapshot on past records keeps the old name.
export function updateVendorName(id: string, name: string, token: string): Promise<Vendor> {
  return request<Vendor>(`/vendors/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
}

export function importVendors(file: File, token: string): Promise<ImportVendorsResult> {
  const formData = new FormData();
  formData.append('file', file);
  return request<ImportVendorsResult>('/vendors/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

// Distinct Cidade values collected from past CHECK_IN movements — used as
// a secondary/priority signal on top of the full IBGE list below (see
// CidadeAutocomplete). Grows over time; empty for a fresh install until
// the first check-in through the new form.
export function fetchCidadeSuggestions(token: string): Promise<string[]> {
  return request<string[]>('/movements/cidades', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// The full national municipality list, formatted "Cidade - UF" (e.g.
// "Feira de Santana - BA") — backend fetches and caches this from IBGE, so
// this call is cheap even though the list has ~5570 entries.
export function fetchCities(token: string): Promise<string[]> {
  return request<string[]>('/cities', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Report endpoints return a raw .xlsx binary, not JSON — this can't go
// through request() (which always calls response.json()), so it has its
// own fetch + blob handling, reusing the same 401-redirect behavior.
async function downloadFile(path: string, token: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (response.status === 403) {
    throw new Error('Você não tem permissão para essa ação.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request to ${path} failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const filename = disposition?.match(/filename="(.+?)"/)?.[1] ?? fallbackFilename;

  // Standard "fake link click" download trigger — the blob URL is revoked
  // right after so it doesn't linger in memory.
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadMovementsReport(
  type: MovementType,
  from: string | undefined,
  to: string | undefined,
  token: string,
): Promise<void> {
  const query = new URLSearchParams({ type });
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const fallbackFilename = `relatorio-${type === 'CHECK_IN' ? 'entradas' : 'saidas'}.xlsx`;
  return downloadFile(`/reports/movements?${query.toString()}`, token, fallbackFilename);
}

export function downloadOccupancySnapshot(token: string): Promise<void> {
  return downloadFile('/reports/occupancy-snapshot', token, 'ocupacao-atual.xlsx');
}

function buildDateRangeQuery(from: string | undefined, to: string | undefined): string {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export function downloadTopProductsReport(
  from: string | undefined,
  to: string | undefined,
  token: string,
): Promise<void> {
  return downloadFile(
    `/reports/top-products${buildDateRangeQuery(from, to)}`,
    token,
    'relatorio-produtos-mais-movimentados.xlsx',
  );
}

export function downloadBySalespersonReport(
  from: string | undefined,
  to: string | undefined,
  token: string,
): Promise<void> {
  return downloadFile(
    `/reports/by-salesperson${buildDateRangeQuery(from, to)}`,
    token,
    'relatorio-por-vendedor.xlsx',
  );
}

export function downloadActivityPeaksReport(
  from: string | undefined,
  to: string | undefined,
  token: string,
): Promise<void> {
  return downloadFile(
    `/reports/activity-peaks${buildDateRangeQuery(from, to)}`,
    token,
    'relatorio-picos-atividade.xlsx',
  );
}

export function downloadStalePositionsReport(minDays: number, token: string): Promise<void> {
  return downloadFile(
    `/reports/stale-positions?minDays=${minDays}`,
    token,
    'relatorio-posicoes-paradas.xlsx',
  );
}

// Plain JSON, not a file — the only /reports endpoint that isn't a
// download. Powers the "Resumo atual" section, rendered live.
export function fetchReportsSummary(token: string): Promise<ReportsSummary> {
  return request<ReportsSummary>('/reports/summary', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Powers the vendor detail page reached by clicking a vendor-grouped
// Resumo atual row.
export function fetchVendorPositionsReport(
  vendorId: string,
  token: string,
): Promise<VendorPositionsReport> {
  return request<VendorPositionsReport>(`/reports/vendors/${vendorId}/positions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Powers the "Reserva de Estoque" sidebar page — accessible to every role
// (no @Roles() on the backend route), unlike most other report-shaped
// endpoints.
export function fetchReservaEstoque(token: string): Promise<ReservaEstoqueReport> {
  return request<ReservaEstoqueReport>('/positions/reserva-estoque', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ADMIN only (backend-enforced) — deletes one fictitious/mistaken Movement
// row. `reason` is required by the backend; the returned log entry is the
// audit trail this deletion left behind.
export function deleteMovement(
  id: string,
  reason: string,
  token: string,
): Promise<MovementDeletionLog> {
  return request(`/movements/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason }),
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
