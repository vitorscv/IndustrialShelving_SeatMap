export type PositionStatus = 'FREE' | 'OCCUPIED' | 'BLOCKED';

export type MovementType = 'CHECK_IN' | 'CHECK_OUT';

export interface Position {
  id: string;
  shelfId: string;
  level: string;
  number: number;
  status: PositionStatus;
  palletCode: string | null;
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
  operatorName: string;
  timestamp: string;
}

export interface CreateMovementInput {
  positionId: string;
  type: MovementType;
  palletCode: string;
  operatorName: string;
}

export interface OccupancySummary {
  total: number;
  free: number;
  occupied: number;
  blocked: number;
  occupancyRate: number;
}
