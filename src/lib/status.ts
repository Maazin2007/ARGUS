// importing all the required types
import type {
  Environment,
  IndicatorRule,
  Reading,
  StatusResult,
  ValueReading,
} from "@/lib/types";
import { buildBaseline } from "@/lib/baseline";
// importing the indicator rules from the data file
import indicatorRules from "@/data/indicators.json";

// Constant value: readings older than this are treated as unknown (demo parameter).
export const STALE_AFTER_HOURS = 48; // demo parameter
export const CONSECUTIVE_BASELINE_DEVIATIONS = 3; // demo parameter

export function getStatus(
  reading: Reading,
  history: Reading[],
  environment: Environment,
  missionDay: number,
  now: Date,
): StatusResult {
  return checkReading(
    reading,
    history,
    indicatorRules as IndicatorRule[],
    environment,
    missionDay,
    now,
  );
}

// Shift the Earth reference range when the rule has an adjustment for this environment.
// Formula: adjusted limit = earth limit + shift * min(missionDay / rampDays, 1)
export function adjustRange(
  rule: IndicatorRule,
  environment: Environment,
  missionDay: number,
) {
  // check if there is an adjustment for this environment
  const adjustment = rule.adjustments.find((a) =>
    a.environments.includes(environment),
  );

  // if no adjustment or missionDay is less than 0 or rampDays is less than 0, return the original range
  if (!adjustment || missionDay <= 0 || adjustment.rampDays <= 0) {
    return {
      low: rule.earthRange.low,
      high: rule.earthRange.high,
      adjusted: false,
      source: rule.earthRange.source,
    };
  }

  // Calculate the adjusted range
  const progress = Math.min(missionDay / adjustment.rampDays, 1);
  const shiftAmount = adjustment.shift * progress;

  return {
    low:
      rule.earthRange.low !== null
        ? Number((rule.earthRange.low + shiftAmount).toFixed(2))
        : null,
    high:
      rule.earthRange.high !== null
        ? Number((rule.earthRange.high + shiftAmount).toFixed(2))
        : null,
    adjusted: true,
    source: `${rule.earthRange.source}; ${adjustment.source}`,
  };
}

function isOutsideRange(
  value: number,
  range: { low: number | null; high: number | null },
): boolean {
  if (range.low !== null && value < range.low) return true;
  if (range.high !== null && value > range.high) return true;
  return false;
}

// checkReadingFunction
export function checkReading(
  reading: Reading,
  history: Reading[],
  rules: IndicatorRule[],
  environment: Environment,
  missionDay: number,
  now: Date,
): StatusResult {
  // for now we handle single value readings only (bloodPressure in Section 6)
  if (reading.indicator === "bloodPressure") {
    return {
      status: "unknown",
      reasons: ["Blood pressure is not built yet."],
      referenceRange: null,
      baseline: null,
      criticalLimitCrossed: false,
    };
  }

  // find the rule for this reading
  const rule = rules.find(
    (r) => r.measure === reading.indicator && r.context === reading.context,
  );

  // if no rule found, return unknown
  if (!rule) {
    return {
      status: "unknown",
      reasons: [`No rule found for ${reading.indicator} in ${reading.context}`],
      referenceRange: null,
      baseline: null,
      criticalLimitCrossed: false,
    };
  }

  // check if the data is older than STALE_AFTER_HOURS hours CHECK 1
  const readingTimeMs = new Date(reading.timestamp).getTime();
  const staleTimeMs = (now.getTime() - readingTimeMs) / (1000 * 60 * 60);
  if (Number.isNaN(readingTimeMs) || staleTimeMs > STALE_AFTER_HOURS) {
    return {
      status: "unknown",
      reasons: [`Reading is older than ${STALE_AFTER_HOURS} hours.`],
      referenceRange: null,
      baseline: null,
      criticalLimitCrossed: false,
    };
  }

  const referenceRange = adjustRange(rule, environment, missionDay);
  const baseline = buildBaseline(reading, history, rule.baselineFloor);

  // check the critical limit CHECK 2 (Red)
  if (rule.criticalLimit !== null) {
    if (
      rule.criticalLimit.low !== null &&
      reading.value < rule.criticalLimit.low
    ) {
      return {
        status: "red",
        reasons: [
          `Critical limit crossed: ${reading.value} < ${rule.criticalLimit.low}`,
        ],
        referenceRange,
        baseline,
        criticalLimitCrossed: true,
      };
    }
    if (
      rule.criticalLimit.high !== null &&
      reading.value > rule.criticalLimit.high
    ) {
      return {
        status: "red",
        reasons: [
          `Critical limit crossed: ${reading.value} > ${rule.criticalLimit.high}`,
        ],
        referenceRange,
        baseline,
        criticalLimitCrossed: true,
      };
    }
  }

  // did it cross the reference range CHECK 3 (Amber)
  if (referenceRange.low !== null && reading.value < referenceRange.low) {
    return {
      status: "amber",
      reasons: [
        `${reading.indicator} ${reading.value} ${reading.unit} is below the reference range of ${referenceRange.low} to ${referenceRange.high} ${reading.unit}.`,
      ],
      referenceRange,
      baseline,
      criticalLimitCrossed: false,
    };
  }

  if (referenceRange.high !== null && reading.value > referenceRange.high) {
    return {
      status: "amber",
      reasons: [
        `${reading.indicator} ${reading.value} ${reading.unit} is above the reference range of ${referenceRange.low} to ${referenceRange.high} ${reading.unit}.`,
      ],
      referenceRange,
      baseline,
      criticalLimitCrossed: false,
    };
  }

  // CHECK 4: Personal baseline check (Amber if this reading and the 2 before it sit outside the baseline)
  if (baseline !== null) {
    const earlierMatching = history
      .filter(
        (item): item is ValueReading =>
          item.indicator !== "bloodPressure" &&
          item.indicator === reading.indicator &&
          item.context === reading.context &&
          item.simulated === reading.simulated &&
          item.id !== reading.id &&
          new Date(item.timestamp).getTime() < readingTimeMs,
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    const lastTwo = earlierMatching.slice(
      -(CONSECUTIVE_BASELINE_DEVIATIONS - 1),
    );
    if (
      lastTwo.length === CONSECUTIVE_BASELINE_DEVIATIONS - 1 &&
      isOutsideRange(reading.value, baseline) &&
      lastTwo.every((r) => isOutsideRange(r.value, baseline))
    ) {
      return {
        status: "amber",
        reasons: [
          `${reading.indicator} ${reading.value} ${reading.unit} and the two prior readings are outside the personal baseline of ${baseline.low} to ${baseline.high} ${reading.unit}.`,
        ],
        referenceRange,
        baseline,
        criticalLimitCrossed: false,
      };
    }
  }

  const reasons = ["No checks fired."];
  if (baseline === null && rule.baselineFloor !== null) {
    reasons.push("Baseline not available yet.");
  }

  return {
    status: "green",
    reasons,
    referenceRange,
    baseline,
    criticalLimitCrossed: false,
  };
}