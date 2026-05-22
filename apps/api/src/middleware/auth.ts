import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";

export type AuthRequest = Request & { user?: { id: string; role: string } };

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.header("authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing access token", code: "MISSING_TOKEN" });

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; role: string };
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token", code: "INVALID_TOKEN" });
  }
}

export async function requireEmailVerified(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Missing access token", code: "MISSING_TOKEN" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { emailVerifiedAt: true }
  });

  if (!user?.emailVerifiedAt) {
    return res.status(403).json({
      error: "Email verification is required before using this feature.",
      code: "EMAIL_NOT_VERIFIED"
    });
  }

  return next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

