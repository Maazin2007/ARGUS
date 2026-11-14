import assert from "node:assert/strict";
import { test } from "node:test";
import { getStatus } from "@/lib/status";
import type { Reading } from "@/lib/types";

const now = new Date("2026-11-14T13:05:00Z");

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
