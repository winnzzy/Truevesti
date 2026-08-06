# Migration Fix Report

## Root Cause

Render was still executing a direct startup command:

`npx prisma generate && npx prisma migrate deploy && node dist/server.js`

The Neon database already contained baseline schema objects (`UserRole` enum and all core tables), while `_prisma_migrations` had a failed record for `20260514222724_init`. Prisma blocked new migrations with `P3009` before applying pending migrations.

## Why P3009 Happened

`_prisma_migrations` contained a failed row for `20260514222724_init`. Prisma `migrate deploy` refuses to continue when failed migrations are present.

## Why `UserRole` Already Existed

The initial schema had already been created in the database previously (during/import after migration from Render PostgreSQL), so replaying `20260514222724_init` attempted to recreate existing enums/tables.

## Why Migration History Became Inconsistent

Database schema state and migration metadata diverged during infrastructure migration. Schema existed, but migration history in `_prisma_migrations` did not represent that baseline correctly.

## Why Production Data Is Safe

The fix is non-destructive:
- no table drops
- no database reset
- no `prisma migrate reset`
- no destructive SQL
- only metadata repair with `prisma migrate resolve`
- additive enum migration remains in place (`NOT_SUBMITTED`)

## What Changed

1. Added Prisma datasource direct URL support for Neon migrations:
- [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)

2. Added `DIRECT_URL` handling in app env schema:
- [apps/api/src/lib/env.ts](apps/api/src/lib/env.ts)

3. Added env guard script for Prisma operations:
- [apps/api/scripts/check-prisma-env.mjs](apps/api/scripts/check-prisma-env.mjs)

4. Hardened startup and migration recovery scripts:
- [apps/api/scripts/prisma-safe-deploy.mjs](apps/api/scripts/prisma-safe-deploy.mjs)
- [apps/api/scripts/render-start.mjs](apps/api/scripts/render-start.mjs)

5. Updated npm scripts:
- [apps/api/package.json](apps/api/package.json)

6. Updated Render blueprint to use safe startup and include `DIRECT_URL`:
- [infra/render.yaml](infra/render.yaml)

7. Updated env template with Neon pooled/direct guidance:
- [apps/api/.env.example](apps/api/.env.example)

## Why Render Was Still Exiting With P3009

Render startup was bypassing the safe recovery path and running raw Prisma deploy directly. Raw deploy cannot recover a failed migration record by itself.

## How Future Deployments Work

Render startup now uses:

`npm run start --workspace apps/api`

which executes:
1. `prisma generate`
2. environment safety check (`DATABASE_URL` / `DIRECT_URL`)
3. safe migration deploy and baseline recovery
4. API startup

If baseline drift is detected (`P3009` / failed init history), startup performs non-destructive migration history repair then retries deploy.

## Verification Status

Executed locally:
- `npm install`
- `npm run build`
- `npx prisma validate`
- `npx prisma generate`

Local DB-backed startup, signup, login, and migration status checks require a reachable PostgreSQL instance and were blocked on this machine when the local database service was unavailable.

## Exact Manual Action (if Render service has custom Start Command override)

Set Render start command to:

`npm run start --workspace apps/api`

Set environment variables:
- `DATABASE_URL=<Neon pooled URL>`
- `DIRECT_URL=<Neon direct URL>`

## Exact Recovery Commands (Non-destructive)

Run in Render shell at `apps/api` if a failed baseline row remains:

```bash
npx prisma migrate resolve --rolled-back 20260514222724_init --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260514222724_init --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260520000000_add_support_ticket_message --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260527000000_manual_deposit_wallets --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260527001000_investments_withdrawals_admin --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260530213100_add_approved_to_verification_status --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma
```

These commands repair migration metadata and do not remove existing application data.
