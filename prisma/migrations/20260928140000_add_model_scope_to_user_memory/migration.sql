-- AlterTable (additive: existing rows keep NULL = global memory)
ALTER TABLE "UserMemory" ADD COLUMN "modelScope" TEXT;

-- CreateIndex
CREATE INDEX "UserMemory_userId_modelScope_updatedAt_idx" ON "UserMemory"("userId", "modelScope", "updatedAt");
