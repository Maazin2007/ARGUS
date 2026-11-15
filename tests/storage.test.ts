import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  saveReading,
  getReadings,
  saveCheckIn,
  getCheckIns,
  clearAll,
  getActiveCrewId,
  setActiveCrewId,
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

test("a full or blocked storage returns a message instead of throwing", () => {
  const realSetItem = localStorageMock.setItem;
  localStorageMock.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  const realConsoleError = console.error;
  console.error = () => {}; // keep the expected error out of the test output

  try {
    const savedReading = saveReading(reading);
    const savedCheckIn = saveCheckIn({ id: "c1", timestamp: "2026-11-14T10:00:00Z", selfRating: 4 });

    assert.equal(savedReading.ok, false);
    assert.equal(savedCheckIn.ok, false);
    assert.deepEqual(getReadings(), []);
  } finally {
    localStorageMock.setItem = realSetItem;
    console.error = realConsoleError;
  }
});

test("a successful save returns ok", () => {
  assert.deepEqual(saveReading(reading), { ok: true });
});

test("clearAll returns a message instead of throwing when storage is blocked", () => {
  const realRemoveItem = localStorageMock.removeItem;
  localStorageMock.removeItem = () => {
    throw new Error("SecurityError");
  };
  const realConsoleError = console.error;
  console.error = () => {};

  try {
    const cleared = clearAll();
    assert.equal(cleared.ok, false);
  } finally {
    localStorageMock.removeItem = realRemoveItem;
    console.error = realConsoleError;
  }
});

test("each crewmember's readings are stored separately", () => {
  saveReading(reading, "cdr");

  assert.deepEqual(getReadings(undefined, "cdr"), [reading]);
  assert.deepEqual(getReadings(undefined, "plt"), []);
});

test("readings follow the active crewmember", () => {
  setActiveCrewId("cdr");
  saveReading(reading);
  setActiveCrewId("plt");

  assert.equal(getActiveCrewId(), "plt");
  assert.deepEqual(getReadings(), []);
  assert.deepEqual(getReadings(undefined, "cdr"), [reading]);

  setActiveCrewId(null);
  assert.equal(getActiveCrewId(), null);
});
