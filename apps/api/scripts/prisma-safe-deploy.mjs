#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const schemaPath = "prisma/schema.prisma";
const prismaBaseCommand = `npx prisma`;
const baselineMigrations = [
  "20260514222724_init",
  "20260520000000_add_support_ticket_message",
  "20260527000000_manual_deposit_wallets",
  "20260527001000_investments_withdrawals_admin",
  "20260530213100_add_approved_to_verification_status"
];

function runPrisma(args, label) {
  const cmd = `${prismaBaseCommand} ${[...args, "--schema", schemaPath].join(" ")}`;
  const result = spawnSync(cmd, {
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
    shell: true
  });

  if (result.error) {
    throw result.error;
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    const err = new Error(`${label} failed`);
    err.cause = result;
    throw err;
  }
}

function tryDeploy() {
  const result = spawnSync(`${prismaBaseCommand} migrate deploy --schema ${schemaPath}`, {
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
    shell: true
  });

  if (result.error) {
    throw result.error;
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result;
}

function looksLikeBaselineConflict(output) {
  return (
    output.includes("P3009") ||
    output.includes("P3018") ||
    output.includes("failed migrations") ||
    output.includes("Migration name: 20260514222724_init") ||
    output.includes('type "UserRole" already exists')
  );
}

function recoverBaselineHistory() {
  console.log("Detected Prisma migration history drift; applying non-destructive baseline recovery.");

  // Clear failed marker if present.
  try {
    runPrisma(["migrate", "resolve", "--rolled-back", "20260514222724_init"], "resolve rolled-back init");
  } catch {
    // If there is no failed row, continue with applied markers.
  }

  for (const migration of baselineMigrations) {
    runPrisma(["migrate", "resolve", "--applied", migration], `resolve applied ${migration}`);
  }
}

const deployResult = tryDeploy();
if (deployResult.status === 0) {
  process.exit(0);
}

const combinedOutput = `${deployResult.stdout ?? ""}\n${deployResult.stderr ?? ""}`;
if (!looksLikeBaselineConflict(combinedOutput)) {
  process.exit(deployResult.status ?? 1);
}

recoverBaselineHistory();
const retryResult = tryDeploy();
process.exit(retryResult.status ?? 1);
