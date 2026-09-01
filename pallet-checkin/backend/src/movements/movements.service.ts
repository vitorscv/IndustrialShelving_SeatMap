import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma, PositionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PositionsService } from '../positions/positions.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { ListMovementsDto } from './dto/list-movements.dto';
import { DeleteMovementDto } from './dto/delete-movement.dto';

@Injectable()
export class MovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly positionsService: PositionsService,
  ) {}

  async create(dto: CreateMovementDto) {
    return this.prisma.$transaction(async (tx) => {
      const position = await tx.position.findUnique({
        where: { id: dto.positionId },
        include: { shelf: true },
      });
      if (!position) {
        throw new NotFoundException(`Position ${dto.positionId} not found`);
      }

      const positionLabel = `${position.level}${position.number} on ${position.shelf.title}`;

      if (position.status === PositionStatus.BLOCKED) {
        throw new ConflictException(`Position ${positionLabel} is BLOCKED and unavailable`);
      }

      if (dto.type === MovementType.CHECK_IN && position.status === PositionStatus.OCCUPIED) {
        throw new ConflictException(`Position ${positionLabel} is already occupied`);
      }

      if (dto.type === MovementType.CHECK_OUT && position.status === PositionStatus.FREE) {
        throw new ConflictException(
          `Position ${positionLabel} is already free — nothing to check out`,
        );
      }

      const isCheckIn = dto.type === MovementType.CHECK_IN;

      // On check-out the request body doesn't carry orderNumber/product/
      // quantity — they're read from the position's current state (set at
      // check-in) so the movement still has a full record of what was
      // checked out.
      const orderNumber = isCheckIn ? dto.orderNumber! : (position.orderNumber ?? 'N/A');
      const product = isCheckIn ? dto.product! : (position.product ?? 'N/A');
      const quantity = isCheckIn ? dto.quantity! : (position.quantity ?? '0');
      const salesInfo = isCheckIn ? dto.salesInfo! : (position.salesInfo ?? 'N/A');

      const movement = await tx.movement.create({
        data: {
          positionId: dto.positionId,
          type: dto.type,
          quantity,
          orderNumber,
          product,
          salesInfo,
        },
      });

      const updatedPosition = await this.positionsService.updateOccupancy(tx, dto.positionId, {
        status: isCheckIn ? PositionStatus.OCCUPIED : PositionStatus.FREE,
        quantity: isCheckIn ? dto.quantity! : null,
        orderNumber: isCheckIn ? dto.orderNumber! : null,
        product: isCheckIn ? dto.product! : null,
        salesInfo: isCheckIn ? dto.salesInfo! : null,
      });

      return { movement, position: updatedPosition };
    });
  }

  async findAll(query: ListMovementsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.MovementWhereInput = {};
    // positionId is the narrower filter (used by the side panel's "Histórico
    // da posição" link) — takes precedence when both are somehow present.
    if (query.positionId) {
      where.positionId = query.positionId;
    } else if (query.shelfId) {
      where.position = { shelfId: query.shelfId };
    }
    if (query.from || query.to) {
      where.timestamp = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [total, movements] = await this.prisma.$transaction([
      this.prisma.movement.count({ where }),
      this.prisma.movement.findMany({
        where,
        include: { position: { include: { shelf: true } } },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: movements.map((movement) => ({
        id: movement.id,
        timestamp: movement.timestamp,
        type: movement.type,
        quantity: movement.quantity,
        orderNumber: movement.orderNumber,
        product: movement.product,
        salesInfo: movement.salesInfo,
        positionId: movement.positionId,
        shelfId: movement.position.shelfId,
        shelfTitle: movement.position.shelf.title,
        level: movement.position.level,
        number: movement.position.number,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  // Deletes a fictitious/mistaken Movement row. Deliberately does NOT touch
  // Position — the position's status/quantity/product/etc. reflect its
  // current real-world state (set by the most recent check-in/check-out),
  // which is independent of whether an older history row about it still
  // exists. Removing a row from the log must never retroactively change
  // what's physically on the shelf.
  async remove(id: string, dto: DeleteMovementDto, user: { userId: string; username: string }) {
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.movement.findUnique({
        where: { id },
        include: { position: { include: { shelf: true } } },
      });
      if (!movement) {
        throw new NotFoundException(`Movement ${id} not found`);
      }

      // Snapshotted as plain JSON (not a relation to the Movement row) so
      // this log entry stays self-contained and readable even after the
      // Movement itself — deleted right after this — is gone.
      const deletedRecordSnapshot = {
        // Serialized to a string — Prisma's Json field only accepts
        // JSON-native values, not a Date instance.
        timestamp: movement.timestamp.toISOString(),
        type: movement.type,
        shelfId: movement.position.shelfId,
        shelfTitle: movement.position.shelf.title,
        level: movement.position.level,
        number: movement.position.number,
        orderNumber: movement.orderNumber,
        product: movement.product,
        quantity: movement.quantity,
        salesInfo: movement.salesInfo,
      };

      const log = await tx.movementDeletionLog.create({
        data: {
          deletedByUserId: user.userId,
          deletedByUsername: user.username,
          reason: dto.reason,
          deletedRecordSnapshot,
        },
      });

      await tx.movement.delete({ where: { id } });

      return log;
    });
  }

  findAllDeletionLogs() {
    return this.prisma.movementDeletionLog.findMany({
      orderBy: { deletedAt: 'desc' },
    });
  }
}
