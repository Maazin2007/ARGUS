import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  saveReading,
  getReadings,
  saveCheckIn,
  getCheckIns,
  clearAll,
} from "@/lib/storage";

import type { Reading, CheckIn } from "@/lib/types";

// Simple fake browser storage for Node.js tests.
const data = new Map<string, string>();

const localStorageMock = {
  getItem(key: string) {
    return data.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    data.set(key, value);
  },
  removeItem(key: string) {
    data.delete(key);
  },
  clear() {
    data.clear();
  },
};

// storage.ts checks for window before accessing localStorage.
Object.defineProperty(globalThis, "window", {
  value: globalThis,
  configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
});

beforeEach(() => {
  data.clear();
});

const reading: Reading = {
  id: "r1",
  indicator: "heartRate",
  value: 75,
  unit: "bpm",
  timestamp: "2026-11-14T10:00:00Z",
  missionDay: 1,
  environment: "station",
  context: "resting",
  simulated: true,
};

test("saves and retrieves a reading", () => {
  saveReading(reading);

  assert.deepEqual(getReadings(), [reading]);
});

test("returns readings sorted oldest first", () => {
  const later: Reading = {
    ...reading,
    id: "r2",
    timestamp: "2026-11-14T12:00:00Z",
  };

  saveReading(later);
  saveReading(reading);

  assert.deepEqual(getReadings(), [reading, later]);
});

test("filters readings by indicator", () => {
  const glucose: Reading = {
    ...reading,
    id: "r3",
    indicator: "bloodGlucose",
    value: 90,
    unit: "mg/dL",
    context: "fasting",
  };

  saveReading(reading);
  saveReading(glucose);

  assert.deepEqual(getReadings("heartRate"), [reading]);
  assert.deepEqual(getReadings("bloodGlucose"), [glucose]);
});

test("saves and retrieves check-ins", () => {
  const checkIn: CheckIn = {
    id: "c1",
    timestamp: "2026-11-14T10:00:00Z",
    selfRating: 4,
  };

  saveCheckIn(checkIn);

  assert.deepEqual(getCheckIns(), [checkIn]);
});

test("clearAll removes readings and check-ins", () => {
  const checkIn: CheckIn = {
    id: "c1",
    timestamp: "2026-11-14T10:00:00Z",
    selfRating: 3,
  };

  saveReading(reading);
  saveCheckIn(checkIn);

  clearAll();

  assert.deepEqual(getReadings(), []);
  assert.deepEqual(getCheckIns(), []);
});

test("invalid stored JSON returns an empty array", () => {
  data.set("argus.readings", "invalid JSON");
  data.set("argus.checkIns", "invalid JSON");

  assert.deepEqual(getReadings(), []);
  assert.deepEqual(getCheckIns(), []);
});
