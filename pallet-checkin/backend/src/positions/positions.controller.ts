import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PositionsService } from './positions.service';

// Internal/read-only: no public write endpoint here. Position mutations
// only happen as a side effect of a Movement, via MovementsService.
// Not called by the frontend directly (Shelf/Movement responses already
// embed full Position data) but still guarded since it exposes the same
// sensitive business data (quantity/orderNumber/product/salesInfo).
@UseGuards(JwtAuthGuard)
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.positionsService.findById(id);
  }
}
