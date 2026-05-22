import rateLimit from "express-rate-limit";

const windowMs = Number(process.env.OTP_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const max = Number(process.env.OTP_RATE_LIMIT_MAX || 5);

export const otpRateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    return email || req.ip || "unknown";
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many OTP requests. Please wait before requesting another code.",
      code: "OTP_RATE_LIMITED"
    });
  }
});
