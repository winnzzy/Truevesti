import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getReadinessChecks } from "../../lib/readiness.js";
import { runDailyAccruals } from "../../lib/accruals.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/overview", async (_req, res) => {
  const [users, pendingWithdrawals, pendingKyc, openTickets] = await Promise.all([
    prisma.user.count(),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
    prisma.kycCheck.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } })
  ]);
  res.json({ users, pendingWithdrawals, pendingKyc, openTickets });
});

adminRouter.get("/audit-logs", async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ logs });
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

adminRouter.post("/run-accruals", async (_req, res) => {
  try {
    const result = await runDailyAccruals();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});
