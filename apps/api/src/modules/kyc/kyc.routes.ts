import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { VerificationStatus } from "../../lib/verification-status.js";
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
  const parsed = z.object({
    reason: z.string().max(500).optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors
    });
  }
  const input = parsed.data;

  const check = await prisma.kycCheck.create({
    data: {
      userId: req.user!.id,
      provider: "manual",
      status: VerificationStatus.PENDING,
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

/* ── Full KYC submission endpoint ── */
kycRouter.post("/submit", requireAuth, requireEmailVerified, async (req: AuthRequest, res: Response) => {
  const parsed = z.object({
    fullName: z.string().trim().min(1, "Full name is required").max(200),
    dateOfBirth: z.string().trim().min(1, "Date of birth is required"),
    country: z.string().trim().min(1, "Country is required").max(100),
    address: z.string().trim().min(1, "Address is required").max(500),
    documentType: z.enum(["passport", "national_id", "drivers_license"]),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const input = parsed.data;

    // Check if user already has a pending KYC
    const existingPending = await prisma.kycCheck.findFirst({
      where: {
        userId: req.user!.id,
        status: VerificationStatus.PENDING
      }
    });

    if (existingPending) {
      return res.status(409).json({
        error: "You already have a pending KYC submission",
        code: "KYC_ALREADY_PENDING"
      });
    }

    // Store KYC submission with personal info as JSON metadata in reason field
    const metadata = JSON.stringify({
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth,
      country: input.country,
      address: input.address,
      documentType: input.documentType,
      submittedAt: new Date().toISOString()
    });

    const check = await prisma.kycCheck.create({
      data: {
        userId: req.user!.id,
        provider: "manual",
        status: VerificationStatus.PENDING,
        reason: metadata
      }
    });

    // Update user profile with country if available
    await prisma.profile.upsert({
      where: { userId: req.user!.id },
      update: { country: input.country },
      create: {
        userId: req.user!.id,
        firstName: input.fullName.split(" ")[0] || "",
        lastName: input.fullName.split(" ").slice(1).join(" ") || "",
        country: input.country,
        timezone: "Africa/Lagos"
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        title: "KYC Verification Submitted",
        body: "Your identity verification documents have been submitted and are pending review. This usually takes 1-3 business days."
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "KYC_SUBMITTED",
        entity: "KycCheck",
        entityId: check.id,
        ipAddress: req.ip
      }
    });

    return res.status(201).json({ check });
  } catch (err) {
    return res.status(500).json({ error: "Invalid submission data", details: err instanceof Error ? err.message : "Unknown error" });
  }
});
