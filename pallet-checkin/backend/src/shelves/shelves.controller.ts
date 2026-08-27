import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShelvesService } from './shelves.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';

@UseGuards(JwtAuthGuard)
@Controller('shelves')
export class ShelvesController {
  constructor(private readonly shelvesService: ShelvesService) {}

  @Get()
  findAll() {
    return this.shelvesService.findAllWithPositions();
  }

  @Post()
  create(@Body() dto: CreateShelfDto) {
    return this.shelvesService.create(dto);
  }

  @Patch(':id')
  updateTitle(@Param('id') id: string, @Body() dto: UpdateShelfDto) {
    return this.shelvesService.updateTitle(id, dto);
  }

  @Get('occupancy-summary')
  getOccupancySummary() {
    return this.shelvesService.getOccupancySummary();
  }
}
