-- CreateTable
CREATE TABLE "RecognitionBadge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "RecognitionBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recognition" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,

    CONSTRAINT "Recognition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecognitionBadge_tenantId_name_key" ON "RecognitionBadge"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Recognition_tenantId_createdAt_idx" ON "Recognition"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Recognition_receiverId_idx" ON "Recognition"("receiverId");

-- CreateIndex
CREATE INDEX "Recognition_senderId_idx" ON "Recognition"("senderId");

-- AddForeignKey
ALTER TABLE "RecognitionBadge" ADD CONSTRAINT "RecognitionBadge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "RecognitionBadge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
