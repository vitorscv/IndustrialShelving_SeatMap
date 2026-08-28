import { Controller, Get, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { ExportMovementsQueryDto } from './dto/export-movements-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { StalePositionsQueryDto } from './dto/stale-positions-query.dto';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Every report export is ADMIN-only — applied once here at the class
// level rather than repeating @Roles('ADMIN') on all six routes below.
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('movements')
  async exportMovements(
    @Query() query: ExportMovementsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportMovements(query);
    const filenamePart = query.type === 'CHECK_IN' ? 'entradas' : 'saidas';
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="relatorio-${filenamePart}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('occupancy-snapshot')
  async exportOccupancySnapshot(@Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportOccupancySnapshot();
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': 'attachment; filename="ocupacao-atual.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Get('top-products')
  async exportTopProducts(
    @Query() query: DateRangeQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportTopProducts(query);
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': 'attachment; filename="relatorio-produtos-mais-movimentados.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Get('by-salesperson')
  async exportBySalesperson(
    @Query() query: DateRangeQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportBySalesperson(query);
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': 'attachment; filename="relatorio-por-vendedor.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Get('stale-positions')
  async exportStalePositions(
    @Query() query: StalePositionsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportStalePositions(query);
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': 'attachment; filename="relatorio-posicoes-paradas.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Get('activity-peaks')
  async exportActivityPeaks(
    @Query() query: DateRangeQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportActivityPeaks(query);
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': 'attachment; filename="relatorio-picos-atividade.xlsx"',
    });
    return new StreamableFile(buffer);
  }
}
