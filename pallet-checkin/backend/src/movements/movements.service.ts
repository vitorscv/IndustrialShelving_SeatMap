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
      const position = await tx.position.findUnique({ where: { id: dto.positionId } });
      if (!position) {
        throw new NotFoundException(`Position ${dto.positionId} not found`);
      }

      if (dto.type === MovementType.CHECK_IN && position.status !== PositionStatus.FREE) {
        throw new ConflictException(
          `Position ${dto.positionId} is not FREE, cannot check in`,
        );
      }

      if (dto.type === MovementType.CHECK_OUT && position.status !== PositionStatus.OCCUPIED) {
        throw new ConflictException(
          `Position ${dto.positionId} is not OCCUPIED, cannot check out`,
        );
      }

      const movement = await tx.movement.create({
        data: {
          positionId: dto.positionId,
          type: dto.type,
          palletCode: dto.palletCode,
          operatorName: dto.operatorName,
        },
      });

      const updatedPosition = await this.positionsService.updateOccupancy(tx, dto.positionId, {
        status: dto.type === MovementType.CHECK_IN ? PositionStatus.OCCUPIED : PositionStatus.FREE,
        palletCode: dto.type === MovementType.CHECK_IN ? dto.palletCode : null,
      });

      return { movement, position: updatedPosition };
    });
  }
}
