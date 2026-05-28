import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  EMAIL_PROVIDER: z.enum(["resend", "sendgrid", "smtp", "console"]).default("console"),
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  OTP_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  CHAIN_WEBHOOK_SECRET: z.string().optional(),
  CRYPTO_PROVIDER: z.enum(["mock", "static-wallet", "mnemonic-wallet", "trust-wallet-core"]),
  CRYPTO_PROVIDER_API_KEY: z.string().optional(),
  MASTER_WALLET_ADDRESSES: z.string().optional(),
  MASTER_WALLET_MNEMONIC: z.string().optional(),
  WALLET_DERIVATION_ACCOUNT: z.coerce.number().int().nonnegative().default(0),
  ENCRYPTION_KEY: z.string().optional(),
  ADMIN_PURGE_SECRET: z.string().optional()
});

export const env = schema.parse(process.env);