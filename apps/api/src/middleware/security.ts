import cors from "cors";
import type { CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Express } from "express";
import { env } from "../lib/env.js";

export function applySecurity(app: Express) {
  app.set("trust proxy", 1);
  app.use(helmet());

  const allowedOrigins = (process.env.WEB_ORIGIN || "https://truevesti-web.vercel.app")
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  const corsOptions: CorsOptions = {
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.some((allowed: string) => origin === allowed || origin.endsWith(".vercel.app"))) {
        callback(null, true);
      } else {
        callback(new Error("CORS origin not allowed"));
      }
    },
    credentials: true
  };

  app.use(cors(corsOptions));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
}

