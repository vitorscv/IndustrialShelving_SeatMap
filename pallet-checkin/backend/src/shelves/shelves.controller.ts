import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShelvesService } from './shelves.service';

@UseGuards(JwtAuthGuard)
@Controller('shelves')
export class ShelvesController {
  constructor(private readonly shelvesService: ShelvesService) {}

  @Get()
  findAll() {
    return this.shelvesService.findAllWithPositions();
  }

  @Get('occupancy-summary')
  getOccupancySummary() {
    return this.shelvesService.getOccupancySummary();
  }
}
