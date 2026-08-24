export type PositionStatus = 'FREE' | 'OCCUPIED' | 'BLOCKED';

export type MovementType = 'CHECK_IN' | 'CHECK_OUT';

export interface Position {
  id: string;
  shelfId: string;
  level: string;
  number: number;
  status: PositionStatus;
  palletCode: string | null;
  orderNumber: string | null;
  product: string | null;
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

export interface Movement {
  id: string;
  positionId: string;
  type: MovementType;
  palletCode: string;
  orderNumber: string;
  product: string;
  operatorName: string;
  timestamp: string;
}

export interface CreateMovementInput {
  positionId: string;
  type: MovementType;
  palletCode: string;
  // Required on CHECK_IN; ignored by the backend on CHECK_OUT (it reads
  // the values already stored on the Position instead).
  orderNumber?: string;
  product?: string;
  operatorName: string;
}

export interface OccupancySummary {
  total: number;
  free: number;
  occupied: number;
  blocked: number;
  occupancyRate: number;
}
