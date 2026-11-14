import assert from "node:assert/strict";
import { test } from "node:test";
import { median, spread } from "@/lib/baseline";

test("median returns the middle value for an odd count", () => {
  assert.equal(median([80, 70, 72]), 72);
});

test("median returns the average of the two middle values for an even count", () => {
  assert.equal(median([70, 80, 72, 74]), 73);
});

test("median returns the value itself for a single number", () => {
  assert.equal(median([65]), 65);
});

test("median is not pulled by one extreme outlier", () => {
  assert.equal(median([70, 71, 72, 73, 500]), 72);
});

test("spread returns 0 when all numbers are identical", () => {
  assert.equal(spread([70, 70, 70]), 0);
});

test("spread returns the median absolute deviation from the median", () => {
  // Median is 70; distances from 70 are [2, 0, 5], which has a median of 2.
  assert.equal(spread([68, 70, 75]), 2);
});

test("spread is not pulled by one extreme outlier", () => {
  // Median is 72; distances are [2, 1, 0, 1, 428], which has a median of 1.
  assert.equal(spread([70, 71, 72, 73, 500]), 1);
});
