import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getUserBalance(userId: string, client: DbClient = prisma) {
  const [deposits, activeInvestments, completedAccruals, lockedWithdrawals] = await Promise.all([
    client.deposit.aggregate({
      where: { userId, status: { in: ["CONFIRMED", "APPROVED"] } },
      _sum: { amountUsd: true }
    }),
    client.investment.aggregate({
      where: { userId, status: "ACTIVE" },
      _sum: { principalUsd: true }
    }),
    client.investment.aggregate({
      where: { userId, status: "COMPLETED" },
      _sum: { expectedReturnUsd: true }
    }),
    client.withdrawal.aggregate({
      where: { userId, status: { in: ["APPROVED", "PAID"] } },
      _sum: { amountUsd: true }
    })
  ]);

  const depositedUsd = Number(deposits._sum.amountUsd ?? 0);
  const activeInvestmentPrincipalUsd = Number(activeInvestments._sum.principalUsd ?? 0);
  const completedReturnUsd = Number(completedAccruals._sum.expectedReturnUsd ?? 0);
  const lockedWithdrawalUsd = Number(lockedWithdrawals._sum.amountUsd ?? 0);
  const availableUsd = depositedUsd - activeInvestmentPrincipalUsd + completedReturnUsd - lockedWithdrawalUsd;

  return {
    depositedUsd: depositedUsd.toFixed(2),
    activeInvestmentPrincipalUsd: activeInvestmentPrincipalUsd.toFixed(2),
    completedReturnUsd: completedReturnUsd.toFixed(2),
    lockedWithdrawalUsd: lockedWithdrawalUsd.toFixed(2),
    availableUsd: Math.max(0, availableUsd).toFixed(2)
  };
}
