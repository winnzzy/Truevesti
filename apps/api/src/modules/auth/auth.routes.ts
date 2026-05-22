import jwt from "jsonwebtoken";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { env } from "../../lib/env.js";
import { prisma } from "../../lib/prisma.js";
import { sendEmail } from "../../lib/email-provider.js";
import { signAccessToken, signRefreshToken } from "../../lib/tokens.js";
import { hashPassword, verifyPassword, hashSecret, verifySecret } from "../../lib/password.js";
import { createAndSendSignupOtp, verifySignupOtp, SIGNUP_OTP_PURPOSE } from "../../lib/otp.js";
import { handleRouteError, sendError } from "../../lib/http-errors.js";
import { requireAuth, type AuthRequest } from "../../middleware/auth.js";
import { otpRateLimiter } from "../../middleware/otp-rate-limit.js";

export const authRouter = Router();

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

const signupSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(2, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  password: passwordSchema,
  acceptedRisk: z.boolean().optional().default(true)
});

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address")
});

const verifyOtpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code")
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required")
});

async function createSession(req: AuthRequest, user: { id: string; role: string }) {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: "pending",
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, session.id);

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: await hashSecret(refreshToken) }
  });

  return { accessToken, refreshToken };
}

const signupHandler = async (req: Request, res: Response) => {
  try {
    const input = signupSchema.parse(req.body);
    if (!input.acceptedRisk) {
      return sendError(res, 400, "Risk consent is required", { code: "RISK_CONSENT_REQUIRED" });
    }

    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, 409, "An account with this email already exists", { code: "EMAIL_EXISTS" });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        riskConsentAt: new Date(),
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            timezone: "Africa/Lagos"
          }
        },
        kycChecks: { create: { provider: "manual" } },
        consents: { create: { type: "RISK_DISCLOSURE", version: "2026-05", ipAddress: req.ip } },
        auditLogs: { create: { action: "USER_REGISTERED", entity: "User", ipAddress: req.ip } }
      }
    });

    let expiresAt: Date;
    try {
      ({ expiresAt } = await createAndSendSignupOtp(user.id, user.email, env.OTP_EXPIRY_MINUTES));
    } catch (otpErr) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw otpErr;
    }

    return res.status(201).json({
      message: "Account created. Check your email for a 6-digit verification code.",
      email: user.email,
      otpSent: true,
      expiresAt: expiresAt.toISOString()
    });
  } catch (err) {
    return handleRouteError(res, err);
  }
};

authRouter.post("/signup", otpRateLimiter, signupHandler);
authRouter.post("/register", otpRateLimiter, signupHandler);

authRouter.post("/otp/verify", async (req, res) => {
  try {
    const input = verifyOtpSchema.parse(req.body);
    const result = await verifySignupOtp(input.email, input.code);

    if (!result.ok) {
      return sendError(res, 400, result.error, { code: "INVALID_OTP" });
    }

    return res.json({
      message: "Email verified successfully. You can now sign in.",
      verified: true
    });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

authRouter.post("/otp/resend", otpRateLimiter, async (req, res) => {
  try {
    const input = emailSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.json({
        message: "If an account exists for this email, a new verification code has been sent."
      });
    }

    if (user.emailVerifiedAt) {
      return sendError(res, 400, "This email is already verified. Please sign in.", { code: "ALREADY_VERIFIED" });
    }

    await prisma.otpCode.updateMany({
      where: { userId: user.id, purpose: SIGNUP_OTP_PURPOSE, consumedAt: null },
      data: { consumedAt: new Date() }
    });

    const { expiresAt } = await createAndSendSignupOtp(user.id, user.email, env.OTP_EXPIRY_MINUTES);

    return res.json({
      message: "A new verification code has been sent to your email.",
      email: user.email,
      otpSent: true,
      expiresAt: expiresAt.toISOString()
    });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: { select: { firstName: true, lastName: true } } }
    });

    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      return sendError(res, 401, "Invalid email or password", { code: "INVALID_CREDENTIALS" });
    }

    if (!user.emailVerifiedAt) {
      return sendError(res, 403, "Verify your email before signing in.", {
        code: "EMAIL_NOT_VERIFIED",
        email: user.email
      });
    }

    const tokens = await createSession(req, user);

    return res.json({
      message: "Signed in successfully",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: true,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName
      }
    });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            country: true,
            timezone: true
          }
        }
      }
    });

    if (!user) return sendError(res, 404, "User not found", { code: "USER_NOT_FOUND" });

    return res.json({
      user: {
        ...user,
        emailVerified: Boolean(user.emailVerifiedAt)
      }
    });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

authRouter.post("/refresh", async (req, res) => {
  try {
    const input = z.object({ refreshToken: z.string().min(1) }).parse(req.body);

    let payload: { sub: string; role: string; sid: string };
    try {
      payload = await new Promise<{ sub: string; role: string; sid: string }>((resolve, reject) => {
        jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET, (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded as { sub: string; role: string; sid: string });
        });
      });
    } catch {
      return sendError(res, 401, "Invalid refresh token", { code: "INVALID_REFRESH_TOKEN" });
    }

    const session = await prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return sendError(res, 401, "Refresh token is no longer valid", { code: "SESSION_EXPIRED" });
    }

    const isTokenValid = await verifySecret(input.refreshToken, session.refreshTokenHash);
    if (!isTokenValid) {
      return sendError(res, 401, "Invalid refresh token", { code: "INVALID_REFRESH_TOKEN" });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    if (!user.emailVerifiedAt) {
      return sendError(res, 403, "Verify your email before continuing.", { code: "EMAIL_NOT_VERIFIED" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, session.id);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: await hashSecret(refreshToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

authRouter.post("/logout", async (req, res) => {
  try {
    const input = z.object({ refreshToken: z.string().min(1) }).parse(req.body);

    try {
      const payload = await new Promise<{ sid: string }>((resolve, reject) => {
        jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET, (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded as { sid: string });
        });
      });

      await prisma.session.updateMany({
        where: { id: payload.sid, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    } catch {
      // Ignore invalid token on logout.
    }

    return res.json({ message: "Signed out successfully", ok: true });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

authRouter.post("/password/forgot", async (req, res) => {
  try {
    const input = emailSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (user) {
      await sendEmail({
        to: user.email,
        subject: "Reset your Truevesti password",
        html: "<p>Password reset is not yet enabled in the MVP. Contact support if you need help.</p>"
      });
    }
    return res.json({
      message: "If an account exists for this email, password reset instructions have been sent."
    });
  } catch (err) {
    return handleRouteError(res, err);
  }
});
