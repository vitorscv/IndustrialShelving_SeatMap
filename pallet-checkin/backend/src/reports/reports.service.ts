import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExportMovementsQueryDto } from './dto/export-movements-query.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { StalePositionsQueryDto } from './dto/stale-positions-query.dto';

const DEFAULT_STALE_MIN_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Monday-first order, matching how the task spec lists them
// ("Segunda..Domingo") — JS's own Date.getDay() is Sunday-first (0=Sun),
// so callers remap via (getDay() + 6) % 7 to index into this array.
const WEEKDAY_LABELS_MONDAY_FIRST = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];

function buildDateRangeFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
  };
}

const MOVEMENT_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'Data/Hora', key: 'timestamp', width: 20 },
  { header: 'Estante', key: 'shelf', width: 15 },
  { header: 'Nível', key: 'level', width: 8 },
  { header: 'Posição', key: 'number', width: 10 },
  { header: 'Pedido/Cliente', key: 'orderNumber', width: 22 },
  { header: 'Produto', key: 'product', width: 28 },
  { header: 'Quantidade', key: 'quantity', width: 12 },
  { header: 'Vendedor/Cidade', key: 'salesInfo', width: 28 },
];

const OCCUPANCY_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'Nível', key: 'level', width: 8 },
  { header: 'Número', key: 'number', width: 10 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Pedido/Cliente', key: 'orderNumber', width: 22 },
  { header: 'Produto', key: 'product', width: 28 },
  { header: 'Quantidade', key: 'quantity', width: 12 },
  { header: 'Vendedor/Cidade', key: 'salesInfo', width: 28 },
];

// Excel worksheet names can't contain : \ / ? * [ ] and top out at 31
// characters — shelf titles are free text (renameable from the Estantes
// page), so this is a real, not just theoretical, sanitization need.
function sanitizeSheetName(title: string): string {
  return title.replace(/[:\\/?*[\]]/g, '-').slice(0, 31) || 'Estante';
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportMovements(query: ExportMovementsQueryDto): Promise<Buffer> {
    const timestampFilter = buildDateRangeFilter(query.from, query.to);
    const where: Prisma.MovementWhereInput = {
      type: query.type,
      ...(timestampFilter ? { timestamp: timestampFilter } : {}),
    };

    const movements = await this.prisma.movement.findMany({
      where,
      include: { position: { include: { shelf: true } } },
      orderBy: { timestamp: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheetTitle = query.type === 'CHECK_IN' ? 'Entradas' : 'Saídas';
    const sheet = workbook.addWorksheet(sheetTitle);
    sheet.columns = MOVEMENT_COLUMNS;
    sheet.getRow(1).font = { bold: true };

    for (const movement of movements) {
      sheet.addRow({
        timestamp: movement.timestamp.toLocaleString('pt-BR'),
        shelf: movement.position.shelf.title,
        level: movement.position.level,
        number: movement.position.number,
        orderNumber: movement.orderNumber,
        product: movement.product,
        quantity: movement.quantity,
        salesInfo: movement.salesInfo,
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Captures the state at the moment of export (not historical) — one
  // sheet per shelf, every position listed, blank detail columns for FREE
  // positions since those fields are already null on the Position record.
  async exportOccupancySnapshot(): Promise<Buffer> {
    const shelves = await this.prisma.shelf.findMany({
      include: { positions: true },
      orderBy: { title: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const usedNames = new Set<string>();

    for (const shelf of shelves) {
      let sheetName = sanitizeSheetName(shelf.title);
      // Two shelves could sanitize to the same name (e.g. differing only by
      // a character the sanitizer strips) — ExcelJS throws on a duplicate
      // worksheet name, so disambiguate rather than let the whole export fail.
      let suffix = 2;
      while (usedNames.has(sheetName)) {
        sheetName = `${sanitizeSheetName(shelf.title).slice(0, 28)} (${suffix})`;
        suffix++;
      }
      usedNames.add(sheetName);

      const sheet = workbook.addWorksheet(sheetName);
      sheet.columns = OCCUPANCY_COLUMNS;
      sheet.getRow(1).font = { bold: true };

      const sortedPositions = [...shelf.positions].sort((a, b) =>
        a.level !== b.level ? a.level.localeCompare(b.level) : a.number - b.number,
      );

      for (const position of sortedPositions) {
        sheet.addRow({
          level: position.level,
          number: position.number,
          status: position.status,
          orderNumber: position.orderNumber,
          product: position.product,
          quantity: position.quantity,
          salesInfo: position.salesInfo,
        });
      }
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // JUDGMENT CALL (documented in the sheet itself, not just here): only
  // CHECK_IN movements count. A CHECK_OUT re-copies the same orderNumber/
  // product/quantity/salesInfo from the Position it's closing out (see
  // MovementsService.create), so counting both types here would double
  // every pallet's quantity — once for going in, once for the same
  // quantity coming back out — inflating "quanto desse produto realmente
  // movimentamos" rather than reflecting it.
  async exportTopProducts(query: DateRangeQueryDto): Promise<Buffer> {
    const timestampFilter = buildDateRangeFilter(query.from, query.to);
    const movements = await this.prisma.movement.findMany({
      where: {
        type: MovementType.CHECK_IN,
        ...(timestampFilter ? { timestamp: timestampFilter } : {}),
      },
      select: { product: true, quantity: true },
    });

    const byProduct = new Map<string, { count: number; quantity: number }>();
    for (const movement of movements) {
      const entry = byProduct.get(movement.product) ?? { count: 0, quantity: 0 };
      entry.count += 1;
      entry.quantity += movement.quantity;
      byProduct.set(movement.product, entry);
    }

    const rows = Array.from(byProduct.entries())
      .map(([product, stats]) => ({ product, ...stats }))
      .sort((a, b) => b.quantity - a.quantity);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Produtos mais movimentados');
    sheet.columns = [
      { header: 'Produto', key: 'product', width: 30 },
      { header: 'Total de Movimentações', key: 'count', width: 22 },
      { header: 'Quantidade Total', key: 'quantity', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };
    // Documented in the file itself, not just in code — whoever opens this
    // later (without reading the source) needs to know the counting rule.
    sheet.addRow([]);
    const noteRow = sheet.addRow(['Considera apenas movimentações de CHECK_IN (entradas).']);
    noteRow.font = { italic: true, color: { argb: 'FF888888' } };
    for (const row of rows) {
      sheet.addRow(row);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Same CHECK_IN-only rule as exportTopProducts, and for the identical
  // reason: a CHECK_OUT's salesInfo is copied from the Position (i.e. from
  // its own check-in), so it belongs to the same salesperson/sale — not a
  // second, independent one.
  async exportBySalesperson(query: DateRangeQueryDto): Promise<Buffer> {
    const timestampFilter = buildDateRangeFilter(query.from, query.to);
    const movements = await this.prisma.movement.findMany({
      where: {
        type: MovementType.CHECK_IN,
        ...(timestampFilter ? { timestamp: timestampFilter } : {}),
      },
      select: { salesInfo: true, quantity: true },
    });

    const bySalesperson = new Map<string, { count: number; quantity: number }>();
    for (const movement of movements) {
      const entry = bySalesperson.get(movement.salesInfo) ?? { count: 0, quantity: 0 };
      entry.count += 1;
      entry.quantity += movement.quantity;
      bySalesperson.set(movement.salesInfo, entry);
    }

    const rows = Array.from(bySalesperson.entries())
      .map(([salesInfo, stats]) => ({ salesInfo, ...stats }))
      .sort((a, b) => b.quantity - a.quantity);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Por vendedor-cidade');
    sheet.columns = [
      { header: 'Vendedor/Cidade', key: 'salesInfo', width: 32 },
      { header: 'Total de Movimentações', key: 'count', width: 22 },
      { header: 'Quantidade Total', key: 'quantity', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.addRow([]);
    const noteRow = sheet.addRow(['Considera apenas movimentações de CHECK_IN (entradas).']);
    noteRow.font = { italic: true, color: { argb: 'FF888888' } };
    for (const row of rows) {
      sheet.addRow(row);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // "Time since last check-in" reads directly from Position.updatedAt
  // rather than a separate Movement lookup: updateOccupancy() (called only
  // from MovementsService.create) is the ONLY code path that ever writes
  // to a Position, for both CHECK_IN and CHECK_OUT. A position can only be
  // OCCUPIED right now because its most recent write was a CHECK_IN — a
  // CHECK_OUT would have flipped it back to FREE. So for any currently
  // OCCUPIED position, updatedAt IS exactly its last check-in time, with
  // no extra query needed.
  async exportStalePositions(query: StalePositionsQueryDto): Promise<Buffer> {
    const minDays = query.minDays ?? DEFAULT_STALE_MIN_DAYS;
    const cutoff = new Date(Date.now() - minDays * MS_PER_DAY);

    const positions = await this.prisma.position.findMany({
      where: { status: 'OCCUPIED', updatedAt: { lte: cutoff } },
      include: { shelf: true },
    });

    const rows = positions
      .map((position) => ({
        shelf: position.shelf.title,
        level: position.level,
        number: position.number,
        orderNumber: position.orderNumber,
        product: position.product,
        quantity: position.quantity,
        daysStale: Math.floor((Date.now() - position.updatedAt.getTime()) / MS_PER_DAY),
        checkInDate: position.updatedAt.toLocaleString('pt-BR'),
      }))
      .sort((a, b) => b.daysStale - a.daysStale);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Posições paradas');
    sheet.columns = [
      { header: 'Estante', key: 'shelf', width: 15 },
      { header: 'Nível', key: 'level', width: 8 },
      { header: 'Posição', key: 'number', width: 10 },
      { header: 'Pedido/Cliente', key: 'orderNumber', width: 22 },
      { header: 'Produto', key: 'product', width: 28 },
      { header: 'Quantidade', key: 'quantity', width: 12 },
      { header: 'Dias parada', key: 'daysStale', width: 12 },
      { header: 'Data do check-in', key: 'checkInDate', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow(row);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Counts BOTH movement types (unlike top-products/by-salesperson) — a
  // CHECK_IN and its later CHECK_OUT are two genuinely separate real-world
  // events at two separate real timestamps, not a double-count of the same
  // quantity. Day/hour are read via local Date methods (getDay/getHours),
  // matching every other timestamp display already in this app (e.g.
  // toLocaleString('pt-BR') elsewhere) — none of them special-case a
  // timezone, so this doesn't either.
  async exportActivityPeaks(query: DateRangeQueryDto): Promise<Buffer> {
    const timestampFilter = buildDateRangeFilter(query.from, query.to);
    const movements = await this.prisma.movement.findMany({
      where: timestampFilter ? { timestamp: timestampFilter } : {},
      select: { timestamp: true },
    });

    const byWeekday = new Array(7).fill(0) as number[];
    const byHour = new Array(24).fill(0) as number[];
    for (const movement of movements) {
      const mondayFirstIndex = (movement.timestamp.getDay() + 6) % 7;
      byWeekday[mondayFirstIndex]++;
      byHour[movement.timestamp.getHours()]++;
    }

    const workbook = new ExcelJS.Workbook();

    const weekdaySheet = workbook.addWorksheet('Por dia da semana');
    weekdaySheet.columns = [
      { header: 'Dia da semana', key: 'label', width: 18 },
      { header: 'Total de Movimentações', key: 'count', width: 22 },
    ];
    weekdaySheet.getRow(1).font = { bold: true };
    WEEKDAY_LABELS_MONDAY_FIRST.forEach((label, index) => {
      weekdaySheet.addRow({ label, count: byWeekday[index] });
    });

    const hourSheet = workbook.addWorksheet('Por hora');
    hourSheet.columns = [
      { header: 'Hora', key: 'label', width: 10 },
      { header: 'Total de Movimentações', key: 'count', width: 22 },
    ];
    hourSheet.getRow(1).font = { bold: true };
    byHour.forEach((count, hour) => {
      hourSheet.addRow({ label: `${String(hour).padStart(2, '0')}h`, count });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
