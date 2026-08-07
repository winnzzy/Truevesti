# Prisma Startup Advisory Lock Fix

## What happened

Render starts the API with `npm start`, which runs Prisma generate and then `prisma migrate deploy` before binding the HTTP port. On Neon, Prisma uses a Postgres advisory lock while deploying migrations so two migration runners do not change schema at the same time.

The startup failure was `P1002: Timed out trying to acquire a postgres advisory lock`. That means Prisma could not acquire the migration lock during boot, so the process exited before Express could listen on Render's port.

## What changed

`apps/api/scripts/prisma-safe-deploy.mjs` still checks required environment variables, still runs `prisma migrate deploy`, and still preserves the non-destructive baseline recovery for existing Neon schemas with out-of-sync Prisma migration history.

If the only deploy failure is the advisory-lock timeout (`P1002` or `Timed out trying to acquire a postgres advisory lock`), startup now logs a warning and continues so the API can boot. Non-lock schema errors still fail startup. Baseline drift errors such as `P3009`, `P3018`, failed migration history, or `type "UserRole" already exists` still run the existing recovery flow first.

After baseline recovery, a retry that only fails because of the advisory lock also continues startup.

## Why production data is safe

This fix does not reset the database, drop tables, delete migration history, or run destructive Prisma commands. The baseline recovery only marks known existing migrations as applied with `prisma migrate resolve`, which is intended for databases where the schema already exists but Prisma's migration metadata needs to be aligned.

An advisory-lock timeout does not mean the schema should be changed by force. It means another migration lock holder or stale lock condition prevented Prisma from entering the migration section during this boot attempt. The API can safely start against the existing production schema, and migrations can be retried on the next deploy or with a manual migration run.

## Required environment variables

- `DATABASE_URL`: Neon pooled connection URL for runtime API traffic.
- `DIRECT_URL`: Neon direct connection URL for Prisma CLI and migrations.

`apps/api/prisma/schema.prisma` must keep:

```prisma
url       = env("DATABASE_URL")
directUrl = env("DIRECT_URL")
```
