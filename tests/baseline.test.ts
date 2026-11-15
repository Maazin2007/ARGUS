import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBaseline, median, spread } from "@/lib/baseline";
import type { ValueReading } from "@/lib/types";

function makeHeartRate(
  id: string,
  dayOffset: number,
  value: number,
): ValueReading {
  const date = new Date(Date.UTC(2026, 10, 1 + dayOffset, 12, 0, 0));
  return {
    id,
    indicator: "heartRate",
    value,
    unit: "bpm",
    timestamp: date.toISOString(),
    missionDay: 200 + dayOffset,
    environment: "marsTransit",
    context: "resting",
    simulated: false,
  };
}

test("median returns the middle value for an odd count", () => {
  assert.equal(median([80, 70, 72]), 72);
});

test("median returns the average of the two middle values for an even count", () => {
  assert.equal(median([70, 80, 72, 74]), 73);
});

test("median returns the value itself for a single number", () => {
  assert.equal(median([65]), 65);
});

test("median is not pulled by one extreme outlier", () => {
  assert.equal(median([70, 71, 72, 73, 500]), 72);
});

test("spread returns 0 when all numbers are identical", () => {
  assert.equal(spread([70, 70, 70]), 0);
});

test("spread returns the median absolute deviation from the median", () => {
  assert.equal(spread([68, 70, 75]), 2);
});

test("spread is not pulled by one extreme outlier", () => {
  assert.equal(spread([70, 71, 72, 73, 500]), 1);
});

test("buildBaseline returns null when there are fewer than 5 earlier readings", () => {
  const history = [
    makeHeartRate("h1", 1, 60),
    makeHeartRate("h2", 2, 60),
    makeHeartRate("h3", 3, 60),
    makeHeartRate("h4", 4, 60),
  ];
  const current = makeHeartRate("h5", 5, 60);
  assert.equal(buildBaseline(current, history, 10), null);
});

test("buildBaseline computes baseline band once 5 normal readings exist", () => {
  const history = [
    makeHeartRate("h1", 1, 60),
    makeHeartRate("h2", 2, 60),
    makeHeartRate("h3", 3, 60),
    makeHeartRate("h4", 4, 60),
    makeHeartRate("h5", 5, 60),
  ];
  const current = makeHeartRate("h6", 6, 60);
  const baseline = buildBaseline(current, history, 10);
  assert.deepEqual(baseline, { low: 50, high: 70, count: 5 });
});

test("buildBaseline leaves out unusual readings after the initial 5 so a fever does not drag the baseline", () => {
  const history = [
    makeHeartRate("h1", 1, 60),
    makeHeartRate("h2", 2, 60),
    makeHeartRate("h3", 3, 60),
    makeHeartRate("h4", 4, 60),
    makeHeartRate("h5", 5, 60),
    makeHeartRate("h6", 6, 95), // outlier outside 50..70
    makeHeartRate("h7", 7, 98), // outlier outside 50..70
  ];
  const current = makeHeartRate("h8", 8, 99);
  const baseline = buildBaseline(current, history, 10);
  assert.deepEqual(baseline, { low: 50, high: 70, count: 5 });
});
