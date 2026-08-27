import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PositionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';

// Matches every real rack seen so far — hardcoded rather than a per-shelf
// field because there is no physical variation to model yet. If a rack
// with a different level count ever shows up, this should become a
// `levels` column on Shelf instead of staying a constant here.
const LEVELS = ['A', 'B', 'C', 'D', 'E'];

@Injectable()
export class ShelvesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllWithPositions() {
    return this.prisma.shelf.findMany({
      include: { positions: true },
      orderBy: { title: 'asc' },
    });
  }

  // Creates the shelf and all of its positions (5 levels × locations*2
  // positions per level, all FREE) as a single transaction — a failure
  // partway through must not leave a shelf with zero or partial positions.
  async create(dto: CreateShelfDto) {
    const positionsPerLevel = dto.locations * 2;

    return this.prisma.$transaction(async (tx) => {
      const shelf = await tx.shelf.create({
        data: { title: dto.title, locations: dto.locations },
      });

      const positionsData: Prisma.PositionCreateManyInput[] = [];
      for (const level of LEVELS) {
        for (let number = 1; number <= positionsPerLevel; number++) {
          positionsData.push({
            shelfId: shelf.id,
            level,
            number,
            status: PositionStatus.FREE,
          });
        }
      }
      await tx.position.createMany({ data: positionsData });

      return { ...shelf, positionCount: positionsData.length };
    });
  }

  async updateTitle(id: string, dto: UpdateShelfDto) {
    const shelf = await this.prisma.shelf.findUnique({ where: { id } });
    if (!shelf) {
      throw new NotFoundException(`Shelf ${id} not found`);
    }

    return this.prisma.shelf.update({
      where: { id },
      data: { title: dto.title },
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
