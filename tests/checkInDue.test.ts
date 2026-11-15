import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHECK_IN_DUE_HOURS,
  checkCombinedAlerts,
  isCheckInDue,
} from "@/lib/checkInDue";

const now = new Date("2026-11-15T12:00:00Z");

test("isCheckInDue returns true when no check-in has been logged yet", () => {
  const result = isCheckInDue(null, now);
  assert.equal(result.isDue, true);
  assert.equal(result.hoursSinceLast, null);
  assert.ok(result.reason.includes("No check-in logged yet"));
});

test("isCheckInDue returns true when the last check-in is older than 24 hours", () => {
  const thirtyHoursAgo = "2026-11-14T06:00:00Z";
  const result = isCheckInDue(thirtyHoursAgo, now);
  assert.equal(result.isDue, true);
  assert.equal(result.hoursSinceLast, 30);
  assert.ok(result.reason.includes(`${CHECK_IN_DUE_HOURS} hours`));
});

test("isCheckInDue returns false when the last check-in was logged within 24 hours", () => {
  const sixHoursAgo = "2026-11-15T06:00:00Z";
  const result = isCheckInDue(sixHoursAgo, now);
  assert.equal(result.isDue, false);
  assert.equal(result.hoursSinceLast, 6);
});

test("isCheckInDue returns true on an invalid timestamp without throwing", () => {
  const result = isCheckInDue("not-a-timestamp", now);
  assert.equal(result.isDue, true);
  assert.equal(result.hoursSinceLast, null);
});

test("checkCombinedAlerts returns a demo-labelled note when both sleep and mood are flagged", () => {
  const notes = checkCombinedAlerts({
    sleepDuration: "amber",
    mood: "amber",
    heartRate: "green",
  });
  assert.equal(notes.length, 1);
  assert.ok(notes[0].includes("Sleep duration and mood"));
  assert.ok(notes[0].includes("demo rule"));
});

test("checkCombinedAlerts returns a demo-labelled note when both temperature and heart rate are flagged", () => {
  const notes = checkCombinedAlerts({
    bodyTemperature: "amber",
    heartRate: "red",
    sleepDuration: "green",
    mood: "green",
  });
  assert.equal(notes.length, 1);
  assert.ok(notes[0].includes("Body temperature and heart rate"));
  assert.ok(notes[0].includes("demo rule"));
});

test("checkCombinedAlerts returns an empty list when only one indicator is flagged or all are green", () => {
  assert.deepEqual(
    checkCombinedAlerts({
      sleepDuration: "amber",
      mood: "green",
      heartRate: "green",
      bodyTemperature: "green",
    }),
    [],
  );
  assert.deepEqual(
    checkCombinedAlerts({
      sleepDuration: "green",
      mood: "green",
      heartRate: "green",
      bodyTemperature: "green",
    }),
    [],
  );
});
