import type { Environment, Reading, StatusResult } from "@/lib/types";

// Stub: returns a fixed result so the screens and scripts can be built before
// the real rules exist. Maazin replaces the body (plan/BACKEND.md).
export function getStatus(
  reading: Reading,
  history: Reading[],
  environment: Environment,
  missionDay: number,
  now: Date,
): StatusResult {
  void [reading, history, environment, missionDay, now];
  return {
    status: "unknown",
    reasons: ["The status engine is not built yet."],
    referenceRange: null,
    baseline: null,
    criticalLimitCrossed: false,
  };
}
