#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function run(command, label) {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 1}`);
  }
}

run("npx prisma generate --schema prisma/schema.prisma", "prisma generate");
run("node scripts/prisma-safe-deploy.mjs", "safe migrate deploy");
run("node dist/server.js", "api startup");