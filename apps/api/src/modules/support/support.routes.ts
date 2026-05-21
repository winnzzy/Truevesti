import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../../middleware/auth.js";

export const supportRouter = Router();

const ticketSchema = z.object({
  message: z.string().min(10).max(4000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  subject: z.string().min(3).max(160)
});

supportRouter.get("/tickets", requireAuth, async (req: AuthRequest, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 25
  });
  res.json({ tickets });
});

supportRouter.post("/tickets", requireAuth, async (req: AuthRequest, res) => {
  const input = ticketSchema.parse(req.body);
  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        userId: req.user!.id,
        ...input
      }
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "SUPPORT_TICKET_CREATED",
        entity: "SupportTicket",
        entityId: created.id,
        ipAddress: req.ip
      }
    });
    await tx.notification.create({
      data: {
        userId: req.user!.id,
        title: "Support ticket received",
        body: "Our operations team has your request in the support queue."
      }
    });
    return created;
  });
  res.status(201).json({ ticket });
});
