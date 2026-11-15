import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW } from "@/lib/crew";
import { CREW_OVERDUE_DAYS, summarizeCrew } from "@/lib/crewBoard";
import { demoReadingsFor } from "@/lib/demoProfile";

// The demo runs on mission day 212, with statuses worked out late that day.
const MISSION_DAY = 212;
const now = new Date("2026-11-14T23:00:00Z");

function summaryOf(crewId: string) {
  return summarizeCrew(demoReadingsFor(crewId), "marsTransit", MISSION_DAY, now);
}

test("a crewmember with no readings is unknown and overdue", () => {
  const summary = summarizeCrew([], "marsTransit", MISSION_DAY, now);
  assert.deepEqual(summary, { status: "unknown", lastReadingDay: null, overdue: true });
});

test("the default demo crewmember is within range and up to date", () => {
  assert.deepEqual(summaryOf("ms1"), { status: "green", lastReadingDay: MISSION_DAY, overdue: false });
});

test("one critical indicator makes the crewmember critical", () => {
  const summary = summaryOf("plt");
  assert.equal(summary.status, "red");
  assert.equal(summary.overdue, false);
});

test("a crewmember who stopped logging is overdue, and stale readings are never green", () => {
  const summary = summaryOf("ms2");
  assert.equal(summary.overdue, true);
  assert.ok(MISSION_DAY - (summary.lastReadingDay ?? 0) >= CREW_OVERDUE_DAYS);
  assert.notEqual(summary.status, "green");
});

test("the demo crew shows one critical, one needing review, one overdue and two within range", () => {
  const summaries = CREW.map((member) => summaryOf(member.id));
  assert.equal(summaries.filter((s) => s.status === "red").length, 1);
  assert.equal(summaries.filter((s) => s.status === "amber").length, 1);
  assert.equal(summaries.filter((s) => s.overdue).length, 1);
  assert.equal(summaries.filter((s) => s.status === "green" && !s.overdue).length, 2);
});

test("each demo crewmember has their own latest heart rate", () => {
  const latest = CREW.map((member) => {
    const heartRates = demoReadingsFor(member.id).filter((r) => r.indicator === "heartRate");
    const last = heartRates[heartRates.length - 1];
    return last.indicator === "heartRate" ? last.value : null;
  });
  assert.equal(new Set(latest).size, CREW.length);
});

test("every demo reading is marked simulated and ids are unique across the crew", () => {
  const all = CREW.flatMap((member) => demoReadingsFor(member.id));
  assert.ok(all.every((reading) => reading.simulated));
  assert.equal(new Set(all.map((reading) => reading.id)).size, all.length);
});
