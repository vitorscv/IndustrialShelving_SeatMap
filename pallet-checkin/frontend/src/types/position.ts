export type PositionStatus = 'FREE' | 'OCCUPIED' | 'BLOCKED';

export type MovementType = 'CHECK_IN' | 'CHECK_OUT';

export interface Position {
  id: string;
  shelfId: string;
  level: string;
  number: number;
  status: PositionStatus;
  quantity: number | null;
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
  quantity: number;
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
  quantity?: number;
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
  quantity: number;
  orderNumber: string;
  product: string;
  salesInfo: string;
  positionId: string;
  shelfId: string;
  shelfTitle: string;
  level: string;
  number: number;
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

export interface Product {
  id: string;
  name: string;
  createdAt: string;
}

export interface ImportProductsResult {
  created: number;
  skipped: number;
}
