import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireEmailVerified, type AuthRequest } from "../../middleware/auth.js";

export const kycRouter = Router();

kycRouter.get("/status", requireAuth, requireEmailVerified, async (req: AuthRequest, res: Response) => {
  const checks = await prisma.kycCheck.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  res.json({ checks, current: checks[0] ?? null });
});

kycRouter.post("/manual", requireAuth, requireEmailVerified, async (req: AuthRequest, res: Response) => {
  const input = z.object({
    reason: z.string().max(500).optional()
  }).parse(req.body);

  const check = await prisma.kycCheck.create({
    data: {
      userId: req.user!.id,
      provider: "manual",
      status: "PENDING",
      reason: input.reason || "User requested KYC review"
    }
  });

  await prisma.notification.create({
    data: {
      userId: req.user!.id,
      title: "KYC review queued",
      body: "Your identity review is pending manual compliance approval."
    }
  });

  res.status(201).json({ check });
});
