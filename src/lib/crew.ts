// The demo crew from src/data/crew.json. ARGUS runs as one shared console on the
// ship: it holds every crewmember's readings, and each person taps their name to
// use it. There is no password, because code that runs in a browser cannot keep a
// secret. Privacy comes from what is shown:
//   - On an ordinary day a crewmate sees only a status word and the last check-in.
//   - In emergency mode a responder sees the vitals a rescuer needs ("emergency").
//   - The full record is shown to the patient themselves, or to a responder who
//     opens it with one tap ("break-the-glass" access in healthcare). Every opening
//     is logged and goes in the message for the ground.

import crewData from "@/data/crew.json";

// Demo parameters that shape a crewmember's simulated readings (src/lib/demoProfile.ts).
export type CrewDemo = {
  // Added to every simulated reading of that measure, so each crewmember has their own usual values.
  offsets?: Partial<
    Record<"heartRate" | "bodyTemperature" | "systolic" | "diastolic" | "bloodGlucose" | "sleepDuration", number>
  >;
  lastDayTemperature?: number; // replaces the newest body temperature (a fever for the demo)
  lastDaySleep?: number; // replaces the newest sleep duration (a short night for the demo)
  missedLastDays?: number; // drops the newest days, so the check-in shows as overdue
};

export type CrewMember = { id: string; code: string; role: string; demo: CrewDemo };
export type Access = "emergency" | "full";

export const CREW = crewData.crew as CrewMember[];
// Who is selected when nobody has chosen yet (also the default for stored data).
export const CONSOLE_OWNER_ID: string = crewData.consoleOwnerId;
export const MEDICAL_OFFICER_ID: string = crewData.medicalOfficerId;

export function crewMember(id: string | null): CrewMember | null {
  return CREW.find((c) => c.id === id) ?? null;
}

// "MS1 · Mission specialist 1"
export function crewLabel(member: CrewMember): string {
  return `${member.code} · ${member.role}`;
}

// `opened`: a responder has opened the full record (and it was logged).
export function accessFor(patientId: string, responderId: string, opened: boolean): Access {
  return patientId === responderId || opened ? "full" : "emergency";
}
