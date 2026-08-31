import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { ListMovementsDto } from './dto/list-movements.dto';
import { DeleteMovementDto } from './dto/delete-movement.dto';

// Populated by JwtStrategy.validate (see auth/strategies/jwt.strategy.ts) —
// the same { userId, username, role } shape RolesGuard already reads off
// request.user.
interface AuthenticatedRequest extends Request {
  user: { userId: string; username: string; role: string };
}

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

  // Deletes one fictitious/mistaken Movement row. ADMIN only, and always
  // logged (DeleteMovementDto.reason is required) — see MovementsService.remove.
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Body() dto: DeleteMovementDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.movementsService.remove(id, dto, request.user);
  }

  // Read-only audit trail of what's been deleted and why — no dedicated
  // frontend screen yet, exists for manual/API inspection when needed.
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Get('deletion-log')
  findAllDeletionLogs() {
    return this.movementsService.findAllDeletionLogs();
  }
}
