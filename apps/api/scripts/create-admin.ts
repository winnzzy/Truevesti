/**
 * create-admin.ts
 *
 * Creates or promotes an admin user from environment variables.
 *
 * Required env vars:
 *   ADMIN_EMAIL    — email for the admin account
 *   ADMIN_PASSWORD — password for the admin account
 *
 * Optional:
 *   ADMIN_NAME     — display name (defaults to "Admin")
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts
 */
import "dotenv/config";
import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim() || "Admin";

  if (!email) {
    console.error("❌ ADMIN_EMAIL env var is required");
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("❌ ADMIN_PASSWORD env var is required (min 8 characters)");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Promote to ADMIN if not already
    const updated = await prisma.user.update({
      where: { email },
      data: {
        role: "ADMIN" as UserRole,
        // Only update password if it was not previously set
        ...(existing.passwordHash ? {} : { passwordHash }),
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date()
      }
    });

    console.log(`✅ User ${updated.email} promoted to ADMIN (id: ${updated.id})`);

    // Ensure profile exists
    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.join(" ") || "";
    await prisma.profile.upsert({
      where: { userId: updated.id },
      create: { userId: updated.id, firstName, lastName, timezone: "Africa/Lagos" },
      update: { firstName, lastName }
    });
  } else {
    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.join(" ") || "";

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN" as UserRole,
        emailVerifiedAt: new Date(),
        riskConsentAt: new Date(),
        profile: { create: { firstName, lastName, timezone: "Africa/Lagos" } }
      }
    });

    console.log(`✅ Admin user created: ${user.email} (id: ${user.id})`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Failed to create admin:", err);
  prisma.$disconnect();
  process.exit(1);
});