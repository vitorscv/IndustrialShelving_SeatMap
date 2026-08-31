-- CreateTable
CREATE TABLE "MovementDeletionLog" (
    "id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedByUserId" TEXT NOT NULL,
    "deletedByUsername" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "deletedRecordSnapshot" JSONB NOT NULL,

    CONSTRAINT "MovementDeletionLog_pkey" PRIMARY KEY ("id")
);
