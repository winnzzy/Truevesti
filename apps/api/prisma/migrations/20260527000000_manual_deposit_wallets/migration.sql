-- Company-controlled receiving wallets for manual crypto deposits.
CREATE TABLE "CompanyWalletAddress" (
    "id" TEXT NOT NULL,
    "assetSymbol" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyWalletAddress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyWalletAddress_assetSymbol_network_key" ON "CompanyWalletAddress"("assetSymbol", "network");

ALTER TABLE "Deposit" ADD COLUMN "companyWalletId" TEXT;
ALTER TABLE "Deposit" ADD COLUMN "proofUrl" TEXT;
ALTER TABLE "Deposit" ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_companyWalletId_fkey"
FOREIGN KEY ("companyWalletId") REFERENCES "CompanyWalletAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
