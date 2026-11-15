// Fills storage with the simulated demo astronaut from seed.json, so the pitch
// never starts from an empty dashboard. Every seed reading is marked
// `simulated: true`, which keeps the "Simulated data" tags on screen.

import seed from "@/data/seed.json";
import { clearAll, saveReading, type SaveResult } from "@/lib/storage";
import type { Reading } from "@/lib/types";

// Replaces whatever is stored: saved readings and check-ins are cleared first.
// Stops at the first failed write and returns its message for the screen.
export function loadDemoProfile(): SaveResult {
  const cleared = clearAll();
  if (!cleared.ok) return cleared;
  for (const reading of seed as Reading[]) {
    const saved = saveReading({ ...reading, provenance: "seed" });
    if (!saved.ok) return saved;
  }
  return { ok: true };
}
