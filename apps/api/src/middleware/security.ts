import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Express } from "express";
import { env } from "../lib/env.js";

export function applySecurity(app: Express) {
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({
  origin: process.env.WEB_ORIGIN || "https://truevesti-web.vercel.app",
  credentials: true
}));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
}

