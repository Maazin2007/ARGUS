// Fills storage with the simulated demo astronaut from seed.json, so the pitch
// never starts from an empty dashboard. Every seed reading is marked
// `simulated: true`, which keeps the "Simulated data" tags on screen.

import seed from "@/data/seed.json";
import { clearAll, saveReading } from "@/lib/storage";
import type { Reading } from "@/lib/types";

// Replaces whatever is stored: saved readings and check-ins are cleared first.
export function loadDemoProfile(): void {
  clearAll();
  for (const reading of seed as Reading[]) saveReading(reading);
}
