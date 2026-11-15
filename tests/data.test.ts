import test from "node:test";
import assert from "node:assert/strict";

import rules from "../src/data/indicators.json";
import type { IndicatorRule } from "../src/lib/types";

const indicators = rules as IndicatorRule[];

test("indicator rules are not empty", () => {
  assert.ok(indicators.length > 0);
});

test("indicator rules have sources", () => {
  for (const rule of indicators) {
    assert.ok(rule.earthRange.source.trim());

    if (rule.criticalLimit) {
      assert.ok(rule.criticalLimit.source.trim());
    }

    for (const adjustment of rule.adjustments) {
      assert.ok(adjustment.source.trim());
    }
  }
});

test("indicator sources are complete", () => {
  for (const rule of indicators) {
    assert.ok(
      !rule.earthRange.source.toUpperCase().includes("PENDING"),
      `${rule.measure} has an unfinished source`,
    );
  }
});

test("indicator ranges are ordered correctly", () => {
  for (const rule of indicators) {
    const { low, high } = rule.earthRange;

    if (low !== null && high !== null) {
      assert.ok(low < high);
    }

    if (rule.criticalLimit) {
      const { low, high } = rule.criticalLimit;

      if (low !== null && high !== null) {
        assert.ok(low < high);
      }
    }
  }
});

test("indicator rules have no duplicate measure and context", () => {
  const keys = indicators.map((rule) => `${rule.measure}:${rule.context}`);

  assert.equal(new Set(keys).size, keys.length);
});

test("heart rate and sleep rules are present", () => {
  assert.ok(
    indicators.some(
      (rule) =>
        rule.measure === "heartRate" &&
        rule.context === "resting" &&
        rule.unit === "bpm",
    ),
  );

  assert.ok(
    indicators.some(
      (rule) =>
        rule.measure === "sleepDuration" &&
        rule.context === "dailyTotal18to60" &&
        rule.unit === "hours",
    ),
  );
});
