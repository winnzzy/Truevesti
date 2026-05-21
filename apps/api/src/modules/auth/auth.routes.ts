import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../lib/env.js";
import { prisma } from "../../lib/prisma.js";
import { sendEmail } from "../../lib/email-provider.js";
import { signAccessToken, signRefreshToken } from "../../lib/tokens.js";
import { requireAuth, type AuthRequest } from "../../middleware/auth.js";

export const authRouter = Router();

// OAuth provider configuration and routes removed to simplify signup flow.
// The API now supports email/password registration and login only.

const otpPurpose = z.enum(["PHONE_VERIFY", "LOGIN_2FA", "SIGNUP_VERIFY"]);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  acceptedRisk: z.boolean()
});

authRouter.post("/register", async (req, res) => {
  const input = registerSchema.parse(req.body);
  if (!input.acceptedRisk) return res.status(400).json({ error: "Risk consent is required" });

  const passwordHash = await argon2.hash(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      riskConsentAt: new Date(),
      profile: {
        create: {
          firstName: input.firstName,
          lastName: input.lastName,
          country: input.country,
          timezone: "Africa/Lagos"
        }
      },
      kycChecks: { create: { provider: "manual" } },
      consents: { create: { type: "RISK_DISCLOSURE", version: "2026-05", ipAddress: req.ip } },
      auditLogs: { create: { action: "USER_REGISTERED", entity: "User", ipAddress: req.ip } }
    }
  });

  const signupCode = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      purpose: "SIGNUP_VERIFY",
      codeHash: await argon2.hash(signupCode),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  await sendEmail({
    to: user.email,
    subject: "Your Truevesti verification code",
    html: `<p>Welcome to Truevesti.</p><p>Verify your email with code <strong>${signupCode}</strong>.</p>`
  });

  res.status(201).json({ id: user.id, email: user.email, otpSent: true });
});

authRouter.post("/login", async (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, input.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: "rotated-after-token-issued",
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, session.id);
  await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: await argon2.hash(refreshToken) } });

  res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, emailVerified: Boolean(user.emailVerifiedAt) } });
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
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

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

authRouter.post("/refresh", async (req, res) => {
  const input = z.object({ refreshToken: z.string() }).parse(req.body);

  let payload: { sub: string; role: string; sid: string };
  try {
    payload = req.body.refreshToken && (await new Promise<{ sub: string; role: string; sid: string }>((resolve, reject) => {
      jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as { sub: string; role: string; sid: string });
      });
    }));
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const session = await prisma.session.findUnique({ where: { id: payload.sid } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return res.status(401).json({ error: "Refresh token is no longer valid" });
  }

  const isTokenValid = await argon2.verify(session.refreshTokenHash, input.refreshToken);
  if (!isTokenValid) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, session.id);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: await argon2.hash(refreshToken),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });

  res.json({ accessToken, refreshToken });
});

authRouter.post("/logout", async (req, res) => {
  const input = z.object({ refreshToken: z.string() }).parse(req.body);

  try {
    const payload = await new Promise<{ sid: string }>((resolve, reject) => {
      jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as { sid: string });
      });
    });

    await prisma.session.updateMany({ where: { id: payload.sid, revokedAt: null }, data: { revokedAt: new Date() } });
  } catch {
    // Ignore invalid token on logout to avoid leaking session state.
  }

  res.json({ ok: true });
});

authRouter.post("/otp/request", async (req, res) => {
  const input = z.object({ email: z.string().email(), purpose: otpPurpose }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { email: input.email.toLowerCase() } });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      purpose: input.purpose,
      codeHash: await argon2.hash(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });
  await sendEmail({ to: user.email, subject: "Your Truevesti verification code", html: `<p>Your code is ${code}</p>` });
  res.json({ ok: true });
});

authRouter.post("/otp/verify", async (req, res) => {
  const input = z.object({ email: z.string().email(), code: z.string().length(6), purpose: otpPurpose }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { email: input.email.toLowerCase() } });
  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, purpose: input.purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  if (!otp || !(await argon2.verify(otp.codeHash, input.code))) return res.status(400).json({ error: "Invalid code" });

  await prisma.$transaction(async (tx) => {
    await tx.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    if (input.purpose === "SIGNUP_VERIFY") {
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }

    if (input.purpose === "PHONE_VERIFY") {
      await tx.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
    }
  });

  res.json({ ok: true });
});

authRouter.post("/password/forgot", async (req, res) => {
  const input = z.object({ email: z.string().email() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (user) {
    await sendEmail({
      to: user.email,
      subject: "Reset your Truevesti password",
      html: "<p>Use the secure password reset link generated by the email provider adapter.</p>"
    });
  }
  res.json({ ok: true });
});
