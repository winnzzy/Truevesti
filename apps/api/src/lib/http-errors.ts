import type { Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

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

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return sendError(res, 409, "An account with this email already exists", { code: "EMAIL_EXISTS" });
  }

  if (err instanceof Error) {
    return sendError(res, 500, err.message, { code: "INTERNAL_ERROR" });
  }

  return sendError(res, 500, "Unexpected server error", { code: "INTERNAL_ERROR" });
}
