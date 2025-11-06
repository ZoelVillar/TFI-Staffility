-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "numEmployees" INTEGER NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_companyName_key" ON "companies"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "companies_contactEmail_key" ON "companies"("contactEmail");
