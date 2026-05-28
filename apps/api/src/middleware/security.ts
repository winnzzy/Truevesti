import cors from "cors";
import type { CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Express } from "express";

export function applySecurity(app: Express) {
  app.set("trust proxy", 1);
  app.use(helmet());

  // Collect allowed origins from multiple env vars (comma-separated values supported).
  const envKeys = ["CORS_ORIGIN", "CORS_ORIGINS", "ALLOWED_ORIGINS", "FRONTEND_URL", "WEB_ORIGIN"];
  const allowedOrigins = envKeys
    .flatMap((key) => (process.env[key] || "").split(","))
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  // Deduplicate
  const uniqueOrigins = [...new Set(allowedOrigins)];

  console.log("[CORS] Allowed origins:", uniqueOrigins);

  const corsOptions: CorsOptions = {
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (e.g. server-to-server, curl, mobile apps)
      if (!origin) {
        return callback(null, true);
      }

      if (uniqueOrigins.some((allowed: string) => origin === allowed || origin.endsWith(".vercel.app"))) {
        return callback(null, true);
      }

      console.warn("[CORS] Blocked origin:", origin);
      callback(new Error("CORS origin not allowed"));
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

