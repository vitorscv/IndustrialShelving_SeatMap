// One-off data fix: UPPERCASEs orderNumber/product/salesInfo on Movement
// and Position (and, as a deliberate scope extension — see the report this
// script's output feeds — Product.name too, for consistency with the now
// always-uppercase Produto field/autocomplete). Run manually, once per
// environment:
//   npm run prisma:uppercase-text-fields           (dry run — prints the plan, changes nothing)
//   npm run prisma:uppercase-text-fields -- --apply (actually persists it)
//
// Never touches id/positionId/any foreign key — only the text columns
// listed above. No row is ever deleted; UPPER() on an already-uppercase
// (or already-NULL) value is a no-op, which is what makes this naturally
// idempotent — running it twice updates 0 rows the second time.
//
// Implemented as one set-based UPDATE per table (not a per-row loop), each
// scoped by a WHERE that only matches rows whose value differs from its
// own UPPER() — the same "single atomic statement, no intermediate
// per-row state" safety property used in renumber-positions.ts, just for
// a text-diff condition instead of a numeric range.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Target {
  table: string;
  // Column names exactly as they appear in the DB (Prisma's @map isn't
  // used anywhere in this schema, so these match the model field names).
  columns: string[];
}

const TARGETS: Target[] = [
  { table: 'Movement', columns: ['orderNumber', 'product', 'salesInfo'] },
  { table: 'Position', columns: ['orderNumber', 'product', 'salesInfo'] },
  { table: 'Product', columns: ['name'] },
];

const SAMPLE_SIZE = 5;

function diffWhereClause(columns: string[]): string {
  // NULL <> UPPER(NULL) evaluates to NULL (not TRUE) in Postgres, so
  // NULL-valued columns (Position's are nullable) never spuriously match —
  // exactly what we want, since UPPER(NULL) is NULL, nothing to change.
  return columns.map((c) => `"${c}" <> UPPER("${c}")`).join(' OR ');
}

function setClause(columns: string[]): string {
  return columns.map((c) => `"${c}" = UPPER("${c}")`).join(', ');
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(
    apply
      ? 'Modo: APLICANDO alterações.'
      : 'Modo: DRY RUN (nada será salvo — passe --apply para persistir).',
  );

  await prisma
    .$transaction(async (tx) => {
      for (const target of TARGETS) {
        const where = diffWhereClause(target.columns);
        const selectCols = ['id', ...target.columns].map((c) => `"${c}"`).join(', ');

        const affected: Array<Record<string, unknown>> = await tx.$queryRawUnsafe(
          `SELECT ${selectCols} FROM "${target.table}" WHERE ${where}`,
        );

        console.log(`\n${target.table}: ${affected.length} linha(s) com texto fora de UPPERCASE.`);

        if (affected.length === 0) {
          console.log('  já está tudo em UPPERCASE — nada a fazer.');
          continue;
        }

        console.log(`  Amostra (até ${SAMPLE_SIZE}):`);
        for (const row of affected.slice(0, SAMPLE_SIZE)) {
          const before = target.columns.map((c) => `${c}="${row[c]}"`).join(', ');
          const after = target.columns
            .map((c) => `${c}="${row[c] === null ? null : String(row[c]).toUpperCase()}"`)
            .join(', ');
          console.log(`    id=${row.id}`);
          console.log(`      antes: ${before}`);
          console.log(`      depois: ${after}`);
        }

        if (apply) {
          const count = await tx.$executeRawUnsafe(
            `UPDATE "${target.table}" SET ${setClause(target.columns)} WHERE ${where}`,
          );
          console.log(`  -> ${count} linha(s) atualizada(s).`);
        }
      }

      if (!apply) {
        // Rolls back — the SELECTs above never write anything, but this
        // makes "nothing was persisted" explicit and unconditional.
        throw new Error('DRY_RUN_NO_COMMIT');
      }
    })
    .catch((err) => {
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
