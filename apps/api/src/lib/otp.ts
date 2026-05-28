import { prisma } from "./prisma.js";
import { hashSecret, verifySecret } from "./password.js";
import { sendEmail } from "./email-provider.js";

export const SIGNUP_OTP_PURPOSE = "SIGNUP_VERIFY";
export const PASSWORD_RESET_OTP_PURPOSE = "PASSWORD_RESET";

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getOtpExpiryDate(expiryMinutes: number) {
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
}

export async function createAndSendSignupOtp(userId: string, email: string, expiryMinutes: number) {
  const code = generateOtpCode();
  const expiresAt = getOtpExpiryDate(expiryMinutes);

  await prisma.otpCode.create({
    data: {
      userId,
      purpose: SIGNUP_OTP_PURPOSE,
      codeHash: await hashSecret(code),
      expiresAt
    }
  });

  await sendEmail({
    to: email,
    subject: "Verify your Truevesti email",
    html: `
      <p>Welcome to Truevesti.</p>
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:0.2em;">${code}</p>
      <p>This code expires in ${expiryMinutes} minutes.</p>
      <p>If you did not create an account, you can ignore this email.</p>
    `
  });

  return { expiresAt };
}

export async function verifySignupOtp(email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return { ok: false as const, error: "No account found for this email" };
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      purpose: SIGNUP_OTP_PURPOSE,
      consumedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!otp) {
    return { ok: false as const, error: "Verification code expired or not found. Request a new code." };
  }

  const valid = await verifySecret(code, otp.codeHash);
  if (!valid) {
    return { ok: false as const, error: "Invalid verification code" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "EMAIL_VERIFIED",
        entity: "User",
        entityId: user.id
      }
    });
  });

  return { ok: true as const, userId: user.id };
}

export async function createAndSendPasswordResetOtp(userId: string, email: string, expiryMinutes: number) {
  const code = generateOtpCode();
  const expiresAt = getOtpExpiryDate(expiryMinutes);

  await prisma.otpCode.create({
    data: {
      userId,
      purpose: PASSWORD_RESET_OTP_PURPOSE,
      codeHash: await hashSecret(code),
      expiresAt
    }
  });

  await sendEmail({
    to: email,
    subject: "Reset your Truevesti password",
    html: `
      <p>You requested a password reset for your Truevesti account.</p>
      <p>Your reset code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:0.2em;">${code}</p>
      <p>This code expires in ${expiryMinutes} minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `
  });

  return { expiresAt };
}

export async function verifyPasswordResetOtp(email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return { ok: false as const, error: "No account found for this email" };
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      purpose: PASSWORD_RESET_OTP_PURPOSE,
      consumedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!otp) {
    return { ok: false as const, error: "Reset code expired or not found. Request a new code." };
  }

  const valid = await verifySecret(code, otp.codeHash);
  if (!valid) {
    return { ok: false as const, error: "Invalid reset code" };
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  return { ok: true as const, userId: user.id };
}
