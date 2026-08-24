import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, PositionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PositionsService } from '../positions/positions.service';
import { CreateMovementDto } from './dto/create-movement.dto';

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
}
