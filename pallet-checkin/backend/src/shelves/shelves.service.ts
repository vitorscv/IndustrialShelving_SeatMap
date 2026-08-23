import { Injectable } from '@nestjs/common';
import { PositionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShelvesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllWithPositions() {
    return this.prisma.shelf.findMany({
      include: { positions: true },
      orderBy: { title: 'asc' },
    });
  }

  async getOccupancySummary() {
    const positions = await this.prisma.position.findMany({
      select: { status: true },
    });

    const total = positions.length;
    const counts = {
      [PositionStatus.FREE]: 0,
      [PositionStatus.OCCUPIED]: 0,
      [PositionStatus.BLOCKED]: 0,
    };
    for (const position of positions) {
      counts[position.status]++;
    }

    const occupancyRate = total === 0 ? 0 : counts[PositionStatus.OCCUPIED] / total;

    return {
      total,
      free: counts[PositionStatus.FREE],
      occupied: counts[PositionStatus.OCCUPIED],
      blocked: counts[PositionStatus.BLOCKED],
      occupancyRate,
    };
  }
}
