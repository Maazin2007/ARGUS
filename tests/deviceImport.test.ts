import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseCsv,
  parseDeviceText,
  rowsToReadings,
  toCsv,
  type DeviceRow,
  type ImportOptions,
} from "@/lib/deviceImport";
import sample from "@/data/sampleDevicePacket.json";

// Test values: fixed mission day so the test passes on any date.
const options = (existing: string[] = []): ImportOptions => ({
  environment: "marsTransit",
  missionDayOf: (ms: number) => Math.floor((ms - Date.UTC(2026, 3, 16)) / 86_400_000),
  currentMissionDay: 212,
  existingIds: new Set(existing),
});

test("the sample packet imports with no problems and marks every reading as device", () => {
  const { readings, problems } = rowsToReadings(sample.readings as DeviceRow[], options());
  assert.deepEqual(problems, []);
  assert.equal(readings.length, sample.readings.length);
  for (const r of readings) {
    assert.equal(r.provenance, "device");
    assert.equal(r.simulated, true);
    assert.equal(r.missionDay, 212);
  }
});

test("a CSV round trip gives the same readings as the JSON packet", () => {
  const fromJson = rowsToReadings(sample.readings as DeviceRow[], options()).readings;
  const csv = toCsv(sample.readings as DeviceRow[]);
  const parsed = parseDeviceText("packet.csv", csv);
  assert.ok(parsed.ok);
  assert.deepEqual(rowsToReadings(parsed.rows, options()).readings, fromJson);
});

test("blood pressure reads systolic and diastolic", () => {
  const rows = parseCsv("timestamp,indicator,systolic,diastolic\n2026-11-14T20:00:00Z,bloodPressure,118,76\n");
  const [reading] = rowsToReadings(rows, options()).readings;
  assert.ok(reading.indicator === "bloodPressure");
  assert.equal(reading.systolic, 118);
  assert.equal(reading.diastolic, 76);
});

test("values a person could not type are rejected, with the row number", () => {
  const rows: DeviceRow[] = [
    { timestamp: "2026-11-14T20:00:00Z", indicator: "heartRate", value: "1e2" },
    { timestamp: "2026-11-14T20:00:00Z", indicator: "bodyTemperature", value: 60 },
    { timestamp: "not a time", indicator: "heartRate", value: 70 },
    { timestamp: "2026-11-14T20:00:00Z", indicator: "spO2", value: 98 },
    { timestamp: "2026-11-14T20:00:00Z", indicator: "heartRate", context: "sprinting", value: 70 },
  ];
  const { readings, problems } = rowsToReadings(rows, options());
  assert.equal(readings.length, 0);
  assert.deepEqual(
    problems.map((p) => p.row),
    [1, 2, 3, 4, 5],
  );
});

test("importing the same file twice adds nothing the second time", () => {
  const first = rowsToReadings(sample.readings as DeviceRow[], options()).readings;
  const second = rowsToReadings(sample.readings as DeviceRow[], options(first.map((r) => r.id)));
  assert.equal(second.readings.length, 0);
  assert.equal(second.problems.length, sample.readings.length);
});

test("a file that is neither JSON nor a list is reported, not thrown", () => {
  const result = parseDeviceText("packet.json", "{ broken");
  assert.equal(result.ok, false);
  const notList = parseDeviceText("packet.json", '{ "a": 1 }');
  assert.equal(notList.ok, false);
});

const row = (extra: DeviceRow): DeviceRow => ({ timestamp: "2026-11-14T20:00:00Z", indicator: "heartRate", value: 70, ...extra });

test("a reading dated after today is refused, so it cannot move the demo clock", () => {
  const { readings, problems } = rowsToReadings([row({ timestamp: "2026-11-17T08:00:00Z" })], options());
  assert.equal(readings.length, 0);
  assert.match(problems[0].message, /after today/);
});

test("a timestamp with no time zone is refused instead of read as local time", () => {
  const { readings, problems } = rowsToReadings([row({ timestamp: "2026-11-14T20:00:00" })], options());
  assert.equal(readings.length, 0);
  assert.match(problems[0].message, /time zone/);
  // An explicit offset is fine.
  assert.equal(rowsToReadings([row({ timestamp: "2026-11-14T13:00:00-07:00" })], options()).readings.length, 1);
});

test("names every object has, like toString, are not indicators", () => {
  assert.equal(rowsToReadings([row({ indicator: "toString" })], options()).readings.length, 0);
});

test("mood is a self-rating and is never imported from a device", () => {
  assert.equal(rowsToReadings([row({ indicator: "mood", value: 4 })], options()).readings.length, 0);
});

test("resting and exercise heart rate at the same time are two readings; a repeated row is reported", () => {
  const { readings, problems } = rowsToReadings(
    [row({ context: "resting" }), row({ context: "exercise", value: 120 }), row({ context: "resting" })],
    options(),
  );
  assert.equal(readings.length, 2);
  assert.match(problems[0].message, /twice in this file/);
});

test("CSV headers are read in any case", () => {
  const rows = parseCsv("Timestamp,Indicator,Value\n2026-11-14T20:00:00Z,heartRate,70\n");
  assert.equal(rowsToReadings(rows, options()).readings.length, 1);
});
