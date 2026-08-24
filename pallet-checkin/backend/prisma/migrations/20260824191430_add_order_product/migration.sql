/*
  Warnings:

  - Added the required column `orderNumber` to the `Movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product` to the `Movement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Added nullable first so existing Movement rows (recorded before this
-- feature existed) can be backfilled instead of being lost.
ALTER TABLE "Movement" ADD COLUMN     "orderNumber" TEXT,
ADD COLUMN     "product" TEXT;

UPDATE "Movement" SET "orderNumber" = 'N/A', "product" = 'N/A' WHERE "orderNumber" IS NULL;

ALTER TABLE "Movement" ALTER COLUMN "orderNumber" SET NOT NULL,
ALTER COLUMN "product" SET NOT NULL;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "orderNumber" TEXT,
ADD COLUMN     "product" TEXT;
