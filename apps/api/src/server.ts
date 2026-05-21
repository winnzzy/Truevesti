import express from "express";
import cookieParser from "cookie-parser";
import pino from "pino";
import { env } from "./lib/env.js";
import { applySecurity } from "./middleware/security.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { investmentRouter } from "./modules/investments/investment.routes.js";
import { paymentRouter } from "./modules/payments/payment.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { supportRouter } from "./modules/support/support.routes.js";
import { notificationRouter } from "./modules/notifications/notification.routes.js";
import { withdrawalRouter } from "./modules/withdrawals/withdrawal.routes.js";

const logger = pino();
const app = express();

applySecurity(app);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true, service: "truevesti-api" }));
app.use("/auth", authRouter);
app.use("/investments", investmentRouter);
app.use("/payments", paymentRouter);
app.use("/withdrawals", withdrawalRouter);
app.use("/admin", adminRouter);
app.use("/support", supportRouter);
app.use("/notifications", notificationRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err);
  res.status(400).json({ error: "Request could not be processed" });
});

app.listen(env.PORT, () => {
  logger.info(`Truevesti API listening on ${env.PORT}`);
});
