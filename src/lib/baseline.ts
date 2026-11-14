/**
 * Math helpers and personal baseline calculation for health readings.
 * We use median and median absolute deviation (spread) instead of mean and
 * standard deviation so a single typo or bad sensor reading does not drag the
 * astronaut's baseline.
 */

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
