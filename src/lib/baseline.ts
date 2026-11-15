/**
 * Math helpers and personal baseline calculation for health readings.
 * We use median and median absolute deviation (spread) instead of mean and
 * standard deviation so a single typo or bad sensor reading does not drag the
 * astronaut's baseline.
 */
import type { Reading, StatusResult, ValueReading } from "@/lib/types";

// ============================================================================
// HARDCODED VALUES FOR BASELINE CALCULATION
// ============================================================================
export const MIN_BASELINE_READINGS = 5; // demo parameter
export const MAX_BASELINE_READINGS = 10; // demo parameter
export const BASELINE_WINDOW_DAYS = 14; // demo parameter
export const SPREAD_MULTIPLIER = 3; // demo parameter

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Median, so one extreme reading does not move the baseline.
export function median(values: number[]): number {
  // Sort a copy so the caller's array is not mutated.
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  // Odd length: return the exact middle number.
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  // Even length: return the average of the two middle numbers.
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

// Median absolute deviation (MAD): typical distance from the median.
export function spread(values: number[]): number {
  const medianValue = median(values);
  const distances = values.map((value) => Math.abs(value - medianValue));
  return median(distances);
}

// Build a personal baseline band from earlier readings of the same indicator,
// context, and simulated flag. Leaves out unusual readings as it walks from
// oldest to newest so a slow-onset fever cannot pull the baseline up with it.
export function buildBaseline(
  reading: ValueReading,
  history: Reading[],
  baselineFloor: number | null = null,
): StatusResult["baseline"] {
  // If this indicator does not use a personal baseline, return null.
  if (baselineFloor === null) return null;

  const readingTimeMs = new Date(reading.timestamp).getTime();
  const windowStartMs =
    readingTimeMs - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Step 1: Filter history to earlier readings of the same indicator, context, and simulated flag.
  const earlierReadings = history
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

  // Step 2: Walk oldest to newest, keeping "normal" readings.
  const normalReadings: ValueReading[] = [];
  for (const item of earlierReadings) {
    if (normalReadings.length < MIN_BASELINE_READINGS) {
      normalReadings.push(item);
    } else {
      const valuesSoFar = normalReadings.map((r) => r.value);
      const medianValue = median(valuesSoFar);
      const spreadValue = spread(valuesSoFar);
      const allowedDistance = Math.max(
        baselineFloor,
        SPREAD_MULTIPLIER * spreadValue,
      );

      // Only add it if its distance from medianValue is <= allowedDistance.
      if (Math.abs(item.value - medianValue) <= allowedDistance) {
        normalReadings.push(item);
      }
    }
  }

  // Step 3: Keep normal readings from the last 14 days and take the last 10.
  const recentNormal = normalReadings
    .filter((item) => new Date(item.timestamp).getTime() >= windowStartMs)
    .slice(-MAX_BASELINE_READINGS);

  // If we have fewer than 5 normal readings in the last 14 days, we don't have enough data yet!
  if (recentNormal.length < MIN_BASELINE_READINGS) return null;

  // Step 4: Calculate the final baseline band [median - halfWidth, median + halfWidth].
  const windowValues = recentNormal.map((r) => r.value);
  const baseMedian = median(windowValues);
  const baseSpread = spread(windowValues);
  const halfWidth = Math.max(baselineFloor, SPREAD_MULTIPLIER * baseSpread);

  return {
    low: Number((baseMedian - halfWidth).toFixed(2)),
    high: Number((baseMedian + halfWidth).toFixed(2)),
    count: recentNormal.length,
  };
}