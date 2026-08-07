import { VerificationStatus } from "@prisma/client";
import { z } from "zod";

export const kycDecisionSchema = z.object({
  status: z.enum([
    VerificationStatus.APPROVED,
    VerificationStatus.REJECTED,
    VerificationStatus.PENDING,
  ]),
  reason: z.string().max(1000).optional(),
});

export { VerificationStatus };
