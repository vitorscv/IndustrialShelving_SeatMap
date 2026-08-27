-- Destructive migration: operatorName values on Movement are dropped with no
-- backfill (confirmed explicitly — this field's purpose changes from "who
-- performed the action" to "who made the sale / to which client", so the old
-- values aren't meaningful under the new field). Movement.salesInfo is NOT
-- NULL and the table already has rows, so it's added with a temporary
-- DEFAULT '' to satisfy them, then the default is dropped immediately so
-- future inserts must supply it explicitly (matching the Prisma schema,
-- which declares no default).

-- Movement: add salesInfo (temporarily defaulted, then required going forward), drop operatorName
ALTER TABLE "Movement" ADD COLUMN "salesInfo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Movement" ALTER COLUMN "salesInfo" DROP DEFAULT;
ALTER TABLE "Movement" DROP COLUMN "operatorName";

-- Position: salesInfo is nullable, same as quantity/orderNumber/product
ALTER TABLE "Position" ADD COLUMN "salesInfo" TEXT;
