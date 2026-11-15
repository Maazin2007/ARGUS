// The message for the ground in emergency mode: who needs help, who is
// responding, every step answered with its time, and the patient's latest
// readings when this console holds them (the emergency vitals only, never the full
// record), and a log of who opened the full record. Pure: the screen passes everything in.
// Privacy: only the patient's own readings can go in, and only when the patient
// owns this console. No other crewmember's health data is ever included.

import type { CrewMember } from "@/lib/crew";

export type MessageVital = { name: string; value: string; unit: string; status: string; age: string };
export type MessageStep = { id: string; time: string; question: string; answer: string; logged: string };

export type EmergencyMessageInput = {
  patient: CrewMember;
  responder: CrewMember;
  scenario: string;
  missionDay: number;
  environment: string; // display label, e.g. "Mars transit"
  oneWayDelaySeconds: number;
  sentAtUtc: string; // "HH:MM:SS"
  steps: MessageStep[];
  vitals: MessageVital[] | null; // null: the patient's readings are not on this console
  accessLog: string[]; // who opened the patient's full record, and when
  finished: boolean;
  lastActionNotDone?: boolean; // the tree ended on UNABLE
};

export function buildEmergencyMessage(input: EmergencyMessageInput): string {
  const roundTripMin = Math.ceil((input.oneWayDelaySeconds * 2) / 60);
  const lines = [
    "ARGUS EMERGENCY MESSAGE · SIMULATED DATA",
    `Sent ${input.sentAtUtc} UTC · Mission day ${input.missionDay} · ${input.environment}`,
    `Signal delay ${input.oneWayDelaySeconds} s one way · earliest reply in ${roundTripMin} min`,
    "",
    `PATIENT: ${input.patient.code} · ${input.patient.role}`,
    `RESPONDER: ${input.responder.code} · ${input.responder.role}`,
    `SITUATION: ${input.scenario}`,
    `STATUS: ${
      !input.finished
        ? "Steps in progress"
        : input.lastActionNotDone
          ? "Steps ended, LAST ACTION NOT COMPLETED, crew still acting"
          : "Steps complete, crew still acting"
    }`,
    "",
    "STEPS TAKEN:",
    ...(input.steps.length
      ? input.steps.map((s) => `  ${s.time}  ${s.id.toUpperCase()}  ${s.question} → ${s.answer} (${s.logged})`)
      : ["  None yet"]),
    "",
    "PATIENT'S LATEST READINGS:",
    ...(input.vitals
      ? input.vitals.map((v) => `  ${v.name}: ${v.value} ${v.unit} · ${v.status} · ${v.age}`)
      : ["  Not on this console: each crewmember's readings stay on their own console."]),
    "",
    "FULL RECORD ACCESS:",
    ...(input.accessLog.length ? input.accessLog.map((line) => `  ${line}`) : ["  Not opened"]),
  ];
  return lines.join("\n");
}
