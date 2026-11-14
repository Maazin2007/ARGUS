// Writes src/data/seed.json: one simulated astronaut, one reading per
// indicator per day. Run with `npm run generate`. Same profile in, same file
// out, every run.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Environment, ValueReading } from "@/lib/types";
import { mulberry32, noise } from "./random";
import profileJson from "./profiles/demo.json";

type IndicatorProfile = {
  indicator: ValueReading["indicator"];
  unit: string;
  context: string;
  base: number; // the astronaut's usual value
  noise: number; // each day lands within base ± noise
  decimals: number;
  source: string;
};

type Profile = {
  seed: number;
  environment: Environment;
  lastMissionDay: number;
  lastTimestamp: string;
  days: number;
  indicators: IndicatorProfile[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function generateReadings(profile: Profile): ValueReading[] {
  // One generator for the whole run, so the output depends only on the seed.
  const random = mulberry32(profile.seed);
  const lastTime = new Date(profile.lastTimestamp).getTime();
  const readings: ValueReading[] = [];

  for (const item of profile.indicators) {
    for (let day = 0; day < profile.days; day++) {
      const daysBeforeLast = profile.days - 1 - day;
      const missionDay = profile.lastMissionDay - daysBeforeLast;
      const raw = item.base + noise(random, item.noise);

      readings.push({
        id: `seed-${item.indicator}-${missionDay}`,
        indicator: item.indicator,
        value: Number(raw.toFixed(item.decimals)),
        unit: item.unit,
        timestamp: new Date(
          lastTime - daysBeforeLast * MS_PER_DAY,
        ).toISOString(),
        missionDay,
        environment: profile.environment,
        context: item.context,
        simulated: true,
      });
    }
  }
  return readings;
}

// npm scripts always run from the project root, so this path is stable.
const OUTPUT_PATH = join(process.cwd(), "src", "data", "seed.json");

const readings = generateReadings(profileJson as Profile);
writeFileSync(OUTPUT_PATH, JSON.stringify(readings, null, 2) + "\n");
console.log(`Wrote ${readings.length} simulated readings to ${OUTPUT_PATH}`);
