import assert from "node:assert/strict";
import { test } from "node:test";

import { buildHandover, HANDOVER_DAYS, telemetryPacket } from "@/lib/handover";
import type { CheckIn, IndicatorId, Reading } from "@/lib/types";

// Test values: a fixed calendar where mission day 0 is 2026-04-16.
const DAY0 = Date.UTC(2026, 3, 16);
const missionDayOf = (ms: number) => Math.floor((ms - DAY0) / 86_400_000);
const at = (day: number, hour = 13) => new Date(DAY0 + day * 86_400_000 + hour * 3_600_000).toISOString();
const INDICATORS: IndicatorId[] = ["heartRate", "bodyTemperature"];

function temp(day: number, value: number, hour = 13): Reading {
  return {
    id: `t-${day}-${hour}`,
    indicator: "bodyTemperature",
    value,
    unit: "°C",
    timestamp: at(day, hour),
    missionDay: day,
    environment: "marsTransit",
    context: "resting",
    simulated: true,
  };
}

function report(readings: Reading[], checkIns: CheckIn[] = []) {
  return buildHandover({
    readings,
    checkIns,
    environment: "marsTransit",
    missionDay: 212,
    oneWayDelaySeconds: 720,
    now: new Date(at(212, 23)),
    missionDayOf,
    indicators: INDICATORS,
  });
}

test("the report covers the last seven mission days and the round-trip delay", () => {
  const r = report([]);
  assert.equal(r.days.length, HANDOVER_DAYS);
  assert.deepEqual([r.days[0], r.days[r.days.length - 1]], [206, 212]);
  assert.equal(r.roundTripDelaySeconds, 1440);
});

test("readings outside the window are left out", () => {
  const r = report([temp(190, 37.4), temp(210, 37.4)]);
  assert.equal(r.table.bodyTemperature[210].length, 1);
  assert.equal(Object.values(r.table.bodyTemperature).flat().length, 1);
});

test("a reading above the critical limit is listed as an alert with its reason", () => {
  const r = report([temp(211, 37.4), temp(212, 39.2)]);
  assert.equal(r.alerts.length, 1);
  assert.equal(r.alerts[0].result.status, "red");
  assert.ok(r.alerts[0].result.reasons.length > 0);
});

test("a check-in that says 'feel good' next to a red reading is a mismatch", () => {
  const reading = temp(212, 39.2);
  const checkIn: CheckIn = { id: "c1", timestamp: reading.timestamp, selfRating: 5 };
  const r = report([reading], [checkIn]);
  assert.equal(r.checkIns.length, 1);
  assert.notEqual(r.checkIns[0].mismatch, null);
});

test("the telemetry packet is JSON and says the data is simulated", () => {
  const packet = JSON.parse(telemetryPacket(report([temp(212, 39.2)])));
  assert.match(packet.kind, /simulated/);
  assert.equal(packet.alerts[0].status, "red");
});

test("an unknown result (no rule for exercise heart rate) is listed too", () => {
  const exercise: Reading = {
    id: "hr-ex",
    indicator: "heartRate",
    value: 130,
    unit: "bpm",
    timestamp: at(212),
    missionDay: 212,
    environment: "marsTransit",
    context: "exercise",
    simulated: true,
  };
  const r = report([exercise]);
  assert.equal(r.alerts.length, 1);
  assert.equal(r.alerts[0].result.status, "unknown");
});

test("a check-in with no readings saved with it says so instead of 'agree'", () => {
  const checkIn: CheckIn = { id: "c2", timestamp: at(212, 22), selfRating: 2 };
  const r = report([], [checkIn]);
  assert.equal(r.checkIns[0].readingCount, 0);
  assert.equal(r.checkIns[0].mismatch, null);
});
