-- Destructive migration: palletCode values on both tables are dropped with
-- no backfill (confirmed explicitly — a handful of real check-ins lose
-- their pallet code). Movement.quantity is NOT NULL and the table already
-- has rows, so it's added with a temporary DEFAULT 0 to satisfy them, then
-- the default is dropped immediately so future inserts must supply it
-- explicitly (matching the Prisma schema, which declares no default).

-- Movement: add quantity (temporarily defaulted, then required going forward)
ALTER TABLE "Movement" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Movement" ALTER COLUMN "quantity" DROP DEFAULT;
ALTER TABLE "Movement" DROP COLUMN "palletCode";

-- Position: quantity is nullable, same as orderNumber/product
ALTER TABLE "Position" ADD COLUMN "quantity" INTEGER;
ALTER TABLE "Position" DROP COLUMN "palletCode";
