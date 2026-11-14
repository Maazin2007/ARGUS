import assert from "node:assert/strict";
import { test } from "node:test";
import { checkFeelVsData, FEEL_VS_DATA_MESSAGE } from "@/lib/feelVsData";

test("feeling good with an amber status returns the message", () => {
  assert.equal(checkFeelVsData(4, ["green", "amber"]), FEEL_VS_DATA_MESSAGE);
});

test("feeling good with a red status returns the message", () => {
  assert.equal(checkFeelVsData(5, ["red", "green"]), FEEL_VS_DATA_MESSAGE);
});

test("feeling unwell with every status green returns the message", () => {
  assert.equal(checkFeelVsData(1, ["green", "green"]), FEEL_VS_DATA_MESSAGE);
  assert.equal(checkFeelVsData(2, ["green"]), FEEL_VS_DATA_MESSAGE);
});

test("feeling good with every status green returns null", () => {
  assert.equal(checkFeelVsData(5, ["green", "green"]), null);
});

test("feeling unwell with an amber status returns null", () => {
  assert.equal(checkFeelVsData(1, ["green", "amber"]), null);
});

test("feeling unwell with an unknown status returns null", () => {
  assert.equal(checkFeelVsData(2, ["green", "unknown"]), null);
});

test("feeling good with only unknown statuses returns null", () => {
  assert.equal(checkFeelVsData(5, ["unknown", "unknown"]), null);
});

test("a middle rating of 3 always returns null", () => {
  assert.equal(checkFeelVsData(3, ["red"]), null);
  assert.equal(checkFeelVsData(3, ["green"]), null);
});

test("no statuses returns null", () => {
  assert.equal(checkFeelVsData(1, []), null);
  assert.equal(checkFeelVsData(5, []), null);
});
