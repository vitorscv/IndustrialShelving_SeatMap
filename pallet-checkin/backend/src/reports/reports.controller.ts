import { Controller, Get, Param, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { ExportMovementsQueryDto } from './dto/export-movements-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { StalePositionsQueryDto } from './dto/stale-positions-query.dto';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// @Roles() now varies per route (used to be one blanket ADMIN-only
// applied at the class level) — VENDEDOR gets read-only access to
// summary/vendor-positions (Resumo atual and its detail page) but stays
// excluded from every historical .xlsx export below, same as OPERATOR.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Plain JSON, not a file download — powers the "Resumo atual" section at
  // the top of the Relatórios page, rendered live rather than exported.
  // ADMIN and VENDEDOR only — OPERATOR has no Relatórios screen at all.
  @Roles('ADMIN', 'VENDEDOR')
  @Get('summary')
  getSummary() {
    return this.reportsService.getSummary();
  }

  // Powers the vendor detail page reached by clicking a vendor-grouped
  // Resumo atual row — every currently occupied position linked to this
  // vendor, across all cities. Same ADMIN + VENDEDOR access as summary
  // above, since it's reached directly from that same row.
  @Roles('ADMIN', 'VENDEDOR')
  @Get('vendors/:vendorId/positions')
  getVendorPositions(@Param('vendorId') vendorId: string) {
    return this.reportsService.getVendorPositions(vendorId);
  }

  // Every export below stays ADMIN-only — full historical data out of
  // scope for VENDEDOR's strictly-current-state, read-only access.
  @Roles('ADMIN')
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

  @Roles('ADMIN')
  @Get('occupancy-snapshot')
  async exportOccupancySnapshot(@Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportOccupancySnapshot();
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': 'attachment; filename="ocupacao-atual.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Roles('ADMIN')
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

  @Roles('ADMIN')
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

  @Roles('ADMIN')
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

  @Roles('ADMIN')
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
