// Fills storage with a simulated demo profile for every crewmember, so the pitch
// never starts from an empty dashboard. Everyone starts from seed.json; the demo
// parameters in src/data/crew.json then make one crewmember critical and one
// overdue, so the crew board has something to show. Every reading is marked
// `simulated: true`, which keeps the "Simulated data" tags on screen.

import seed from "@/data/seed.json";
import { CONSOLE_OWNER_ID, CREW, crewMember } from "@/lib/crew";
import { clearAll, replaceReadings, type SaveResult } from "@/lib/storage";
import type { Reading } from "@/lib/types";

// One crewmember's demo readings. Pure, so the tests can check them.
export function demoReadingsFor(crewId: string): Reading[] {
  const demo = crewMember(crewId)?.demo ?? {};
  const all = seed as Reading[];
  const lastDay = Math.max(...all.map((r) => r.missionDay));
  const firstMissedDay = lastDay - (demo.missedLastDays ?? 0) + 1;

  return all
    .filter((reading) => reading.missionDay < firstMissedDay)
    .map((reading): Reading => {
      const base = {
        ...reading,
        // The seed ids belong to the default crewmember; everyone else gets their own.
        id: crewId === CONSOLE_OWNER_ID ? reading.id : `${reading.id}-${crewId}`,
        provenance: "seed" as const,
      };
      if (base.indicator === "heartRate") {
        return { ...base, value: base.value + (demo.heartRateOffset ?? 0) };
      }
      if (
        base.indicator === "bodyTemperature" &&
        base.missionDay === lastDay &&
        demo.lastDayTemperature !== undefined
      ) {
        return { ...base, value: demo.lastDayTemperature };
      }
      return base;
    });
}

// Replaces whatever is stored: every crewmember's readings and check-ins are
// cleared first. Stops at the first failed write and returns its message.
export function loadDemoProfile(): SaveResult {
  const cleared = clearAll();
  if (!cleared.ok) return cleared;
  for (const member of CREW) {
    const saved = replaceReadings(demoReadingsFor(member.id), member.id);
    if (!saved.ok) return saved;
  }
  return { ok: true };
}
