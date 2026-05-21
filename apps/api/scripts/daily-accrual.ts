#!/usr/bin/env -S tsx
import runDailyAccruals from "../src/lib/accruals";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  try {
    const result = await runDailyAccruals(new Date());
    console.log("Daily accruals processed:", result);
    try {
      await prisma.auditLog.create({
        data: {
          action: "DAILY_ACCRUAL_RUN",
          entity: "Accrual",
          metadata: result as any
        }
      });
    } catch (logErr) {
      console.warn("Failed to write accrual audit log:", logErr);
    }
    process.exit(0);
  } catch (err) {
    console.error("Accrual run failed:", err);
    try {
      await prisma.auditLog.create({
        data: {
          action: "DAILY_ACCRUAL_RUN",
          entity: "Accrual",
          metadata: { error: String(err) }
        }
      });
    } catch {
      // ignore
    }
    process.exit(2);
  }
}

void main();
