-- Ensure signup's initial KYC state exists in PostgreSQL enum.
ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'NOT_SUBMITTED' BEFORE 'PENDING';