import { z } from "zod";

export const supportedManualDepositOptions = [
  { assetSymbol: "USDT", network: "TRC20", label: "USDT TRC20" },
  { assetSymbol: "USDT", network: "ERC20", label: "USDT ERC20" },
  { assetSymbol: "BTC", network: "Bitcoin", label: "BTC" },
  { assetSymbol: "ETH", network: "Ethereum", label: "ETH" }
] as const;

const manualDepositOptionBaseSchema = z.object({
  assetSymbol: z.enum(["USDT", "BTC", "ETH"]),
  network: z.enum(["TRC20", "ERC20", "Bitcoin", "Ethereum"])
});

function requireSupportedManualDepositOption(value: { assetSymbol: string; network: string }, context: z.RefinementCtx) {
  const supported = supportedManualDepositOptions.some(
    (option) => option.assetSymbol === value.assetSymbol && option.network === value.network
  );
  if (!supported) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Unsupported deposit coin or network"
    });
  }
}

export const manualDepositOptionSchema = manualDepositOptionBaseSchema.superRefine(requireSupportedManualDepositOption);

export const manualDepositRequestSchema = manualDepositOptionBaseSchema.extend({
  amountUsd: z.number().positive(),
  txHash: z.string().trim().min(8),
  proofUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().url().optional()
  )
}).superRefine(requireSupportedManualDepositOption);

export const walletAddressSchema = manualDepositOptionBaseSchema.extend({
  label: z.string().trim().min(2).max(80),
  address: z.string().trim().min(8).max(240),
  instructions: z.string().trim().min(10).max(2000),
  isActive: z.boolean().optional()
}).superRefine(requireSupportedManualDepositOption);

export const walletAddressUpdateSchema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().min(8).max(240).optional(),
  instructions: z.string().trim().min(10).max(2000).optional(),
  isActive: z.boolean().optional()
});

export const depositDecisionSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("CONFIRMED"),
    txHash: z.string().trim().min(8).optional()
  }),
  z.object({
    status: z.literal("REJECTED"),
    reason: z.string().trim().min(3).max(1000)
  })
]);

export function manualDepositKey(assetSymbol: string, network: string) {
  return `${assetSymbol.toUpperCase()}:${network.toUpperCase()}`;
}
