-- CreateIndex
CREATE INDEX "users_companyId_active_idx" ON "users"("companyId", "active");

-- CreateIndex
CREATE INDEX "users_companyId_name_idx" ON "users"("companyId", "name");
