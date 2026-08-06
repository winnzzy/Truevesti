# TrueVesti Production Incident Report (2026-08-07)

## Summary

Production deployment failed due to Prisma migration history drift after database migration from Render PostgreSQL to Neon.

Impact:
- Render startup command failed before API boot with Prisma migration errors.
- Signup failed and frontend showed generic "Something went wrong".

No destructive operations were used.
No tables were dropped.
No user data was deleted.

## Root Cause

1. Neon schema already had base objects (tables, enums, indexes) from prior database state/import.
2. Prisma migration metadata in Neon was out of sync, so deploy attempted to apply initial migration again.
3. Re-applying initial migration failed on existing enum/type, causing migration failure lock (P3009/P3018 behavior).
4. Signup attempted to create KYC status NOT_SUBMITTED, but Neon enum value was missing before the added enum migration.

## Why Render Failed

Render executed:
- npx prisma generate && npx prisma migrate deploy && node dist/server.js

When migration history was inconsistent in Neon, migrate deploy failed before server startup.

## Why Signup Failed

Signup creates a KycCheck row with status NOT_SUBMITTED.
Neon enum VerificationStatus did not include NOT_SUBMITTED before the corrective migration.
Prisma create then failed and route returned secure generic error response.

## Repository Repairs

### Migration Repair

Added non-destructive migration:
- apps/api/prisma/migrations/20260807090000_add_not_submitted_to_verification_status/migration.sql

SQL:
- ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'NOT_SUBMITTED' BEFORE 'PENDING';

### Deployment Safety Repair

Added startup-safe migration recovery script:
- apps/api/scripts/prisma-safe-deploy.mjs

Behavior:
1. Runs prisma migrate deploy.
2. If output matches known baseline drift signature (P3009/P3018/failed init already exists conflict), it performs non-destructive metadata recovery:
   - marks failed init as rolled back if present
   - marks known baseline migrations as applied
3. Retries prisma migrate deploy.

This avoids destructive actions and unblocks startup on migrated production databases.

### Startup Command Update

Updated API start script to use safe deploy wrapper:
- apps/api/package.json
  - start: node scripts/prisma-safe-deploy.mjs && node dist/server.js

### Docker Runtime Compatibility

Ensured runtime image includes scripts directory:
- apps/api/Dockerfile

### Structured Backend Error Logging

Replaced raw console error in route error helper with structured pino log payload while preserving secure client responses:
- apps/api/src/lib/http-errors.ts

## Migration History Diagnosis

Observed migration chain includes:
- 20260514222724_init
- 20260520000000_add_support_ticket_message
- 20260527000000_manual_deposit_wallets
- 20260527001000_investments_withdrawals_admin
- 20260530213100_add_approved_to_verification_status
- 20260807090000_add_not_submitted_to_verification_status

Failure reason matched duplicate object creation from initial migration against pre-existing schema.

## Environment and Config Verification

- Prisma CLI and client: 5.22.0
- Node local validation: v24.15.0
- API datasource uses DATABASE_URL in prisma/schema.prisma
- DIRECT_URL is not currently configured in schema
- Render env config file contains DATABASE_URL variable key in infra/render.yaml

## Validation Evidence (Local)

Successful:
- npm install
- npm run build
- npm run typecheck
- npx prisma validate --schema apps/api/prisma/schema.prisma
- npm run prisma:generate --workspace apps/api

Known non-blocking for this backend incident:
- npm run lint fails due pre-existing frontend lint errors unrelated to this Prisma/Neon issue.
- Local start requires running PostgreSQL at localhost:5432; current machine had no local DB daemon running.
- Docker daemon unavailable locally, so full local DB-backed startup and /health runtime validation could not be executed here.

## Production Recovery Checklist (Non-Destructive)

Run in Render Shell (apps/api working directory) against Neon production DB:

1. Check migration status:
- npx prisma migrate status --schema prisma/schema.prisma

2. Resolve historical baseline metadata as applied:
- npx prisma migrate resolve --applied 20260514222724_init --schema prisma/schema.prisma
- npx prisma migrate resolve --applied 20260520000000_add_support_ticket_message --schema prisma/schema.prisma
- npx prisma migrate resolve --applied 20260527000000_manual_deposit_wallets --schema prisma/schema.prisma
- npx prisma migrate resolve --applied 20260527001000_investments_withdrawals_admin --schema prisma/schema.prisma
- npx prisma migrate resolve --applied 20260530213100_add_approved_to_verification_status --schema prisma/schema.prisma

3. Apply pending migrations:
- npx prisma migrate deploy --schema prisma/schema.prisma

4. Verify enum values:
- npx prisma db execute --schema prisma/schema.prisma --stdin
- SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'VerificationStatus' ORDER BY e.enumsortorder;

Expected enum values include NOT_SUBMITTED, PENDING, VERIFIED, APPROVED, REJECTED.

## Render Deployment Action

Set Render start command to:
- npm run start --workspace apps/api

This uses the safe migration wrapper and keeps behavior production-safe for imported/migrated databases.

## Data Safety Statement

All changes are metadata-safe and additive:
- No DROP TABLE
- No DROP TYPE
- No DELETE/UPDATE of user business data
- No prisma migrate reset
- No force reset operations

## Future Recommendations

1. Keep prisma migrations fully versioned in git.
2. Standardize one-time baseline procedure whenever production DB is imported externally.
3. Consider adding DIRECT_URL for migration traffic and pooled DATABASE_URL for runtime if Neon topology requires strict separation.
4. Add an operational runbook for schema migration and rollback procedures.
5. Add backend integration test workflow against ephemeral PostgreSQL in CI.
