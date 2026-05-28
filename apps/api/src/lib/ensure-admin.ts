/**
 * ensure-admin.ts
 *
 * Automatically creates or promotes an admin user during server startup
 * when the required environment variables are set and ADMIN_AUTO_CREATE=true.
 *
 * Safe & idempotent:
 *  - skips gracefully if env vars are missing
 *  - never creates duplicates
 *  - only resets password when ADMIN_RESET_PASSWORD=true
 *  - never logs the password
 */

import bcrypt from "bcrypt";
import { prisma } from "./prisma.js";

const BCRYPT_ROUNDS = 12;

export async function ensureAdminUser(): Promise<void> {
  const enabled = process.env.ADMIN_AUTO_CREATE?.trim().toLowerCase();
  if (enabled !== "true") {
    console.log("ℹ️  Admin auto-create skipped (ADMIN_AUTO_CREATE is not 'true')");
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim() || "Admin";
  const resetPassword = process.env.ADMIN_RESET_PASSWORD?.trim().toLowerCase() === "true";

  if (!email || !password) {
    console.log("ℹ️  Admin auto-create skipped (ADMIN_EMAIL or ADMIN_PASSWORD missing)");
    return;
  }

  if (password.length < 8) {
    console.error("❌ Admin auto-create failed: ADMIN_PASSWORD must be at least 8 characters");
    return;
  }

  const [firstName, ...rest] = name.split(" ");
  const lastName = rest.join(" ") || "";

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // User exists — promote if needed, optionally reset password
    const shouldResetPassword = !existing.passwordHash || resetPassword;

    await prisma.user.update({
      where: { email },
      data: {
        role: "ADMIN",
        ...(shouldResetPassword ? { passwordHash } : {}),
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date()
      }
    });

    await prisma.profile.upsert({
      where: { userId: existing.id },
      create: { userId: existing.id, firstName, lastName, timezone: "Africa/Lagos" },
      update: { firstName, lastName }
    });

    console.log("✅ Admin user ensured (promoted/updated)");
  } else {
    // User does not exist — create
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN",
        emailVerifiedAt: new Date(),
        riskConsentAt: new Date(),
        profile: { create: { firstName, lastName, timezone: "Africa/Lagos" } }
      }
    });

    console.log("✅ Admin user ensured (created)");
  }
}