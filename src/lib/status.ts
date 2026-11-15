// importing all the required types
import type {
  BloodPressureReading,
  Environment,
  IndicatorRule,
  Measure,
  Reading,
  Status,
  StatusResult,
  ValueReading,
} from "@/lib/types";
import { buildBaseline } from "@/lib/baseline";
// importing the indicator rules from the data file
import indicatorRules from "@/data/indicators.json";

// Constant value: readings older than this are treated as unknown (demo parameter).
export const STALE_AFTER_HOURS = 48; // demo parameter
export const CONSECUTIVE_BASELINE_DEVIATIONS = 3; // demo parameter

// Priority order so we can pick the worse status when checking blood pressure (systolic vs. diastolic).
const STATUS_PRIORITY: Record<Status, number> = {
  green: 0,
  unknown: 1,
  amber: 2,
  red: 3,
};

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
  const adjustment = rule.adjustments.find((a) =>
    a.environments.includes(environment),
  );

  if (!adjustment || missionDay <= 0 || adjustment.rampDays <= 0) {
    return {
      low: rule.earthRange.low,
      high: rule.earthRange.high,
      adjusted: false,
      source: rule.earthRange.source,
    };
  }

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

// Check one single number (like heartRate, or just systolic, or just diastolic).
function checkSingleMeasure(
  measure: Measure,
  reading: ValueReading,
  history: ValueReading[],
  rules: IndicatorRule[],
  environment: Environment,
  missionDay: number,
  now: Date,
): StatusResult {
  const rule = rules.find(
    (r) => r.measure === measure && r.context === reading.context,
  );

  if (!rule) {
    return {
      status: "unknown",
      reasons: [`No rule found for ${measure} in ${reading.context}`],
      referenceRange: null,
      baseline: null,
      criticalLimitCrossed: false,
    };
  }

  // CHECK 1: Stale reading
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

  // CHECK 2: Red (critical limit)
  if (rule.criticalLimit !== null) {
    if (
      rule.criticalLimit.low !== null &&
      reading.value < rule.criticalLimit.low
    ) {
      return {
        status: "red",
        reasons: [
          `Critical limit crossed: ${measure} ${reading.value} < ${rule.criticalLimit.low}`,
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
          `Critical limit crossed: ${measure} ${reading.value} > ${rule.criticalLimit.high}`,
        ],
        referenceRange,
        baseline,
        criticalLimitCrossed: true,
      };
    }
  }

  // CHECK 3: Amber (reference range)
  if (referenceRange.low !== null && reading.value < referenceRange.low) {
    return {
      status: "amber",
      reasons: [
        `${measure} ${reading.value} ${reading.unit} is below the reference range of ${referenceRange.low} to ${referenceRange.high} ${reading.unit}.`,
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
        `${measure} ${reading.value} ${reading.unit} is above the reference range of ${referenceRange.low} to ${referenceRange.high} ${reading.unit}.`,
      ],
      referenceRange,
      baseline,
      criticalLimitCrossed: false,
    };
  }

  // CHECK 4: Amber (personal baseline - 3 consecutive readings outside baseline)
  if (baseline !== null) {
    const earlierMatching = history
      .filter(
        (item) =>
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
          `${measure} ${reading.value} ${reading.unit} and the two prior readings are outside the personal baseline of ${baseline.low} to ${baseline.high} ${reading.unit}.`,
        ],
        referenceRange,
        baseline,
        criticalLimitCrossed: false,
      };
    }
  }

  // CHECK 5: Green (nothing fired)
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

// Convert one half of a BloodPressureReading ("systolic" or "diastolic") into a single-value reading.
function bpToValueReading(
  bp: BloodPressureReading,
  part: "systolic" | "diastolic",
): ValueReading {
  return {
    id: `${bp.id}-${part}`,
    indicator: "heartRate", // placeholder single-value tag so buildBaseline groups them together
    value: bp[part],
    unit: bp.unit,
    timestamp: bp.timestamp,
    missionDay: bp.missionDay,
    environment: bp.environment,
    context: bp.context,
    simulated: bp.simulated,
  };
}

export function checkReading(
  reading: Reading,
  history: Reading[],
  rules: IndicatorRule[],
  environment: Environment,
  missionDay: number,
  now: Date,
): StatusResult {
  // Section 6: Blood pressure has two numbers (systolic and diastolic).
  // Run the check on each and return the worse of the two results, with reasons from both.
  if (reading.indicator === "bloodPressure") {
    const bpHistory = history.filter(
      (item): item is BloodPressureReading =>
        item.indicator === "bloodPressure",
    );

    const systolicResult = checkSingleMeasure(
      "systolic",
      bpToValueReading(reading, "systolic"),
      bpHistory.map((h) => bpToValueReading(h, "systolic")),
      rules,
      environment,
      missionDay,
      now,
    );

    const diastolicResult = checkSingleMeasure(
      "diastolic",
      bpToValueReading(reading, "diastolic"),
      bpHistory.map((h) => bpToValueReading(h, "diastolic")),
      rules,
      environment,
      missionDay,
      now,
    );

    // Pick whichever status is worse (red > amber > unknown > green).
    const worseStatus =
      STATUS_PRIORITY[systolicResult.status] >=
      STATUS_PRIORITY[diastolicResult.status]
        ? systolicResult.status
        : diastolicResult.status;

    // Combine reasons from both without duplicating "No checks fired."
    const combinedReasons = Array.from(
      new Set([...systolicResult.reasons, ...diastolicResult.reasons]),
    );
    const reasons =
      worseStatus === "green"
        ? combinedReasons
        : combinedReasons.filter((r) => r !== "No checks fired.");

    return {
      status: worseStatus,
      reasons,
      referenceRange:
        systolicResult.referenceRange ?? diastolicResult.referenceRange,
      baseline: systolicResult.baseline ?? diastolicResult.baseline,
      criticalLimitCrossed:
        systolicResult.criticalLimitCrossed ||
        diastolicResult.criticalLimitCrossed,
    };
  }

  // Single-number indicators (heartRate, bodyTemperature, bloodGlucose, sleepDuration, mood):
  const singleHistory = history.filter(
    (item): item is ValueReading => item.indicator !== "bloodPressure",
  );

  return checkSingleMeasure(
    reading.indicator,
    reading,
    singleHistory,
    rules,
    environment,
    missionDay,
    now,
  );
}
