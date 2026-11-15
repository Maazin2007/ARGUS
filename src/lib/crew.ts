// The demo crew from src/data/crew.json. Each crewmember has their own ARGUS
// console, and a console only ever holds its owner's readings: the app never
// stores or shows another crewmember's health data.
//
// Access to a patient's readings in emergency mode ("break-the-glass" access in
// healthcare): private by default, opened in an emergency, and always logged.
//   none:      the patient's readings are not on this console
//   emergency: a responder sees only the vitals a rescuer needs
//   full:      the patient themselves, or a responder who opened the full record.
//              Every opening is logged and goes in the message for the ground.
// There is no PIN: a responder must not be blocked by a code they do not know, and
// code that runs in a browser cannot keep a secret anyway. The log is the safeguard.

import crewData from "@/data/crew.json";

export type CrewMember = { id: string; code: string; role: string };
export type Access = "none" | "emergency" | "full";

export const CREW = crewData.crew as CrewMember[];
export const CONSOLE_OWNER_ID: string = crewData.consoleOwnerId;
export const MEDICAL_OFFICER_ID: string = crewData.medicalOfficerId;

export function crewMember(id: string | null): CrewMember | null {
  return CREW.find((c) => c.id === id) ?? null;
}

// "MS1 · Mission specialist 1"
export function crewLabel(member: CrewMember): string {
  return `${member.code} · ${member.role}`;
}

// Whether this console holds the crewmember's readings. Only the owner's do.
export function isConsoleOwner(id: string): boolean {
  return id === CONSOLE_OWNER_ID;
}

// `opened`: a responder has opened the full record (and it was logged).
export function accessFor(patientId: string, responderId: string, opened: boolean): Access {
  if (!isConsoleOwner(patientId)) return "none";
  if (patientId === responderId || opened) return "full";
  return "emergency";
}
