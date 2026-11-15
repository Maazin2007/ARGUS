import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adjustRange,
  checkReading,
  describeRange,
  getStatus,
} from "@/lib/status";
import type {
  BloodPressureReading,
  IndicatorRule,
  Reading,
  ValueReading,
} from "@/lib/types";

const now = new Date("2026-11-14T13:05:00Z");

// Test rules with easy numbers (labelled as test values per plan/BACKEND.md).
const testRules: IndicatorRule[] = [
  {
    measure: "heartRate",
    context: "resting",
    unit: "bpm",
    earthRange: { low: 60, high: 100, source: "test value" },
    criticalLimit: { low: 40, high: 150, source: "test value" },
    baselineFloor: 10,
    adjustments: [],
  },
  {
    measure: "bodyTemperature",
    context: "resting",
    unit: "°C",
    earthRange: { low: 36, high: 37, source: "test value" },
    criticalLimit: { low: 35, high: 39, source: "test value" },
    baselineFloor: 0.3,
    adjustments: [
      {
        environments: ["station", "marsTransit"],
        shift: 1,
        rampDays: 75,
        source: "test value",
        note: "Test adjustment",
      },
    ],
  },
  {
    measure: "systolic",
    context: "resting",
    unit: "mmHg",
    earthRange: { low: 90, high: 120, source: "test value" },
    criticalLimit: { low: 70, high: 180, source: "test value" },
    baselineFloor: 10,
    adjustments: [
      {
        environments: ["station", "marsTransit"],
        shift: -8,
        rampDays: 75,
        source: "test value",
        note: "Test adjustment",
      },
    ],
  },
  {
    measure: "diastolic",
    context: "resting",
    unit: "mmHg",
    earthRange: { low: 60, high: 80, source: "test value" },
    criticalLimit: { low: 40, high: 120, source: "test value" },
    baselineFloor: 8,
    adjustments: [
      {
        environments: ["station", "marsTransit"],
        shift: -9,
        rampDays: 75,
        source: "test value",
        note: "Test adjustment",
      },
    ],
  },
  {
    measure: "sleepDuration",
    context: "daily",
    unit: "h",
    earthRange: { low: 7, high: null, source: "test value" },
    criticalLimit: null, // sleep has no red rule
    baselineFloor: 1,
    adjustments: [],
  },
];

const restingHeartRate: Reading = {
  id: "r-001",
  indicator: "heartRate",
  value: 72,
  unit: "bpm",
  timestamp: "2026-11-14T13:00:00Z",
  missionDay: 212,
  environment: "marsTransit",
  context: "resting",
  simulated: false,
};

const lateMissionTemperature: Reading = {
  id: "r-002",
  indicator: "bodyTemperature",
  value: 37.6,
  unit: "°C",
  timestamp: "2026-11-14T13:00:00Z",
  missionDay: 212,
  environment: "marsTransit",
  context: "resting",
  simulated: false,
};

const restingBloodPressure: BloodPressureReading = {
  id: "r-003",
  indicator: "bloodPressure",
  systolic: 110,
  diastolic: 70,
  unit: "mmHg",
  timestamp: "2026-11-14T13:00:00Z",
  missionDay: 0,
  environment: "earth",
  context: "resting",
  simulated: false,
};

function makeHrHistory(
  values: number[],
  endDateIso = "2026-11-14T12:00:00Z",
): ValueReading[] {
  const endMs = new Date(endDateIso).getTime();
  return values.map((val, idx) => {
    const daysAgo = values.length - idx;
    const ts = new Date(endMs - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: `hr-${idx + 1}`,
      indicator: "heartRate",
      value: val,
      unit: "bpm",
      timestamp: ts,
      missionDay: 212 - daysAgo,
      environment: "marsTransit",
      context: "resting",
      simulated: false,
    };
  });
}

test("getStatus returns the agreed shape", () => {
  const result = getStatus(restingHeartRate, [], "marsTransit", 212, now);
  assert.ok(["green", "amber", "red", "unknown"].includes(result.status));
  assert.ok(result.reasons.length > 0);
  assert.equal(typeof result.criticalLimitCrossed, "boolean");
});

test("unsupported context returns unknown", () => {
  const exerciseReading: Reading = {
    ...restingHeartRate,
    context: "exercise",
    value: 140,
  };
  const result = checkReading(
    exerciseReading,
    [],
    testRules,
    "earth",
    0,
    now,
  );
  assert.equal(result.status, "unknown");
  assert.equal(result.criticalLimitCrossed, false);
});

test("stale reading returns unknown", () => {
  const staleReading: Reading = {
    ...restingHeartRate,
    timestamp: "2026-11-10T13:00:00Z", // 4 days (96 hours) before `now`
  };
  const result = checkReading(staleReading, [], testRules, "earth", 0, now);
  assert.equal(result.status, "unknown");
});

test("reading crossing criticalLimit returns red with plain-language reason", () => {
  const highReading: Reading = {
    ...restingHeartRate,
    value: 165,
  };
  const result = checkReading(highReading, [], testRules, "earth", 0, now);
  assert.equal(result.status, "red");
  assert.equal(result.criticalLimitCrossed, true);
  assert.deepEqual(result.reasons, [
    "Heart rate 165 bpm is above the critical limit of 150 bpm.",
  ]);
});

test("reading outside reference range returns amber with plain-language reason", () => {
  const elevatedReading: Reading = {
    ...restingHeartRate,
    value: 115,
  };
  const result = checkReading(elevatedReading, [], testRules, "earth", 0, now);
  assert.equal(result.status, "amber");
  assert.equal(result.criticalLimitCrossed, false);
  assert.deepEqual(result.reasons, [
    "Heart rate 115 bpm is above the reference range of 60 to 100 bpm.",
  ]);
});

test("one-sided range formats reason without printing null", () => {
  const shortSleep: Reading = {
    id: "r-sleep",
    indicator: "sleepDuration",
    value: 5,
    unit: "h",
    timestamp: "2026-11-14T13:00:00Z",
    missionDay: 0,
    environment: "earth",
    context: "daily",
    simulated: false,
  };
  const result = checkReading(shortSleep, [], testRules, "earth", 0, now);
  assert.equal(result.status, "amber");
  assert.deepEqual(result.reasons, [
    "Sleep duration 5 h is below the reference of at least 7 h.",
  ]);
  assert.equal(
    describeRange({ low: null, high: 140 }, "mg/dL", "reference"),
    "the reference of at most 140 mg/dL",
  );
});

test("reading inside reference range returns green and notes when baseline is not ready", () => {
  const result = checkReading(restingHeartRate, [], testRules, "earth", 0, now);
  assert.equal(result.status, "green");
  assert.equal(result.baseline, null);
  assert.ok(result.reasons.includes("Baseline not available yet."));
});

test("mission day 0 gives the unadjusted Earth range", () => {
  const tempRule = testRules[1];
  const range = adjustRange(tempRule, "marsTransit", 0);
  assert.equal(range.low, 36);
  assert.equal(range.high, 37);
  assert.equal(range.adjusted, false);
});

test("mission day past rampDays gives the full shift", () => {
  const tempRule = testRules[1];
  const range = adjustRange(tempRule, "marsTransit", 212);
  assert.equal(range.low, 36); // a positive shift leaves the lower limit at the Earth value
  assert.equal(range.high, 38);
  assert.equal(range.adjusted, true);
});

test("late-mission temperature that is amber on Earth is green after space adjustment", () => {
  const onEarth = checkReading(
    lateMissionTemperature,
    [],
    testRules,
    "earth",
    212,
    now,
  );
  assert.equal(onEarth.status, "amber");
  assert.equal(onEarth.referenceRange?.adjusted, false);

  const inTransit = checkReading(
    lateMissionTemperature,
    [],
    testRules,
    "marsTransit",
    212,
    now,
  );
  assert.equal(inTransit.status, "green");
  assert.equal(inTransit.referenceRange?.adjusted, true);
});

test("temperature above criticalLimit stays red even after space adjustment", () => {
  const criticalFever: Reading = {
    ...lateMissionTemperature,
    value: 39.5,
  };
  const result = checkReading(
    criticalFever,
    [],
    testRules,
    "marsTransit",
    212,
    now,
  );
  assert.equal(result.status, "red");
  assert.equal(result.criticalLimitCrossed, true);
});

test("three consecutive readings outside the personal baseline return amber, never red", () => {
  const history = makeHrHistory([60, 60, 60, 60, 60, 85, 86]);
  const thirdDeviating: Reading = {
    ...restingHeartRate,
    value: 87,
  };
  const result = checkReading(
    thirdDeviating,
    history,
    testRules,
    "marsTransit",
    212,
    now,
  );
  assert.equal(result.status, "amber");
  assert.equal(result.criticalLimitCrossed, false);
  assert.deepEqual(result.baseline, { low: 50, high: 70, count: 5 });
  assert.deepEqual(result.reasons, [
    "Heart rate 87 bpm and the two prior readings are outside the personal baseline range of 50 to 70 bpm.",
  ]);
});

test("two readings outside the personal baseline followed by a third inside return green", () => {
  const history = makeHrHistory([60, 60, 60, 60, 60, 85, 86]);
  const thirdInside: Reading = {
    ...restingHeartRate,
    value: 64,
  };
  const result = checkReading(
    thirdInside,
    history,
    testRules,
    "marsTransit",
    212,
    now,
  );
  assert.equal(result.status, "green");
  assert.equal(result.criticalLimitCrossed, false);
});

test("blood pressure returns green when both systolic and diastolic are within range", () => {
  const result = checkReading(
    restingBloodPressure,
    [],
    testRules,
    "earth",
    0,
    now,
  );
  assert.equal(result.status, "green");
  assert.equal(result.criticalLimitCrossed, false);
});

test("blood pressure returns the worse status and combines plain-language reasons without green filler", () => {
  const mixedBp: BloodPressureReading = {
    ...restingBloodPressure,
    systolic: 110, // green
    diastolic: 130, // red (above criticalLimit 120)
  };
  const result = checkReading(mixedBp, [], testRules, "earth", 0, now);
  assert.equal(result.status, "red");
  assert.equal(result.criticalLimitCrossed, true);
  assert.deepEqual(result.reasons, [
    "Diastolic blood pressure 130 mmHg is above the critical limit of 120 mmHg.",
  ]);
});

// Rules with no reference range (test values). Green needs a range check, so these never return green.
const noRangeRules: IndicatorRule[] = [
  {
    measure: "bloodGlucose",
    context: "fasting",
    unit: "mg/dL",
    earthRange: { low: null, high: null, source: "test value" },
    criticalLimit: null,
    baselineFloor: null,
    adjustments: [],
  },
  {
    measure: "systolic",
    context: "resting",
    unit: "mmHg",
    earthRange: { low: null, high: null, source: "test value" },
    criticalLimit: { low: null, high: 180, source: "test value" },
    baselineFloor: null,
    adjustments: [],
  },
  {
    measure: "diastolic",
    context: "resting",
    unit: "mmHg",
    earthRange: { low: null, high: null, source: "test value" },
    criticalLimit: { low: null, high: 120, source: "test value" },
    baselineFloor: null,
    adjustments: [],
  },
];

test("rule with no reference range and no critical limit returns unknown, never green", () => {
  const highGlucose: Reading = {
    ...restingHeartRate,
    indicator: "bloodGlucose",
    value: 400,
    unit: "mg/dL",
    context: "fasting",
  };
  const result = checkReading(highGlucose, [], noRangeRules, "earth", 0, now);
  assert.equal(result.status, "unknown");
  assert.equal(result.referenceRange, null);
  assert.deepEqual(result.reasons, [
    "Blood glucose has no reference range yet, so this reading was not checked.",
  ]);
});

test("rule with only a critical limit returns unknown below the limit", () => {
  const highBp: BloodPressureReading = {
    ...restingBloodPressure,
    systolic: 170,
    diastolic: 110,
  };
  const result = checkReading(highBp, [], noRangeRules, "earth", 0, now);
  assert.equal(result.status, "unknown");
  assert.equal(result.criticalLimitCrossed, false);
  assert.deepEqual(result.reasons, [
    "Systolic blood pressure has no reference range yet. Only the critical limit was checked.",
    "Diastolic blood pressure has no reference range yet. Only the critical limit was checked.",
  ]);
});

test("rule with only a critical limit still returns red past the limit", () => {
  const crisisBp: BloodPressureReading = {
    ...restingBloodPressure,
    systolic: 190,
    diastolic: 110,
  };
  const result = checkReading(crisisBp, [], noRangeRules, "earth", 0, now);
  assert.equal(result.status, "red");
  assert.equal(result.criticalLimitCrossed, true);
});

test("a negative shift lowers the lower limit and leaves the upper limit", () => {
  const systolicRule = testRules[2]; // 90 to 120, shift -8
  const range = adjustRange(systolicRule, "marsTransit", 212);
  assert.equal(range.low, 82);
  assert.equal(range.high, 120);
  assert.equal(range.adjusted, true);
});

test("a temperature that is ordinary on Earth stays green late in the mission", () => {
  const ordinary: Reading = { ...lateMissionTemperature, value: 36.8 };
  const result = checkReading(ordinary, [], testRules, "marsTransit", 212, now);
  assert.equal(result.status, "green");
});

test("late-mission blood pressure that is amber-low on Earth is green in Mars transit after Norsk adjustment", () => {
  const inFlightBp: BloodPressureReading = {
    ...restingBloodPressure,
    systolic: 85,
    diastolic: 55,
    missionDay: 212,
    environment: "marsTransit",
  };
  const onEarth = getStatus(inFlightBp, [], "earth", 212, now);
  const inTransit = getStatus(inFlightBp, [], "marsTransit", 212, now);

  assert.equal(onEarth.status, "amber");
  assert.equal(inTransit.status, "green");
  assert.equal(inTransit.referenceRange?.adjusted, true);
  assert.equal(inTransit.referenceRange?.low, 82);
  assert.equal(inTransit.referenceRange?.high, 119);
});
