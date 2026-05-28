import express from "express";
import cookieParser from "cookie-parser";
import pino from "pino";
import { ZodError } from "zod";
import { env } from "./lib/env.js";
import { validateEmailConfiguration } from "./lib/email-config.js";
import { applySecurity } from "./middleware/security.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { investmentRouter } from "./modules/investments/investment.routes.js";
import { paymentRouter } from "./modules/payments/payment.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { supportRouter } from "./modules/support/support.routes.js";
import { notificationRouter } from "./modules/notifications/notification.routes.js";
import { withdrawalRouter } from "./modules/withdrawals/withdrawal.routes.js";
import { kycRouter } from "./modules/kyc/kyc.routes.js";

const logger = pino();
const app = express();

applySecurity(app);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/health", (_req: express.Request, res: express.Response) => res.json({ ok: true, service: "truevesti-api" }));
app.use("/auth", authRouter);
app.use("/investments", investmentRouter);
app.use("/payments", paymentRouter);
app.use("/withdrawals", withdrawalRouter);
app.use("/kyc", kycRouter);
app.use("/admin", adminRouter);
app.use("/support", supportRouter);
app.use("/notifications", notificationRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err);
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: err.flatten().fieldErrors
    });
  }
  res.status(500).json({ error: "Request could not be processed", code: "INTERNAL_ERROR" });
});

try {
  const emailConfig = validateEmailConfiguration();
  logger.info({ email: emailConfig }, "Email provider ready");
} catch (err) {
  logger.warn({ err }, "Email provider is not fully configured — signup OTP emails will fail until env vars are set");
}

app.listen(env.PORT, () => {
  logger.info(`Truevesti API listening on ${env.PORT}`);
});
