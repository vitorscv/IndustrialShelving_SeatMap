import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { ListMovementsDto } from './dto/list-movements.dto';

@UseGuards(JwtAuthGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  // No @Roles() — this IS the check-in/check-out action, both roles need it.
  @Post()
  create(@Body() dto: CreateMovementDto) {
    return this.movementsService.create(dto);
  }

  // Movement history — ADMIN only, an operator doesn't need it for their
  // one job (check-in/check-out on the seat map).
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Get()
  findAll(@Query() query: ListMovementsDto) {
    return this.movementsService.findAll(query);
  }
}
