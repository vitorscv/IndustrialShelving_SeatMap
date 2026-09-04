export type PositionStatus = 'FREE' | 'OCCUPIED' | 'BLOCKED';

export type MovementType = 'CHECK_IN' | 'CHECK_OUT';

export interface Position {
  id: string;
  shelfId: string;
  level: string;
  number: number;
  status: PositionStatus;
  // Free text, not a plain number: one or more positive integers separated
  // by "/" (e.g. "2500/3000" — two orders combined on one pallet). See
  // utils/quantity.ts's QUANTITY_PATTERN/parseQuantity.
  quantity: string | null;
  orderNumber: string | null;
  product: string | null;
  salesInfo: string | null;
  // Populated only going forward (see the Vendedores/Vendor catalog) —
  // null on positions checked in before that feature existed, or ones
  // whose Vendedor was never attached via the "Editar dados" OPERATOR
  // action. Used to pre-select the Vendedor dropdown when editing.
  vendorId: string | null;
  cidade: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Shelf {
  id: string;
  title: string;
  locations: number;
  positions: Position[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateShelfInput {
  title: string;
  locations: number;
}

export interface CreateShelfResult {
  id: string;
  title: string;
  locations: number;
  createdAt: string;
  updatedAt: string;
  positionCount: number;
}

export interface Movement {
  id: string;
  positionId: string;
  type: MovementType;
  quantity: string;
  orderNumber: string;
  product: string;
  salesInfo: string;
  timestamp: string;
}

// PATCH /positions/:id/edit-occupied — OPERATOR-only correction tool for a
// currently OCCUPIED position. All fields required (the form is always
// pre-filled from the position's current values); does not create a
// Movement or touch history, see PositionsService.editOccupied.
export interface EditOccupiedPositionInput {
  orderNumber: string;
  product: string;
  quantity: string;
  vendorId: string;
  cidade: string;
}

export interface CreateMovementInput {
  positionId: string;
  type: MovementType;
  // Required on CHECK_IN; ignored by the backend on CHECK_OUT (it reads
  // the values already stored on the Position instead).
  quantity?: string;
  orderNumber?: string;
  product?: string;
  // Raw text as typed — possibly several vendor names joined by "/" (e.g.
  // "MACHADO/GOMES E LIMA"). The backend resolves a canonical vendorId
  // only when this is a single name that exactly matches the Vendor
  // catalog; otherwise the position is stored unlinked (vendorId null),
  // same as any other legacy free-text salesInfo. See
  // MovementsService.create.
  vendedorText?: string;
  cidade?: string;
}

export interface OccupancySummary {
  total: number;
  free: number;
  occupied: number;
  blocked: number;
  occupancyRate: number;
}

export interface MovementListItem {
  id: string;
  timestamp: string;
  type: MovementType;
  quantity: string;
  orderNumber: string;
  product: string;
  salesInfo: string;
  positionId: string;
  shelfId: string;
  shelfTitle: string;
  level: string;
  number: number;
}

// Returned by DELETE /movements/:id — the audit-log entry created for that
// deletion (see MovementDeletionLog in the backend's prisma/schema.prisma).
export interface MovementDeletionLog {
  id: string;
  deletedAt: string;
  deletedByUserId: string;
  deletedByUsername: string;
  reason: string;
  deletedRecordSnapshot: {
    timestamp: string;
    type: MovementType;
    shelfId: string;
    shelfTitle: string;
    level: string;
    number: number;
    orderNumber: string;
    product: string;
    quantity: string;
    salesInfo: string;
  };
}

export interface PaginatedMovements {
  data: MovementListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListMovementsParams {
  page?: number;
  limit?: number;
  shelfId?: string;
  positionId?: string;
  from?: string;
  to?: string;
}

// Returned by GET /reports/summary — CURRENT state (right now, from
// Position), not historical like the .xlsx exports elsewhere on the
// Relatórios page.
//
// `key`/`vendorId` drive the UI: a row with vendorId set is clickable,
// navigating to the vendor detail page (its cities are combined under one
// row); a row with vendorId null is an old unlinked record grouped by its
// raw salesInfo text, same as before this feature existed, and stays
// non-clickable (no detail page for those). `label` is always what's
// actually displayed.
export interface ReportsSummaryRow {
  key: string;
  label: string;
  quantity: number;
  positionCount: number;
  vendorId: string | null;
}

export interface ReportsSummary {
  totalQuantity: number;
  bySalesInfo: ReportsSummaryRow[];
}

// Returned by GET /reports/vendors/:vendorId/positions — every currently
// occupied position linked to this vendor, across all cities.
export interface VendorPositionDetail {
  positionId: string;
  shelfTitle: string;
  level: string;
  number: number;
  orderNumber: string | null;
  product: string | null;
  quantity: string | null;
  cidade: string | null;
  salesInfo: string | null;
}

export interface VendorPositionsReport {
  vendorId: string;
  vendorName: string;
  totalQuantity: number;
  positionCount: number;
  positions: VendorPositionDetail[];
}

export interface Product {
  id: string;
  name: string;
  createdAt: string;
}

export interface ImportProductsResult {
  created: number;
  skipped: number;
}

// A real catalog (unlike Product's suggestion-only free text) — vendorId on
// CreateMovementInput must reference one of these.
export interface Vendor {
  id: string;
  name: string;
  createdAt: string;
}

export interface ImportVendorsResult {
  created: number;
  skipped: number;
}
