import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Position, PositionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseQuantity } from '../common/quantity';
import { EditOccupiedPositionDto } from './dto/edit-occupied-position.dto';

// The exact, controlled orderNumber value the "Reserva de estoque"
// checkbox writes — a simple equality match is enough precisely because
// it's no longer free text going forward (old free-text variants like
// "Reserva de estoque - lote 5" are out of scope by design, see
// findReservaEstoque below).
export const RESERVA_ESTOQUE_ORDER_NUMBER = 'RESERVA DE ESTOQUE';

export interface ReservaEstoquePositionDetail {
  positionId: string;
  shelfTitle: string;
  level: string;
  number: number;
  orderNumber: string;
  product: string | null;
  quantity: string | null;
  cidade: string | null;
  salesInfo: string | null;
}

export interface ReservaEstoqueReport {
  totalQuantity: number;
  positionCount: number;
  positions: ReservaEstoquePositionDetail[];
}

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

  // Powers the "Reserva de Estoque" sidebar page — visible to every role
  // (see PositionsController: no @Roles() at all here, unlike most other
  // report-shaped endpoints). Mirrors VendorPositionsReport's shape since
  // it's the same "filtered position list + totals" pattern.
  async findReservaEstoque(): Promise<ReservaEstoqueReport> {
    const positions = await this.prisma.position.findMany({
      where: { status: PositionStatus.OCCUPIED, orderNumber: RESERVA_ESTOQUE_ORDER_NUMBER },
      include: { shelf: true },
      orderBy: [{ shelf: { title: 'asc' } }, { level: 'asc' }, { number: 'asc' }],
    });

    let totalQuantity = 0;
    const positionRows: ReservaEstoquePositionDetail[] = positions.map((position) => {
      totalQuantity += position.quantity !== null ? parseQuantity(position.quantity) : 0;
      return {
        positionId: position.id,
        shelfTitle: position.shelf.title,
        level: position.level,
        number: position.number,
        orderNumber: position.orderNumber ?? RESERVA_ESTOQUE_ORDER_NUMBER,
        product: position.product,
        quantity: position.quantity,
        cidade: position.cidade,
        salesInfo: position.salesInfo,
      };
    });

    return {
      totalQuantity,
      positionCount: positionRows.length,
      positions: positionRows,
    };
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
