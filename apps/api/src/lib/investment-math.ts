type Decimalish = string | number | { toString(): string };

export function expectedReturnForPlan(principalUsd: number, plan: { estimatedYieldMin: Decimalish; estimatedYieldMax: Decimalish }) {
  const yieldMin = Number(plan.estimatedYieldMin) || 0;
  const yieldMax = Number(plan.estimatedYieldMax) || 0;
  const averageYield = (yieldMin + yieldMax) / 2;
  return Number((principalUsd * averageYield).toFixed(2));
}

export function computeAccrualSnapshot(investment: {
  principalUsd: string | number;
  expectedReturnUsd?: string | number;
  startedAt: Date;
  maturesAt: Date;
  plan: { durationDays: number; estimatedYieldMin: Decimalish; estimatedYieldMax: Decimalish };
}) {
  const principal = Number(investment.principalUsd);
  const durationDays = investment.plan.durationDays;
  const expectedReturn = investment.expectedReturnUsd !== undefined
    ? Number(investment.expectedReturnUsd)
    : expectedReturnForPlan(principal, investment.plan);
  const dailyAccrual = durationDays > 0 ? expectedReturn / durationDays : 0;

  const durationMillis = Math.max(1, durationDays * 24 * 60 * 60 * 1000);
  const elapsedMillis = Math.max(0, Math.min(Date.now() - investment.startedAt.getTime(), durationMillis));
  const elapsedDays = durationDays > 0 ? Math.floor(elapsedMillis / (24 * 60 * 60 * 1000)) : 0;
  const accruedInterest = Math.min(expectedReturn, dailyAccrual * elapsedDays);

  return {
    projectedPayoutUsd: (principal + expectedReturn).toFixed(2),
    expectedReturnUsd: expectedReturn.toFixed(2),
    dailyAccrualUsd: dailyAccrual.toFixed(2),
    accruedInterestUsd: accruedInterest.toFixed(2),
    currentAccruedValueUsd: (principal + accruedInterest).toFixed(2),
    yieldPercent: principal > 0 ? Math.round((expectedReturn / principal) * 100) : 0,
    daysElapsed: elapsedDays,
    daysRemaining: Math.max(0, durationDays - elapsedDays),
    progressPercent: durationDays > 0 ? Math.min(100, Math.round((elapsedDays / durationDays) * 100)) : 0
  };
}
