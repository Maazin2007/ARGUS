// importing all the required types
import type {
  BloodPressureReading,
  Environment,
  IndicatorRule,
  Measure,
  Range,
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

// Plain-language labels for reasons shown on screen.
const MEASURE_LABELS: Record<Measure, string> = {
  heartRate: "Heart rate",
  systolic: "Systolic blood pressure",
  diastolic: "Diastolic blood pressure",
  bloodGlucose: "Blood glucose",
  bodyTemperature: "Body temperature",
  sleepDuration: "Sleep duration",
  mood: "Mood",
};

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
// Only the end the shift points towards moves: a rise in flight raises the upper limit,
// a fall lowers the lower limit. The other end stays at the Earth value, so a reading
// that is ordinary on Earth is never flagged just because the crew is in flight.
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
      rule.earthRange.low !== null && shiftAmount < 0
        ? Number((rule.earthRange.low + shiftAmount).toFixed(2))
        : rule.earthRange.low,
    high:
      rule.earthRange.high !== null && shiftAmount > 0
        ? Number((rule.earthRange.high + shiftAmount).toFixed(2))
        : rule.earthRange.high,
    adjusted: true,
    source: `${rule.earthRange.source}; ${adjustment.source}`,
  };
}

// Format a range in plain words, handling one-sided ranges where low or high is null.
export function describeRange(
  range: Range,
  unit: string,
  kind: "reference" | "personal baseline" = "reference",
): string {
  if (range.low !== null && range.high !== null) {
    return `the ${kind} range of ${range.low} to ${range.high} ${unit}`;
  }
  if (range.low !== null) {
    return `the ${kind} of at least ${range.low} ${unit}`;
  }
  if (range.high !== null) {
    return `the ${kind} of at most ${range.high} ${unit}`;
  }
  return `the ${kind} range`;
}

function isOutsideRange(value: number, range: Range): boolean {
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
  const label = MEASURE_LABELS[measure];
  const rule = rules.find(
    (r) => r.measure === measure && r.context === reading.context,
  );

  if (!rule) {
    return {
      status: "unknown",
      reasons: [`No rule found for ${label.toLowerCase()} (${reading.context}).`],
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
          `${label} ${reading.value} ${reading.unit} is below the critical limit of ${rule.criticalLimit.low} ${reading.unit}.`,
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
          `${label} ${reading.value} ${reading.unit} is above the critical limit of ${rule.criticalLimit.high} ${reading.unit}.`,
        ],
        referenceRange,
        baseline,
        criticalLimitCrossed: true,
      };
    }
  }

  // CHECK 3: No reference range to check against.
  // Green means a range check ran and found nothing, so a rule with no range can never be green.
  if (referenceRange.low === null && referenceRange.high === null) {
    return {
      status: "unknown",
      reasons: [
        rule.criticalLimit !== null
          ? `${label} has no reference range yet. Only the critical limit was checked.`
          : `${label} has no reference range yet, so this reading was not checked.`,
      ],
      referenceRange: null,
      baseline,
      criticalLimitCrossed: false,
    };
  }

  // CHECK 4: Amber (reference range)
  if (referenceRange.low !== null && reading.value < referenceRange.low) {
    return {
      status: "amber",
      reasons: [
        `${label} ${reading.value} ${reading.unit} is below ${describeRange(referenceRange, reading.unit, "reference")}.`,
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
        `${label} ${reading.value} ${reading.unit} is above ${describeRange(referenceRange, reading.unit, "reference")}.`,
      ],
      referenceRange,
      baseline,
      criticalLimitCrossed: false,
    };
  }

  // CHECK 5: Amber (personal baseline - 3 consecutive readings outside baseline)
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
          `${label} ${reading.value} ${reading.unit} and the two prior readings are outside ${describeRange(baseline, reading.unit, "personal baseline")}.`,
        ],
        referenceRange,
        baseline,
        criticalLimitCrossed: false,
      };
    }
  }

  // CHECK 6: Green (nothing fired)
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

// Convert one half of a BloodPressureReading ("systolic" or "diastolic") into a ValueReading.
// Why indicator: "heartRate" is safe here: checkBloodPressure pre-filters history to only
// BloodPressureReading entries and converts only the matching part ("systolic" or "diastolic"),
// so this synthetic ValueReading never mixes with real heart-rate readings.
function bpToValueReading(
  bp: BloodPressureReading,
  part: "systolic" | "diastolic",
): ValueReading {
  return {
    id: `${bp.id}-${part}`,
    indicator: "heartRate",
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

    // Combine reasons from both; drop green-only filler messages when the combined status is not green.
    const combinedReasons = Array.from(
      new Set([...systolicResult.reasons, ...diastolicResult.reasons]),
    );
    const reasons =
      worseStatus === "green"
        ? combinedReasons
        : combinedReasons.filter(
            (r) =>
              r !== "No checks fired." && r !== "Baseline not available yet.",
          );

    // StatusResult has room for one range/baseline, so bloodPressure carries systolic's range and baseline.
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
