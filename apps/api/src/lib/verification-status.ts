import { z } from "zod";

export const VerificationStatus = {
  NOT_SUBMITTED: "NOT_SUBMITTED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
} as const;

export const kycDecisionSchema = z.object({
  status: z.enum([
    VerificationStatus.APPROVED,
    VerificationStatus.REJECTED,
    VerificationStatus.PENDING,
  ]),
  reason: z.string().max(1000).optional(),
});
