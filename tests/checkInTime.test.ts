import assert from "node:assert/strict";
import { test } from "node:test";

import { checkInTime, CHECK_IN_GAP_MINUTES } from "@/lib/checkInTime";
import { getStatus } from "@/lib/status";
import seed from "@/data/seed.json";
import type { Reading } from "@/lib/types";

// Test values: the demo clock, mission day 212 at 23:00 UTC (mission day 0 is 2026-04-16).
const DEMO_TIME = new Date(Date.UTC(2026, 3, 16) + 212 * 86_400_000 + 23 * 3_600_000);
const GAP_MS = CHECK_IN_GAP_MINUTES * 60_000;

test("the first check-in uses the demo time", () => {
  assert.equal(checkInTime(DEMO_TIME, seed as Reading[]).getTime(), DEMO_TIME.getTime());
});

test("each later check-in lands one gap after the newest reading", () => {
  const first: Reading = { ...(seed as Reading[])[0], id: "a", timestamp: DEMO_TIME.toISOString() };
  assert.equal(checkInTime(DEMO_TIME, [first]).getTime(), DEMO_TIME.getTime() + GAP_MS);
});

test("a stored reading with an unreadable timestamp does not break the next check-in", () => {
  const broken: Reading = { ...(seed as Reading[])[0], id: "b", timestamp: "not a time" };
  assert.equal(checkInTime(DEMO_TIME, [broken]).getTime(), DEMO_TIME.getTime());
});

// The bug this fixes: three check-ins at the same time never counted as "in a row".
test("three out-of-baseline temperatures logged in a row turn amber on the third", () => {
  const history: Reading[] = [...(seed as Reading[])];
  const statuses: string[] = [];
  for (let i = 0; i < 3; i++) {
    const time = checkInTime(DEMO_TIME, history);
    const reading: Reading = {
      id: `live-${i}`,
      indicator: "bodyTemperature",
      value: 37.9, // test value: outside the demo astronaut's baseline, inside the adjusted range
      unit: "°C",
      timestamp: time.toISOString(),
      missionDay: 212,
      environment: "marsTransit",
      context: "resting",
      simulated: true,
    };
    const earlier = history.filter((r) => r.indicator === "bodyTemperature");
    statuses.push(getStatus(reading, earlier, "marsTransit", 212, time).status);
    history.push(reading);
  }
  assert.deepEqual(statuses, ["green", "green", "amber"]);
});
