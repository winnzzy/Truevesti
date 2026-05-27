import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getReadinessChecks } from "../../lib/readiness.js";
import { runDailyAccruals } from "../../lib/accruals.js";
import { deleteUserByEmail } from "../../lib/delete-user.js";
import { sendError } from "../../lib/http-errors.js";
import { depositDecisionSchema, walletAddressSchema, walletAddressUpdateSchema } from "../../lib/manual-deposits.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const adminRouter = Router();

/** No Render Shell needed — call from PowerShell with x-purge-secret header. */
adminRouter.post("/purge-user", async (req, res) => {
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

adminRouter.get("/overview", async (_req, res) => {
  const [users, pendingWithdrawals, pendingDeposits, pendingKyc, openTickets] = await Promise.all([
    prisma.user.count(),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
    prisma.deposit.count({ where: { status: "PENDING" } }),
    prisma.kycCheck.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } })
  ]);
  res.json({ users, pendingWithdrawals, pendingDeposits, pendingKyc, openTickets });
});

adminRouter.get("/audit-logs", async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ logs });
});

adminRouter.get("/company-wallets", async (_req, res) => {
  const wallets = await prisma.companyWalletAddress.findMany({
    orderBy: [{ assetSymbol: "asc" }, { network: "asc" }]
  });
  res.json({ wallets });
});

adminRouter.post("/company-wallets", async (req, res) => {
  const input = walletAddressSchema.parse(req.body);
  const wallet = await prisma.companyWalletAddress.upsert({
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
  res.status(201).json({ wallet });
});

adminRouter.patch("/company-wallets/:id", async (req, res) => {
  const input = walletAddressUpdateSchema.parse(req.body);
  const wallet = await prisma.companyWalletAddress.update({
    where: { id: req.params.id },
    data: input
  });
  res.json({ wallet });
});

adminRouter.get("/deposits", async (_req, res) => {
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

adminRouter.get("/readiness", async (_req, res) => {
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

adminRouter.post("/plans", async (req, res) => {
  const input = z.object({
    name: z.string().min(2),
    minDepositUsd: z.number().positive(),
    maxDepositUsd: z.number().positive(),
    durationDays: z.number().int().positive(),
    estimatedYieldMin: z.number().nonnegative(),
    estimatedYieldMax: z.number().nonnegative(),
    riskLevel: z.string(),
    assetAllocation: z.string(),
    supportedAssets: z.array(z.string()).min(1)
  }).parse(req.body);
  const plan = await prisma.investmentPlan.create({ data: input });
  res.status(201).json({ plan });
});

adminRouter.patch("/withdrawals/:id/decision", async (req, res) => {
  const input = z.object({ status: z.enum(["CONFIRMED", "REJECTED"]), riskDecision: z.string().optional() }).parse(req.body);
  const withdrawal = await prisma.withdrawal.update({
    where: { id: req.params.id },
    data: { status: input.status, riskDecision: input.riskDecision, processedAt: new Date() }
  });
  res.json({ withdrawal });
});

adminRouter.patch("/deposits/:id/decision", async (req, res) => {
  const input = depositDecisionSchema.parse(req.body);
  const deposit = await prisma.$transaction(async (tx) => {
    const updated = await tx.deposit.update({
      where: { id: req.params.id },
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
        action: input.status === "CONFIRMED" ? "DEPOSIT_APPROVED" : "DEPOSIT_REJECTED",
        entity: "Deposit",
        entityId: updated.id,
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

adminRouter.post("/run-accruals", async (_req, res) => {
  try {
    const result = await runDailyAccruals();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});
