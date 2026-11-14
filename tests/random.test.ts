import assert from "node:assert/strict";
import { test } from "node:test";
import { mulberry32, noise } from "../scripts/random";

function firstFive(random: () => number): number[] {
  return [random(), random(), random(), random(), random()];
}

test("the same seed gives the same numbers", () => {
  assert.deepEqual(firstFive(mulberry32(42)), firstFive(mulberry32(42)));
});

test("different seeds give different numbers", () => {
  assert.notDeepEqual(firstFive(mulberry32(1)), firstFive(mulberry32(2)));
});

test("numbers stay between 0 and 1", () => {
  const random = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const value = random();
    assert.ok(value >= 0 && value < 1);
  }
});

test("noise stays within plus or minus its size", () => {
  const random = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    assert.ok(Math.abs(noise(random, 3)) <= 3);
  }
});
