import { Injectable, NotFoundException } from '@nestjs/common';
import { Position, PositionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Position> {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position) {
      throw new NotFoundException(`Position ${id} not found`);
    }
    return position;
  }

  // Used by MovementsService inside a transaction to keep the position's
  // status/quantity/orderNumber/product/salesInfo in sync with the movement
  // being recorded.
  updateOccupancy(
    tx: Prisma.TransactionClient,
    id: string,
    data: {
      status: PositionStatus;
      quantity: string | null;
      orderNumber: string | null;
      product: string | null;
      salesInfo: string | null;
    },
  ) {
    return tx.position.update({ where: { id }, data });
  }
}
