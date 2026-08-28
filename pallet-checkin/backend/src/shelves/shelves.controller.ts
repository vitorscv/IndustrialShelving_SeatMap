import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ShelvesService } from './shelves.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';

@UseGuards(JwtAuthGuard)
@Controller('shelves')
export class ShelvesController {
  constructor(private readonly shelvesService: ShelvesService) {}

  // No @Roles() — any authenticated user (ADMIN or OPERATOR) needs this to
  // see the seat map and do check-in/check-out.
  @Get()
  findAll() {
    return this.shelvesService.findAllWithPositions();
  }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() dto: CreateShelfDto) {
    return this.shelvesService.create(dto);
  }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Patch(':id')
  updateTitle(@Param('id') id: string, @Body() dto: UpdateShelfDto) {
    return this.shelvesService.updateTitle(id, dto);
  }

  @Get('occupancy-summary')
  getOccupancySummary() {
    return this.shelvesService.getOccupancySummary();
  }
}
