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

export interface CreateMovementInput {
  positionId: string;
  type: MovementType;
  salesInfo: string;
  // Required on CHECK_IN; ignored by the backend on CHECK_OUT (it reads
  // the values already stored on the Position instead).
  quantity?: string;
  orderNumber?: string;
  product?: string;
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
export interface ReportsSummaryBySalesInfo {
  salesInfo: string;
  quantity: number;
  positionCount: number;
}

export interface ReportsSummary {
  totalQuantity: number;
  bySalesInfo: ReportsSummaryBySalesInfo[];
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
