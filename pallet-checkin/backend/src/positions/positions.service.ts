import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Position, PositionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EditOccupiedPositionDto } from './dto/edit-occupied-position.dto';

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

  // OPERATOR-only correction tool (see PositionsController) for fixing
  // typos or retroactively attaching a Fase 1 catalog Vendor to an old
  // free-text salesInfo record — deliberately NOT a Movement: it only
  // updates this Position row's current-state fields, in place, with no
  // new history entry. Historical Movement rows are never touched, so
  // "Última movimentação" (sourced from the latest Movement's timestamp,
  // not Position.updatedAt — see PositionSidePanel) is naturally
  // unaffected by this.
  async editOccupied(id: string, dto: EditOccupiedPositionDto): Promise<Position> {
    const position = await this.findById(id);

    if (position.status !== PositionStatus.OCCUPIED) {
      throw new ConflictException(`Position ${id} is not occupied — nothing to edit`);
    }

    const vendor = await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) {
      throw new BadRequestException(`Vendor ${dto.vendorId} not found`);
    }

    const orderNumber = dto.orderNumber.toUpperCase();
    const product = dto.product.toUpperCase();
    const cidade = dto.cidade.toUpperCase();
    const salesInfo = `${vendor.name}/${cidade}`;

    return this.prisma.position.update({
      where: { id },
      data: {
        orderNumber,
        product,
        quantity: dto.quantity,
        vendorId: dto.vendorId,
        cidade,
        salesInfo,
      },
    });
  }

  // Used by MovementsService inside a transaction to keep the position's
  // status/quantity/orderNumber/product/salesInfo/vendorId/cidade in sync
  // with the movement being recorded.
  updateOccupancy(
    tx: Prisma.TransactionClient,
    id: string,
    data: {
      status: PositionStatus;
      quantity: string | null;
      orderNumber: string | null;
      product: string | null;
      salesInfo: string | null;
      vendorId: string | null;
      cidade: string | null;
    },
  ) {
    return tx.position.update({ where: { id }, data });
  }
}
