import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PositionsService } from './positions.service';
import { EditOccupiedPositionDto } from './dto/edit-occupied-position.dto';

// Read-only otherwise: position mutations normally only happen as a side
// effect of a Movement, via MovementsService. GET :id is not called by the
// frontend directly (Shelf/Movement responses already embed full Position
// data) but still guarded since it exposes the same sensitive business
// data (quantity/orderNumber/product/salesInfo).
@UseGuards(JwtAuthGuard)
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  // Registered BEFORE the ':id' route below — Nest/Express match routes in
  // registration order, so if ':id' came first it would swallow this exact
  // path (matching id='reserva-estoque') and this handler would never run.
  //
  // No @Roles() at all — visible to ADMIN, OPERATOR, and VENDEDOR alike,
  // the one report-shaped endpoint every role can reach.
  @Get('reserva-estoque')
  findReservaEstoque() {
    return this.positionsService.findReservaEstoque();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.positionsService.findById(id);
  }

  // OPERATOR-only, deliberately excluding ADMIN (admin uses other tools
  // for this) — corrects typos or retroactively attaches a Fase 1 catalog
  // Vendor to an old free-text salesInfo record on a currently OCCUPIED
  // position, without creating a Movement or touching history. See
  // PositionsService.editOccupied.
  @Roles('OPERATOR')
  @UseGuards(RolesGuard)
  @Patch(':id/edit-occupied')
  editOccupied(@Param('id') id: string, @Body() dto: EditOccupiedPositionDto) {
    return this.positionsService.editOccupied(id, dto);
  }
}
