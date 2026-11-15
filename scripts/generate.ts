// Writes src/data/seed.json: one simulated astronaut, one reading per
// indicator per day. Run with `npm run generate`. Same profile in, same file
// out, every run.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  BloodPressureReading,
  Environment,
  Reading,
  ValueReading,
} from "@/lib/types";
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

// Blood pressure is two numbers, so it gets its own shape.
type BloodPressureProfile = {
  unit: string;
  context: string;
  systolic: { base: number; noise: number };
  diastolic: { base: number; noise: number };
  source: string;
};

type Profile = {
  seed: number;
  environment: Environment;
  lastMissionDay: number;
  lastTimestamp: string;
  days: number;
  indicators: IndicatorProfile[];
  bloodPressure: BloodPressureProfile;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The mission day and timestamp of day number `day` (0 is the first day).
function dayInfo(profile: Profile, day: number) {
  const daysBeforeLast = profile.days - 1 - day;
  const lastTime = new Date(profile.lastTimestamp).getTime();
  return {
    missionDay: profile.lastMissionDay - daysBeforeLast,
    timestamp: new Date(lastTime - daysBeforeLast * MS_PER_DAY).toISOString(),
  };
}

function generateReadings(profile: Profile): Reading[] {
  // One generator for the whole run, so the output depends only on the seed.
  // Blood pressure comes last, so adding it did not change the numbers of the
  // indicators above it.
  const random = mulberry32(profile.seed);
  const readings: Reading[] = [];

  for (const item of profile.indicators) {
    for (let day = 0; day < profile.days; day++) {
      const { missionDay, timestamp } = dayInfo(profile, day);
      const raw = item.base + noise(random, item.noise);

      const reading: ValueReading = {
        id: `seed-${item.indicator}-${missionDay}`,
        indicator: item.indicator,
        value: Number(raw.toFixed(item.decimals)),
        unit: item.unit,
        timestamp,
        missionDay,
        environment: profile.environment,
        context: item.context,
        simulated: true,
      };
      readings.push(reading);
    }
  }

  const bp = profile.bloodPressure;
  for (let day = 0; day < profile.days; day++) {
    const { missionDay, timestamp } = dayInfo(profile, day);

    const reading: BloodPressureReading = {
      id: `seed-bloodPressure-${missionDay}`,
      indicator: "bloodPressure",
      systolic: Math.round(bp.systolic.base + noise(random, bp.systolic.noise)),
      diastolic: Math.round(
        bp.diastolic.base + noise(random, bp.diastolic.noise),
      ),
      unit: bp.unit,
      timestamp,
      missionDay,
      environment: profile.environment,
      context: bp.context,
      simulated: true,
    };
    readings.push(reading);
  }

  return readings;
}

// npm scripts always run from the project root, so this path is stable.
const OUTPUT_PATH = join(process.cwd(), "src", "data", "seed.json");

const readings = generateReadings(profileJson as Profile);
writeFileSync(OUTPUT_PATH, JSON.stringify(readings, null, 2) + "\n");
console.log(`Wrote ${readings.length} simulated readings to ${OUTPUT_PATH}`);
