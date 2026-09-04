import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ImportVendorsResult {
  created: number;
  skipped: number;
}

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.vendor.findMany({ orderBy: { name: 'asc' } });
  }

  // Same case-insensitive duplicate rule as ProductsService.create — checked
  // against the database directly (Postgres's native mode: 'insensitive')
  // as a friendly error, backstopped by the @unique constraint on name for
  // the exact-match (already-uppercased) case.
  //
  // Uppercased before storing since vendorId feeds directly into salesInfo
  // (`${vendor.name}/${cidade}`), which must stay consistent with the
  // uppercase convention already applied everywhere else on that field.
  async create(name: string) {
    const trimmed = name.trim().toUpperCase();
    const existing = await this.prisma.vendor.findFirst({
      where: { name: { equals: trimmed, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('A vendor with this name already exists');
    }
    return this.prisma.vendor.create({ data: { name: trimmed } });
  }

  // Same batch-import shape as ProductsService.importNames: duplicates are
  // checked case-insensitively against both what's already in the database
  // and what's already been queued for creation earlier in this import.
  async importNames(rawNames: string[]): Promise<ImportVendorsResult> {
    const existing = await this.prisma.vendor.findMany({ select: { name: true } });
    const knownKeys = new Set(existing.map((v) => v.name.toLowerCase()));

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
      await this.prisma.vendor.createMany({ data: toCreate.map((name) => ({ name })) });
    }

    return { created: toCreate.length, skipped };
  }
}
