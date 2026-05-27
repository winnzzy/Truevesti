ALTER TYPE "TransactionStatus" ADD VALUE 'APPROVED';
ALTER TYPE "TransactionStatus" ADD VALUE 'PAID';
ALTER TYPE "InvestmentStatus" ADD VALUE 'COMPLETED';

ALTER TABLE "InvestmentPlan" ADD COLUMN "riskNote" TEXT;
ALTER TABLE "Investment" ADD COLUMN "expectedReturnUsd" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Investment" ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "Withdrawal" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Withdrawal" ADD COLUMN "paidAt" TIMESTAMP(3);

ALTER TABLE "SupportTicket" ADD COLUMN "adminResponse" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "respondedAt" TIMESTAMP(3);
