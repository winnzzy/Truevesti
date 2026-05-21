import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

const plans = [
  {
    name: "Starter",
    minDepositUsd: 100,
    maxDepositUsd: 5000,
    durationDays: 30,
    estimatedYieldMin: 0.15,
    estimatedYieldMax: 0.15,
    riskLevel: "Moderate",
    assetAllocation: "Stablecoin treasury with BTC hedge",
    supportedAssets: ["USDC", "USDT", "BTC"]
  },
  {
    name: "Growth",
    minDepositUsd: 5001,
    maxDepositUsd: 50000,
    durationDays: 90,
    estimatedYieldMin: 0.25,
    estimatedYieldMax: 0.25,
    riskLevel: "Balanced",
    assetAllocation: "BTC, ETH, SOL, and stablecoin treasury",
    supportedAssets: ["BTC", "ETH", "SOL", "USDC", "USDT"]
  },
  {
    name: "Premium",
    minDepositUsd: 50001,
    maxDepositUsd: 250000,
    durationDays: 180,
    estimatedYieldMin: 0.5,
    estimatedYieldMax: 0.5,
    riskLevel: "Elevated",
    assetAllocation: "Multi-chain active allocation",
    supportedAssets: ["BTC", "ETH", "SOL", "BNB", "USDC", "USDT"]
  },
  {
    name: "Institutional",
    minDepositUsd: 250001,
    maxDepositUsd: 1000000,
    durationDays: 365,
    estimatedYieldMin: 0,
    estimatedYieldMax: 0,
    riskLevel: "Custom",
    assetAllocation: "Policy-governed custom strategy",
    supportedAssets: ["BTC", "ETH", "SOL", "BNB", "USDC", "USDT"]
  }
];

for (const plan of plans) {
  const existing = await prisma.investmentPlan.findFirst({ where: { name: plan.name } });
  if (existing) {
    await prisma.investmentPlan.update({ where: { id: existing.id }, data: plan });
  } else {
    await prisma.investmentPlan.create({ data: plan });
  }
}

if (adminEmail && adminPassword) {
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword),
      role: "ADMIN",
      emailVerifiedAt: new Date(),
      riskConsentAt: new Date(),
      auditLogs: { create: { action: "ADMIN_SEEDED", entity: "User" } }
    }
  });
}

await prisma.$disconnect();
