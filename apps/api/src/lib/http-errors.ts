import type { Response } from "express";
import pino from "pino";
import { ZodError } from "zod";
import { EmailConfigurationError } from "./email-config.js";
import { EmailDeliveryError } from "./email-delivery-error.js";

const logger = pino({ name: "http-errors" });

function isPrismaKnownError(err: unknown): err is { code: string; meta?: unknown; message?: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
  );
}

export function sendError(res: Response, status: number, error: string, extra?: Record<string, unknown>) {
  return res.status(status).json({ error, ...extra });
}

export function handleRouteError(res: Response, err: unknown) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: err.flatten().fieldErrors
    });
  }

  if (isPrismaKnownError(err) && err.code === "P2002") {
    return sendError(res, 409, "An account with this email already exists", { code: "EMAIL_EXISTS" });
  }

  if (err instanceof EmailConfigurationError) {
    return sendError(
      res,
      503,
      "Verification email could not be sent. Please try again in a few minutes.",
      { code: err.code }
    );
  }

  if (err instanceof EmailDeliveryError) {
    return sendError(res, 502, err.userMessage, { code: err.code });
  }

  if (err instanceof Error) {
    logger.error(
      {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: isPrismaKnownError(err) ? err.code : undefined,
        meta: isPrismaKnownError(err) ? err.meta : undefined
      },
      "Route error"
    );
    return sendError(res, 500, "Something went wrong. Please try again.", { code: "INTERNAL_ERROR" });
  }

  return sendError(res, 500, "Unexpected server error", { code: "INTERNAL_ERROR" });
}
