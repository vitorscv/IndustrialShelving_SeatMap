import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { parse as parseCsvSync } from 'csv-parse/sync';

// The first column is the product name; the first row is always treated as
// a header and skipped — documented convention (simpler and more
// predictable than trying to heuristically detect whether row 1 "looks
// like" a header).
function isCsv(file: Express.Multer.File): boolean {
  return file.originalname.toLowerCase().endsWith('.csv') || file.mimetype === 'text/csv';
}

function isXlsx(file: Express.Multer.File): boolean {
  const name = file.originalname.toLowerCase();
  return (
    name.endsWith('.xlsx') ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Rich text and formula cells come back as objects ({ richText: [...] }
  // or { formula, result }) rather than plain strings.
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result !== null && value.result !== undefined) {
      return String(value.result);
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
  }
  return String(value);
}

async function parseXlsx(file: Express.Multer.File): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    // Cast needed: exceljs resolves its own `Buffer` type against a
    // different (older) @types/node structural shape than this project's,
    // so TS treats them as incompatible nominal types even though this is
    // a real Buffer at runtime — `any` sidesteps the mismatch entirely.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(file.buffer as any);
  } catch {
    throw new BadRequestException('Could not read the uploaded file as a valid .xlsx spreadsheet');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const names: string[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header row
    names.push(cellToString(row.getCell(1).value));
  });
  return names;
}

function parseCsv(file: Express.Multer.File): string[] {
  let records: string[][];
  try {
    records = parseCsvSync(file.buffer, { skip_empty_lines: true, relax_column_count: true });
  } catch {
    throw new BadRequestException('Could not read the uploaded file as a valid .csv file');
  }
  return records.slice(1).map((row) => row[0] ?? '');
}

// Returns the raw first-column values, one per non-header row — the
// caller (ProductsService) is responsible for trimming, deduplicating and
// filtering blanks, exactly the same way regardless of source format.
export async function parseProductNames(file: Express.Multer.File): Promise<string[]> {
  if (isCsv(file)) return parseCsv(file);
  if (isXlsx(file)) return parseXlsx(file);
  throw new BadRequestException('Only .xlsx or .csv files are supported');
}
