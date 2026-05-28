import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireEmailVerified, type AuthRequest } from "../../middleware/auth.js";

export const notificationRouter = Router();

notificationRouter.get("/", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  res.json({ notifications, unreadCount });
});

notificationRouter.patch("/:id/read", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });
  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }
  if (!notification.readAt) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() }
    });
  }
  res.json({ success: true });
});

notificationRouter.post("/read-all", requireAuth, requireEmailVerified, async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() }
  });
  res.json({ success: true });
});

