import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CitiesService } from './cities.service';

// ADMIN and OPERATOR only — both need the full municipality list for the
// check-in Cidade autocomplete. VENDEDOR (strictly read-only, no check-in
// capability) has no use for this and shouldn't be able to reach it either.
@Roles('ADMIN', 'OPERATOR')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  findAll() {
    return this.citiesService.findAll();
  }
}
