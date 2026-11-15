import test from "node:test";
import assert from "node:assert/strict";
import { validateEntry } from "@/lib/validate";

test("accepts a valid heart rate", () => {
  assert.deepEqual(validateEntry("heartRate", "72"), { ok: true, value: 72 });
});

test("rejects nonnumeric input", () => {
  const result = validateEntry("heartRate", "hello");
  assert.equal(result.ok, false);
});

test("rejects a fractional mood rating", () => {
  const result = validateEntry("mood", "3.5");
  assert.equal(result.ok, false);
});

test("rejects empty input", () => {
  assert.equal(validateEntry("heartRate", "").ok, false);
});

test("rejects negative heart rate", () => {
  assert.equal(validateEntry("heartRate", "-50").ok, false);
});

test("rejects implausibly high heart rate", () => {
  assert.equal(validateEntry("heartRate", "900").ok, false);
});

test("accepts decimal body temperature", () => {
  assert.deepEqual(validateEntry("bodyTemperature", "37.5"), {
    ok: true,
    value: 37.5,
  });
});

test("rejects exponent and hex notation", () => {
  assert.equal(validateEntry("heartRate", "1e2").ok, false);
  assert.equal(validateEntry("heartRate", "0x48").ok, false);
});

test("accepts a value with spaces around it", () => {
  assert.deepEqual(validateEntry("heartRate", " 72 "), { ok: true, value: 72 });
});
