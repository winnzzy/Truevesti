import type { Prisma } from "@prisma/client";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getReadinessChecks } from "../../lib/readiness.js";
import { runDailyAccruals } from "../../lib/accruals.js";
import { getUserBalance } from "../../lib/balances.js";
import { deleteUserByEmail } from "../../lib/delete-user.js";
import { sendError } from "../../lib/http-errors.js";
import { depositDecisionSchema, walletAddressSchema, walletAddressUpdateSchema } from "../../lib/manual-deposits.js";
import { requireAuth, requireRole, type AuthRequest } from "../../middleware/auth.js";

export const adminRouter = Router();

const planSchema = z.object({
  name: z.string().min(2),
  minDepositUsd: z.number().positive(),
  maxDepositUsd: z.number().positive(),
  durationDays: z.number().int().positive(),
  estimatedYieldMin: z.number().nonnegative(),
  estimatedYieldMax: z.number().nonnegative(),
  riskLevel: z.string().min(2),
  riskNote: z.string().max(2000).optional(),
  assetAllocation: z.string().min(2),
  supportedAssets: z.array(z.string()).min(1),
  isActive: z.boolean().optional()
});

function actorId(req: AuthRequest) {
  return req.user!.id;
}

/** No Render Shell needed — call from PowerShell with x-purge-secret header. */
adminRouter.post("/purge-user", async (req: Request, res: Response) => {
  const secret = process.env.ADMIN_PURGE_SECRET?.trim();
  const provided = req.header("x-purge-secret")?.trim();

  if (!secret || !provided || provided !== secret) {
    return sendError(res, 401, "Invalid or missing purge secret", { code: "PURGE_UNAUTHORIZED" });
  }

  try {
    const input = z.object({ email: z.string().email() }).parse(req.body);
    const result = await deleteUserByEmail(input.email);
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return sendError(res, 400, "Enter a valid email address", { code: "VALIDATION_ERROR" });
    }
    console.error(err);
    return sendError(res, 500, "Could not delete user", { code: "PURGE_FAILED" });
  }
});

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/overview", async (_req: Request, res: Response) => {
  const [users, pendingWithdrawals, pendingDeposits, activeInvestments, pendingKyc, openTickets] = await Promise.all([
    prisma.user.count(),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
    prisma.deposit.count({ where: { status: "PENDING" } }),
    prisma.investment.count({ where: { status: "ACTIVE" } }),
    prisma.kycCheck.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } })
  ]);
  res.json({ users, pendingWithdrawals, pendingDeposits, activeInvestments, pendingKyc, openTickets });
});

adminRouter.delete("/users/:id", async (req: AuthRequest, res: Response) => {
  const targetId = String(req.params.id);
  const adminId = actorId(req);

  if (targetId === adminId) {
    return sendError(res, 400, "Admins cannot delete their own account", { code: "CANNOT_DELETE_SELF" });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return sendError(res, 404, "User not found", { code: "USER_NOT_FOUND" });
  }

  if (target.role === "ADMIN") {
    return sendError(res, 403, "Cannot delete another admin account", { code: "CANNOT_DELETE_ADMIN" });
  }

  try {
    const result = await deleteUserByEmail(target.email);
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "ADMIN_DELETED_USER",
        entity: "User",
        entityId: targetId,
        metadata: { email: target.email },
        ipAddress: req.ip
      }
    });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return sendError(res, 500, "Could not delete user", { code: "DELETE_FAILED" });
  }
});

adminRouter.get("/users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
      profile: true,
      _count: { select: { investments: true, deposits: true, withdrawals: true, tickets: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  const withBalances = await Promise.all(users.map(async (user: typeof users[number]) => ({
    ...user,
    balance: await getUserBalance(user.id)
  })));
  res.json({ users: withBalances });
});

adminRouter.get("/audit-logs", async (_req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ logs });
});

adminRouter.get("/company-wallets", async (_req: Request, res: Response) => {
  const wallets = await prisma.companyWalletAddress.findMany({
    orderBy: [{ assetSymbol: "asc" }, { network: "asc" }]
  });
  res.json({ wallets });
});

adminRouter.post("/company-wallets", async (req: AuthRequest, res: Response) => {
  const input = walletAddressSchema.parse(req.body);
  const wallet = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const saved = await tx.companyWalletAddress.upsert({
      where: {
        assetSymbol_network: {
          assetSymbol: input.assetSymbol,
          network: input.network
        }
      },
      update: input,
      create: {
        ...input,
        isActive: input.isActive ?? true
      }
    });
    await tx.auditLog.create({
      data: {
        actorId: actorId(req),
        action: "COMPANY_WALLET_SAVED",
        entity: "CompanyWalletAddress",
        entityId: saved.id,
        ipAddress: req.ip
      }
    });
    return saved;
  });
  res.status(201).json({ wallet });
});

adminRouter.patch("/company-wallets/:id", async (req: AuthRequest, res: Response) => {
  const input = walletAddressUpdateSchema.parse(req.body);
  const wallet = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const saved = await tx.companyWalletAddress.update({
      where: { id: String(req.params.id) },
      data: input
    });
    await tx.auditLog.create({
      data: {
        actorId: actorId(req),
        action: "COMPANY_WALLET_UPDATED",
        entity: "CompanyWalletAddress",
        entityId: saved.id,
        ipAddress: req.ip
      }
    });
    return saved;
  });
  res.json({ wallet });
});

adminRouter.get("/deposits", async (_req: Request, res: Response) => {
  const deposits = await prisma.deposit.findMany({
    include: {
      user: { select: { email: true } },
      companyWallet: true
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json({ deposits });
});

adminRouter.get("/readiness", async (_req: Request, res: Response) => {
  const checks = getReadinessChecks();
  const criticalOpen = checks.filter((check) => !check.ok && check.severity === "critical").length;
  const warningsOpen = checks.filter((check) => !check.ok && check.severity === "warning").length;
  res.json({
    checks,
    summary: {
      criticalOpen,
      ready: criticalOpen === 0,
      warningsOpen
    }
  });
});

adminRouter.get("/plans", async (_req: Request, res: Response) => {
  const plans = await prisma.investmentPlan.findMany({ where: { deletedAt: null }, orderBy: { minDepositUsd: "asc" } });
  res.json({ plans });
});

adminRouter.delete("/plans/:id", async (req: AuthRequest, res: Response) => {
  const planId = String(req.params.id);

  const plan = await prisma.investmentPlan.findUnique({
    where: { id: planId },
    include: { investments: { select: { status: true } } }
  });

  if (!plan) {
    return sendError(res, 404, "Plan not found", { code: "PLAN_NOT_FOUND" });
  }

  if (plan.deletedAt) {
    return sendError(res, 400, "Plan is already deleted", { code: "PLAN_ALREADY_DELETED" });
  }

  const hasActiveInvestments = plan.investments.some((inv: { status: string }) => inv.status === "ACTIVE");
  if (hasActiveInvestments) {
    return sendError(res, 400, "Cannot delete plan with active investments. Disable it instead.", { code: "PLAN_HAS_ACTIVE_INVESTMENTS" });
  }

  const deleted = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.investmentPlan.update({
      where: { id: planId },
      data: { deletedAt: new Date(), isActive: false }
    });
    await tx.auditLog.create({
      data: {
        actorId: actorId(req),
        action: "INVESTMENT_PLAN_DELETED",
        entity: "InvestmentPlan",
        entityId: updated.id,
        metadata: { name: plan.name },
        ipAddress: req.ip
      }
    });
    return updated;
  });

  res.json({ plan: deleted });
});

adminRouter.post("/plans", async (req: AuthRequest, res: Response) => {
  const input = planSchema.parse(req.body);
  const plan = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.investmentPlan.create({ data: { ...input, isActive: input.isActive ?? true } });
    await tx.auditLog.create({
      data: {
        actorId: actorId(req),
        action: "INVESTMENT_PLAN_CREATED",
        entity: "InvestmentPlan",
        entityId: created.id,
        ipAddress: req.ip
      }
    });
    return created;
  });
  res.status(201).json({ plan });
});

adminRouter.patch("/plans/:id", async (req: AuthRequest, res: Response) => {
  const input = planSchema.partial().parse(req.body);
  const plan = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.investmentPlan.update({ where: { id: String(req.params.id) }, data: input });
    await tx.auditLog.create({
      data: {
        actorId: actorId(req),
        action: "INVESTMENT_PLAN_UPDATED",
        entity: "InvestmentPlan",
        entityId: updated.id,
        ipAddress: req.ip
      }
    });
    return updated;
  });
  res.json({ plan });
});

adminRouter.get("/investments", async (_req: Request, res: Response) => {
  const investments = await prisma.investment.findMany({
    include: {
      user: { select: { email: true, profile: true } },
      plan: true
    },
    orderBy: { startedAt: "desc" },
    take: 100
  });
  res.json({ investments });
});

adminRouter.patch("/deposits/:id/decision", async (req: AuthRequest, res: Response) => {
  const input = depositDecisionSchema.parse(req.body);
  const deposit = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.deposit.update({
      where: { id: String(req.params.id) },
      data: {
        status: input.status,
        txHash: input.status === "CONFIRMED" ? input.txHash : undefined,
        confirmations: input.status === "CONFIRMED" ? 1 : 0,
        confirmedAt: input.status === "CONFIRMED" ? new Date() : null,
        rejectionReason: input.status === "REJECTED" ? input.reason : null
      }
    });
    await tx.auditLog.create({
      data: {
        actorId: actorId(req),
        action: input.status === "CONFIRMED" ? "DEPOSIT_APPROVED" : "DEPOSIT_REJECTED",
        entity: "Deposit",
        entityId: updated.id,
        ipAddress: req.ip,
        metadata: input.status === "REJECTED" ? { reason: input.reason } : undefined
      }
    });
    await tx.notification.create({
      data: {
        userId: updated.userId,
        title: input.status === "CONFIRMED" ? "Deposit approved" : "Deposit rejected",
        body: input.status === "CONFIRMED"
          ? "Your deposit has been approved and added to your account balance."
          : `Your deposit was rejected: ${input.reason}`
      }
    });
    return updated;
  });
  res.json({ deposit });
});

adminRouter.get("/withdrawals", async (_req: Request, res: Response) => {
  const withdrawals = await prisma.withdrawal.findMany({
    include: {
      user: { select: { email: true, profile: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json({ withdrawals });
});

adminRouter.get("/kyc", async (_req: Request, res: Response) => {
  const checks = await prisma.kycCheck.findMany({
    include: { user: { select: { email: true, profile: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json({ checks });
});

adminRouter.patch("/kyc/:id/decision", async (req: AuthRequest, res: Response) => {
  const kycId = String(req.params.id);
  console.log("KYC approval requested:", kycId);

  const input = z.object({
    status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
    reason: z.string().max(1000).optional()
  }).parse(req.body);

  let kyc;
  try {
    kyc = await prisma.kycCheck.findUnique({ where: { id: kycId } });
  } catch (err) {
    console.error("KYC lookup error:", err);
    return sendError(res, 500, "Failed to look up KYC record", { code: "KYC_LOOKUP_FAILED" });
  }
  if (!kyc) {
    console.warn("KYC record not found for id:", kycId);
    return sendError(res, 404, "KYC record not found", { code: "KYC_NOT_FOUND" });
  }

  try {
    const check = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.kycCheck.update({ where: { id: kycId }, data: input });
      await tx.auditLog.create({
        data: {
          actorId: actorId(req),
          action: "KYC_STATUS_UPDATED",
          entity: "KycCheck",
          entityId: updated.id,
          metadata: { status: input.status, reason: input.reason },
          ipAddress: req.ip
        }
      });
      await tx.notification.create({
        data: {
          userId: updated.userId,
          title: "KYC status updated",
          body: `Your KYC status is now ${input.status}.`
        }
      });
      return updated;
    });
    res.json({ check });
  } catch (err) {
    console.error("KYC decision error:", err);
    if (err instanceof Error && err.message.includes("Record to update not found")) {
      return sendError(res, 404, "KYC record not found (concurrent delete?)", { code: "KYC_NOT_FOUND" });
    }
    return sendError(res, 500, "Failed to update KYC status", { code: "KYC_UPDATE_FAILED" });
  }
});

adminRouter.get("/support/tickets", async (_req: Request, res: Response) => {
  const tickets = await prisma.supportTicket.findMany({
    include: { user: { select: { email: true, profile: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json({ tickets });
});

adminRouter.patch("/support/tickets/:id", async (req: AuthRequest, res: Response) => {
  const input = z.object({
    status: z.string().min(2).max(40),
    adminResponse: z.string().min(3).max(4000)
  }).parse(req.body);
  const ticket = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.supportTicket.update({
      where: { id: String(req.params.id) },
      data: { ...input, respondedAt: new Date() }
    });
    await tx.auditLog.create({
      data: {
        actorId: actorId(req),
        action: "SUPPORT_TICKET_RESPONDED",
        entity: "SupportTicket",
        entityId: updated.id,
        ipAddress: req.ip
      }
    });
    await tx.notification.create({
      data: {
        userId: updated.userId,
        title: "Support ticket updated",
        body: "Operations has responded to your support ticket."
      }
    });
    return updated;
  });
  res.json({ ticket });
});

adminRouter.patch("/withdrawals/:id/decision", async (req: AuthRequest, res: Response) => {
  const input = z.discriminatedUnion("status", [
    z.object({ status: z.literal("APPROVED"), adminNote: z.string().max(1000).optional() }),
    z.object({ status: z.literal("REJECTED"), reason: z.string().min(3).max(1000) }),
    z.object({ status: z.literal("PAID"), txHash: z.string().min(8), adminNote: z.string().max(1000).optional() })
  ]).parse(req.body);

  const existing = await prisma.withdrawal.findUniqueOrThrow({ where: { id: String(req.params.id) } });
  if (input.status === "APPROVED") {
    const balance = await getUserBalance(existing.userId);
    if (Number(existing.amountUsd) > Number(balance.availableUsd)) {
      return res.status(400).json({ error: "Withdrawal exceeds available balance" });
    }
  }

  const withdrawal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.withdrawal.update({
      where: { id: String(req.params.id) },
      data: input.status === "APPROVED"
        ? { status: "APPROVED", approvedById: actorId(req), approvedAt: new Date(), adminNote: input.adminNote, processedAt: new Date() }
        : input.status === "REJECTED"
          ? { status: "REJECTED", rejectionReason: input.reason, processedAt: new Date() }
          : { status: "PAID", txHash: input.txHash, adminNote: input.adminNote, paidAt: new Date(), processedAt: new Date() }
    });
    await tx.auditLog.create({
      data: {
        actorId: actorId(req),
        action: `WITHDRAWAL_${input.status}`,
        entity: "Withdrawal",
        entityId: updated.id,
        metadata: input.status === "REJECTED" ? { reason: input.reason } : undefined,
        ipAddress: req.ip
      }
    });
    await tx.notification.create({
      data: {
        userId: updated.userId,
        title: input.status === "PAID" ? "Withdrawal paid" : input.status === "APPROVED" ? "Withdrawal approved" : "Withdrawal rejected",
        body: input.status === "PAID"
          ? "Your withdrawal has been marked as paid by operations."
          : input.status === "APPROVED"
            ? "Your withdrawal has been approved and is awaiting manual payout."
            : `Your withdrawal was rejected: ${input.reason}`
      }
    });
    return updated;
  });

  res.json({ withdrawal });
});

adminRouter.post("/run-accruals", async (req: AuthRequest, res: Response) => {
  try {
    const result = await runDailyAccruals();
    await prisma.auditLog.create({
      data: {
        actorId: actorId(req),
        action: "ACCRUALS_RUN",
        entity: "Investment",
        metadata: result,
        ipAddress: req.ip
      }
    });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});
