import assert from "node:assert/strict";
import { test } from "node:test";

import { buildEmergencyMessage, type EmergencyMessageInput } from "@/lib/emergencyMessage";
import {
  CREW,
  CONSOLE_OWNER_ID,
  MEDICAL_OFFICER_ID,
  accessFor,
  crewMember,
  isConsoleOwner,
  unlockWith,
} from "@/lib/crew";

// Test values: a made-up message on mission day 212 in Mars transit.
const owner = crewMember(CONSOLE_OWNER_ID);
const other = CREW.find((c) => c.id !== CONSOLE_OWNER_ID);
assert.ok(owner && other);

const base: EmergencyMessageInput = {
  patient: owner,
  responder: other,
  scenario: "Crewmate unwell or collapsed",
  missionDay: 212,
  environment: "Mars transit",
  oneWayDelaySeconds: 720,
  sentAtUtc: "18:40:00",
  steps: [{ id: "s1", time: "18:39:10", question: "Conscious?", answer: "YES", logged: "Conscious, answers to voice" }],
  vitals: [{ name: "Heart rate", value: "65", unit: "bpm", status: "Within range", age: "today" }],
  accessLog: [],
  finished: false,
};

test("the crew has unique ids and the console owner is one of them", () => {
  assert.equal(new Set(CREW.map((c) => c.id)).size, CREW.length);
  assert.ok(isConsoleOwner(CONSOLE_OWNER_ID));
  assert.ok(!isConsoleOwner(other.id));
});

test("the message names the patient, the responder and the reply time", () => {
  const text = buildEmergencyMessage(base);
  assert.match(text, new RegExp(`PATIENT: ${owner.code}`));
  assert.match(text, new RegExp(`RESPONDER: ${other.code}`));
  assert.match(text, /earliest reply in 24 min/);
  assert.match(text, /SIMULATED DATA/);
});

test("every answered step is in the message with its time", () => {
  assert.match(buildEmergencyMessage(base), /18:39:10 {2}S1 {2}Conscious\? → YES/);
});

test("the patient's readings go in only when this console holds them", () => {
  assert.match(buildEmergencyMessage(base), /Heart rate: 65 bpm/);
  const text = buildEmergencyMessage({ ...base, patient: other, vitals: null });
  assert.doesNotMatch(text, /Heart rate/);
  assert.match(text, /Not on this console/);
});

test("a responder on the patient's console gets only the emergency view", () => {
  assert.equal(accessFor(owner.id, other.id, false), "emergency");
});

test("the patient helping themselves, or after an unlock, gets the full record", () => {
  assert.equal(accessFor(owner.id, owner.id, false), "full");
  assert.equal(accessFor(owner.id, other.id, true), "full");
});

test("another crewmember's readings are never on this console, unlocked or not", () => {
  assert.equal(accessFor(other.id, owner.id, false), "none");
  assert.equal(accessFor(other.id, owner.id, true), "none");
});

test("only the patient's or the medical officer's PIN unlocks the full record", () => {
  const cmo = crewMember(MEDICAL_OFFICER_ID);
  assert.ok(cmo);
  assert.equal(unlockWith(owner.demoPin, owner.id)?.id, owner.id);
  assert.equal(unlockWith(cmo.demoPin, owner.id)?.id, cmo.id);
  const bystander = CREW.find((c) => c.id !== owner.id && c.id !== MEDICAL_OFFICER_ID);
  assert.ok(bystander);
  assert.equal(unlockWith(bystander.demoPin, owner.id), null);
  assert.equal(unlockWith("0000", owner.id), null);
});

test("the message logs who opened the full record", () => {
  const text = buildEmergencyMessage({ ...base, accessLog: ["18:41:00 opened with CMO's PIN"] });
  assert.match(text, /FULL RECORD ACCESS:\n {2}18:41:00 opened with CMO's PIN/);
  assert.match(buildEmergencyMessage(base), /FULL RECORD ACCESS:\n {2}Not opened/);
});
