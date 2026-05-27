import assert from "node:assert/strict";
import test from "node:test";
import { computeAccrualSnapshot, expectedReturnForPlan } from "./investment-math.js";

test("expected return uses the middle of the configured estimate range", () => {
  assert.equal(expectedReturnForPlan(1000, { estimatedYieldMin: 0.04, estimatedYieldMax: 0.08 }), 60);
});

test("accrual snapshot caps current value at expected payout", () => {
  const startedAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  const maturesAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const snapshot = computeAccrualSnapshot({
    principalUsd: 1000,
    expectedReturnUsd: 100,
    startedAt,
    maturesAt,
    plan: {
      durationDays: 30,
      estimatedYieldMin: 0.1,
      estimatedYieldMax: 0.1
    }
  });

  assert.equal(snapshot.accruedInterestUsd, "100.00");
  assert.equal(snapshot.currentAccruedValueUsd, "1100.00");
  assert.equal(snapshot.progressPercent, 100);
});
