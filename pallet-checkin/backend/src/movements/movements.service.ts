import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma, PositionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PositionsService } from '../positions/positions.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { ListMovementsDto } from './dto/list-movements.dto';

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
        throw new ConflictException(
          `Position ${positionLabel} is already occupied by pallet ${position.palletCode}`,
        );
      }

      if (dto.type === MovementType.CHECK_OUT && position.status === PositionStatus.FREE) {
        throw new ConflictException(
          `Position ${positionLabel} is already free — nothing to check out`,
        );
      }

      const isCheckIn = dto.type === MovementType.CHECK_IN;

      // On check-out the request body doesn't carry orderNumber/product —
      // they're read from the position's current state (set at check-in)
      // so the movement still has a full record of what was checked out.
      const orderNumber = isCheckIn ? dto.orderNumber! : (position.orderNumber ?? 'N/A');
      const product = isCheckIn ? dto.product! : (position.product ?? 'N/A');

      const movement = await tx.movement.create({
        data: {
          positionId: dto.positionId,
          type: dto.type,
          palletCode: dto.palletCode,
          orderNumber,
          product,
          operatorName: dto.operatorName,
        },
      });

      const updatedPosition = await this.positionsService.updateOccupancy(tx, dto.positionId, {
        status: isCheckIn ? PositionStatus.OCCUPIED : PositionStatus.FREE,
        palletCode: isCheckIn ? dto.palletCode : null,
        orderNumber: isCheckIn ? dto.orderNumber! : null,
        product: isCheckIn ? dto.product! : null,
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
        palletCode: movement.palletCode,
        orderNumber: movement.orderNumber,
        product: movement.product,
        operatorName: movement.operatorName,
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
}
