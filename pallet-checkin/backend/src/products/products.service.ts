import { Injectable } from '@nestjs/common';
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
      const trimmed = raw.trim();
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
