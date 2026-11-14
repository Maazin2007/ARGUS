import assert from "node:assert/strict";
import { test } from "node:test";
import { checkReading, getStatus } from "@/lib/status";
import type { IndicatorRule, Reading } from "@/lib/types";

const now = new Date("2026-11-14T13:05:00Z");

// Test rules with easy numbers (labelled as test values per plan/BACKEND.md).
const testRules: IndicatorRule[] = [
  {
    measure: "heartRate",
    context: "resting",
    unit: "bpm",
    earthRange: { low: 60, high: 100, source: "test value" },
    criticalLimit: { low: 40, high: 150, source: "test value" },
    baselineFloor: 10,
    adjustments: [],
  },
  {
    measure: "sleepDuration",
    context: "daily",
    unit: "h",
    earthRange: { low: 6, high: 9, source: "test value" },
    criticalLimit: null, // sleep has no red rule
    baselineFloor: 1,
    adjustments: [],
  },
];

const restingHeartRate: Reading = {
  id: "r-001",
  indicator: "heartRate",
  value: 72,
  unit: "bpm",
  timestamp: "2026-11-14T13:00:00Z",
  missionDay: 212,
  environment: "marsTransit",
  context: "resting",
  simulated: false,
};

test("getStatus returns the agreed shape", () => {
  const result = getStatus(restingHeartRate, [], "marsTransit", 212, now);
  assert.ok(["green", "amber", "red", "unknown"].includes(result.status));
  assert.ok(result.reasons.length > 0);
  assert.equal(typeof result.criticalLimitCrossed, "boolean");
});

test("unsupported context returns unknown", () => {
  const exerciseReading: Reading = {
    ...restingHeartRate,
    context: "exercise",
    value: 140,
  };
  const result = checkReading(
    exerciseReading,
    [],
    testRules,
    "earth",
    0,
    now,
  );
  assert.equal(result.status, "unknown");
  assert.equal(result.criticalLimitCrossed, false);
});

test("stale reading returns unknown", () => {
  const staleReading: Reading = {
    ...restingHeartRate,
    timestamp: "2026-11-10T13:00:00Z", // 4 days (96 hours) before `now`
  };
  const result = checkReading(staleReading, [], testRules, "earth", 0, now);
  assert.equal(result.status, "unknown");
});

test("reading crossing criticalLimit returns red", () => {
  const highReading: Reading = {
    ...restingHeartRate,
    value: 165,
  };
  const result = checkReading(highReading, [], testRules, "earth", 0, now);
  assert.equal(result.status, "red");
  assert.equal(result.criticalLimitCrossed, true);
});

test("reading outside reference range returns amber", () => {
  const elevatedReading: Reading = {
    ...restingHeartRate,
    value: 115,
  };
  const result = checkReading(elevatedReading, [], testRules, "earth", 0, now);
  assert.equal(result.status, "amber");
  assert.equal(result.criticalLimitCrossed, false);
});

test("reading inside reference range returns green", () => {
  const result = checkReading(restingHeartRate, [], testRules, "earth", 0, now);
  assert.equal(result.status, "green");
  assert.equal(result.criticalLimitCrossed, false);
});
