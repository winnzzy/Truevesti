#!/usr/bin/env node
import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(scriptDir, "..", ".env") });
loadDotenv();

const databaseUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? "";
const nodeEnv = process.env.NODE_ENV ?? "development";

const isLocalhost = (value) => {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
};

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (nodeEnv === "production" && isLocalhost(databaseUrl)) {
  console.error("Refusing to run in production with localhost DATABASE_URL.");
  process.exit(1);
}

if (nodeEnv === "production" && !directUrl) {
  console.error("DIRECT_URL is required in production for safe Prisma migrations.");
  process.exit(1);
}

if (!directUrl) {
  console.warn("DIRECT_URL is not set; Prisma will reuse DATABASE_URL for migrations.");
}

if (isLocalhost(databaseUrl) && !process.env.ALLOW_LOCAL_DB) {
  console.warn("DATABASE_URL points to localhost. Set ALLOW_LOCAL_DB=1 to acknowledge local Prisma operations.");
}
