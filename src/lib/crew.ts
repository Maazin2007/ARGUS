// The demo crew from src/data/crew.json. Each crewmember has their own ARGUS
// console, and a console only ever holds its owner's readings: the app never
// stores or shows another crewmember's health data.
//
// Access to a patient's readings in emergency mode, like a tax account that shows
// a little until you enter your SIN ("break-the-glass" access in healthcare):
//   none:      the patient's readings are not on this console
//   emergency: a responder sees only the vitals a rescuer needs
//   full:      the patient themselves, or anyone who entered the patient's or the
//              medical officer's PIN. Every unlock is logged.
// The PINs are demo values: code that runs in a browser cannot keep a secret.

import crewData from "@/data/crew.json";

export type CrewMember = { id: string; code: string; role: string; demoPin: string };
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

export function accessFor(patientId: string, responderId: string, unlocked: boolean): Access {
  if (!isConsoleOwner(patientId)) return "none";
  if (patientId === responderId || unlocked) return "full";
  return "emergency";
}

// Whose PIN this is, if it is the patient's or the medical officer's; otherwise null.
export function unlockWith(pin: string, patientId: string): CrewMember | null {
  const allowed = [patientId, MEDICAL_OFFICER_ID];
  return CREW.find((c) => allowed.includes(c.id) && c.demoPin === pin.trim()) ?? null;
}
