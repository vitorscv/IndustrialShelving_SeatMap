import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeForSearch } from '../common/normalize';

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

  // Case/accent-insensitive duplicate check, shared by create() and
  // update() — Postgres's own `mode: 'insensitive'` only covers case, not
  // accents (e.g. "JÚNIOR" vs "JUNIOR" would otherwise count as
  // different), so this compares in JS via the same normalizeForSearch
  // helper already used to match vendor names during check-in (see
  // MovementsService.create). `excludeId` lets update() skip the vendor's
  // own current row when checking for a collision against a NEW name.
  private async findDuplicate(name: string, excludeId?: string) {
    const normalizedTarget = normalizeForSearch(name);
    const vendors = await this.prisma.vendor.findMany({ select: { id: true, name: true } });
    return vendors.find(
      (vendor) => vendor.id !== excludeId && normalizeForSearch(vendor.name) === normalizedTarget,
    );
  }

  // Uppercased before storing since vendorId feeds directly into salesInfo
  // (`${vendor.name}/${cidade}`), which must stay consistent with the
  // uppercase convention already applied everywhere else on that field.
  async create(name: string) {
    const trimmed = name.trim().toUpperCase();
    const existing = await this.findDuplicate(trimmed);
    if (existing) {
      throw new ConflictException('A vendor with this name already exists');
    }
    return this.prisma.vendor.create({ data: { name: trimmed } });
  }

  // Renames a catalog vendor (fixing a typo, say) — a plain update on the
  // Vendor row's own name column. Every Position/Movement that references
  // this vendor does so via the stable vendorId FK, never by name, so this
  // never needs to touch (or even look at) those tables: the linkage is
  // unaffected, and every "live" read (Resumo atual, vendor detail page)
  // picks up the new name automatically on its next query. The already-
  // stored salesInfo text on those rows is a snapshot taken at check-in
  // time, though, and deliberately does NOT get rewritten here — see
  // MovementsService.create's comments on why salesInfo is frozen text.
  async update(id: string, name: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new NotFoundException(`Vendor ${id} not found`);
    }

    const trimmed = name.trim().toUpperCase();
    const duplicate = await this.findDuplicate(trimmed, id);
    if (duplicate) {
      throw new ConflictException('A vendor with this name already exists');
    }

    return this.prisma.vendor.update({ where: { id }, data: { name: trimmed } });
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
