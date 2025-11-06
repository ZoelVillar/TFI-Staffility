-- CreateEnum
CREATE TYPE "CampaignScope" AS ENUM ('ALL', 'TEAMS');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "CampaignScope" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_target_teams" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_target_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scoreTotal" DECIMAL(5,2) NOT NULL,
    "answers" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_companyId_status_idx" ON "campaigns"("companyId", "status");

-- CreateIndex
CREATE INDEX "campaigns_companyId_startDate_idx" ON "campaigns"("companyId", "startDate");

-- CreateIndex
CREATE INDEX "campaigns_companyId_endDate_idx" ON "campaigns"("companyId", "endDate");

-- CreateIndex
CREATE INDEX "campaign_target_teams_teamId_idx" ON "campaign_target_teams"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_target_teams_campaignId_teamId_key" ON "campaign_target_teams"("campaignId", "teamId");

-- CreateIndex
CREATE INDEX "survey_responses_campaignId_idx" ON "survey_responses"("campaignId");

-- CreateIndex
CREATE INDEX "survey_responses_userId_idx" ON "survey_responses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_campaignId_userId_key" ON "survey_responses"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_target_teams" ADD CONSTRAINT "campaign_target_teams_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_target_teams" ADD CONSTRAINT "campaign_target_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
