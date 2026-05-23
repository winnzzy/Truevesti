import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] || "").toLowerCase().trim();

if (!email) {
  console.error("Usage: npx tsx scripts/delete-user-by-email.ts <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log(`No user found for ${email}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.withdrawal.deleteMany({ where: { userId: user.id } });
    await tx.deposit.deleteMany({ where: { userId: user.id } });
    await tx.investment.deleteMany({ where: { userId: user.id } });
    await tx.otpCode.deleteMany({ where: { userId: user.id } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.supportTicket.deleteMany({ where: { userId: user.id } });
    await tx.notification.deleteMany({ where: { userId: user.id } });
    await tx.consent.deleteMany({ where: { userId: user.id } });
    await tx.kycCheck.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.deleteMany({ where: { actorId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  });

  console.log(`Deleted user ${email} (${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
