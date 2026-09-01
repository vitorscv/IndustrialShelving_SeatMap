import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ImportProductsResult {
  created: number;
  skipped: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  // Same case-insensitive duplicate rule as the spreadsheet import, just
  // checked against the database directly (Postgres's native
  // mode: 'insensitive') instead of loading everything into memory, since
  // this is a single lookup rather than a whole-file batch.
  //
  // Uppercased before storing — the catalog exists to feed suggestions
  // into the check-in Produto field, which is itself always uppercase now,
  // so a mixed-case catalog entry would suggest text that gets silently
  // changed the moment it's selected. Keeping the catalog uppercase too
  // avoids that mismatch.
  async create(name: string) {
    const trimmed = name.trim().toUpperCase();
    const existing = await this.prisma.product.findFirst({
      where: { name: { equals: trimmed, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('A product with this name already exists');
    }
    return this.prisma.product.create({ data: { name: trimmed } });
  }

  // Duplicates are checked case-insensitively against BOTH what's already
  // in the database and what's already been queued for creation earlier in
  // this same import — so a name repeated three times in one spreadsheet
  // creates it once and reports the other two as skipped, and re-importing
  // an already-imported file skips everything.
  async importNames(rawNames: string[]): Promise<ImportProductsResult> {
    const existing = await this.prisma.product.findMany({ select: { name: true } });
    const knownKeys = new Set(existing.map((p) => p.name.toLowerCase()));

    const toCreate: string[] = [];
    let skipped = 0;

    for (const raw of rawNames) {
      const trimmed = raw.trim().toUpperCase();
      if (!trimmed) continue; // blank rows count toward neither total

      const key = trimmed.toLowerCase();
      if (knownKeys.has(key)) {
        skipped++;
      } else {
        knownKeys.add(key);
        toCreate.push(trimmed);
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.product.createMany({ data: toCreate.map((name) => ({ name })) });
    }

    return { created: toCreate.length, skipped };
  }
}
