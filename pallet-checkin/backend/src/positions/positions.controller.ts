import { Controller, Get, Param } from '@nestjs/common';
import { PositionsService } from './positions.service';

// Internal/read-only: no public write endpoint here. Position mutations
// only happen as a side effect of a Movement, via MovementsService.
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.positionsService.findById(id);
  }
}
