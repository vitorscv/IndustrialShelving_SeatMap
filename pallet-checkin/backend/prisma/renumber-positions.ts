// One-off data fix: makes Position.number globally continuous across
// shelves instead of resetting to 1 per shelf. Estante 1 (1-36) is
// unchanged since it's first; Estante 2's 1-16 becomes 37-52, Estante 3's
// 1-10 becomes 53-62 — same offset applied to every level (A-E) of that
// shelf. Run manually, once:
//   npm run prisma:renumber-positions           (dry run — prints the plan, changes nothing)
//   npm run prisma:renumber-positions -- --apply (actually persists it)
//
// positionId (the Movement foreign key) is never touched — only
// Position.number changes, so every historical Movement keeps pointing at
// exactly the same row; only the number that row now displays changes.
//
// Each shelf is renumbered via a single set-based UPDATE (Prisma
// `updateMany` with `number: { increment }`), not a row-by-row loop — that
// is what actually rules out the unique([shelfId, level, number]) collision
// the task called out, and does so more strongly than a two-pass "shift to
// +1000 first" approach would: a single UPDATE statement has no
// intermediate per-row state for a later row to collide with in the first
// place. It's also safe regardless of shelf order, since each shelf's
// target range (37-52, 53-62) is disjoint from its OWN source range
// (1-16, 1-10) — the two shelves' numbers were never going to collide with
// each other either, since shelfId is part of the unique constraint.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RenumberPlan {
  shelfTitle: string;
  offset: number;
  // The expected number range BEFORE renumbering — used as a guard so
  // re-running this script after it already succeeded is a harmless no-op
  // instead of double-shifting.
  expectedMin: number;
  expectedMax: number;
}

const PLAN: RenumberPlan[] = [
  { shelfTitle: 'Estante 2', offset: 36, expectedMin: 1, expectedMax: 16 },
  { shelfTitle: 'Estante 3', offset: 52, expectedMin: 1, expectedMax: 10 },
];

const LEVEL_ORDER = ['A', 'B', 'C', 'D', 'E'];

async function main() {
  const apply = process.argv.includes('--apply');

  console.log(apply ? 'Modo: APLICANDO alterações.' : 'Modo: DRY RUN (nada será salvo — passe --apply para persistir).');

  await prisma.$transaction(async (tx) => {
    for (const step of PLAN) {
      const shelf = await tx.shelf.findFirst({ where: { title: step.shelfTitle } });
      if (!shelf) {
        throw new Error(`Estante não encontrada: ${step.shelfTitle}`);
      }

      const positions = await tx.position.findMany({
        where: { shelfId: shelf.id },
        orderBy: [{ level: 'asc' }, { number: 'asc' }],
      });

      // Guard against re-running this script after it already succeeded:
      // if every position already sits in the POST-renumbering range, this
      // shelf was already migrated — skip it instead of double-shifting.
      const allInTargetRange = positions.every(
        (p) => p.number >= step.expectedMin + step.offset && p.number <= step.expectedMax + step.offset,
      );
      const allInSourceRange = positions.every(
        (p) => p.number >= step.expectedMin && p.number <= step.expectedMax,
      );

      if (allInTargetRange) {
        console.log(`\n${step.shelfTitle}: já está no intervalo final (+${step.offset}) — nada a fazer.`);
        continue;
      }

      if (!allInSourceRange) {
        throw new Error(
          `${step.shelfTitle}: números fora do intervalo esperado ${step.expectedMin}-${step.expectedMax} e também fora do intervalo já renumerado — abortando, dados não batem com o esperado.`,
        );
      }

      console.log(`\n${step.shelfTitle} (offset +${step.offset}), ${positions.length} posições:`);
      const byLevel = new Map<string, typeof positions>();
      for (const p of positions) {
        byLevel.set(p.level, [...(byLevel.get(p.level) ?? []), p]);
      }
      for (const level of LEVEL_ORDER) {
        const levelPositions = byLevel.get(level);
        if (!levelPositions) continue;
        const mapping = levelPositions
          .map((p) => `${p.number}→${p.number + step.offset}`)
          .join(', ');
        console.log(`  Nível ${level}: ${mapping}`);
      }

      if (apply) {
        const result = await tx.position.updateMany({
          where: { shelfId: shelf.id },
          data: { number: { increment: step.offset } },
        });
        console.log(`  -> ${result.count} posições atualizadas.`);
      }
    }

    if (!apply) {
      // Rolls back the transaction — findMany reads above never write
      // anything, but this makes the "nothing was persisted" guarantee
      // explicit and unconditional rather than relying on that.
      throw new Error('DRY_RUN_NO_COMMIT');
    }
  }).catch((err) => {
    if (err instanceof Error && err.message === 'DRY_RUN_NO_COMMIT') {
      console.log('\n[dry run] Transação revertida de propósito — nenhuma alteração foi persistida.');
      return;
    }
    throw err;
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
