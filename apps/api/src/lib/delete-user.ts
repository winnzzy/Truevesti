import { prisma } from "./prisma.js";

export async function deleteUserByEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user) {
    return { deleted: false as const, email: normalized, message: "No user found for this email" };
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

  return {
    deleted: true as const,
    email: normalized,
    userId: user.id,
    message: `Deleted user ${normalized}`
  };
}
