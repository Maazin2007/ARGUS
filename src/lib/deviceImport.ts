// Turns a device file (JSON or CSV) into readings, in the browser, with no server.
// Each row goes through the same input checks as a typed check-in (validateEntry),
// so a device cannot store a value a person could not type. Pure: the caller
// reads the file, passes the text in, and saves what comes back.
//
// CSV columns (header row required, any order):
//   timestamp,indicator,context,value,systolic,diastolic
// Blood pressure uses systolic and diastolic; every other indicator uses value.
// context is optional and falls back to the indicator's default.
// JSON: an array of objects with the same keys, or { "readings": [...] }.

import type { Environment, IndicatorId, Measure, Reading } from "@/lib/types";
import { INDICATORS, isIndicatorId } from "@/lib/indicatorMeta";
import { validateEntry } from "@/lib/validate";

export type DeviceRow = Partial<
  Record<"timestamp" | "indicator" | "context" | "value" | "systolic" | "diastolic", unknown>
>;

export type ImportProblem = { row: number; message: string };
// truncated: the file had more than MAX_IMPORT_ROWS rows, and only the first ones were read.
export type ImportResult = { readings: Reading[]; problems: ImportProblem[]; truncated: boolean };

export type ImportOptions = {
  environment: Environment;
  missionDayOf: (timestampMs: number) => number;
  currentMissionDay: number; // readings dated after today are refused
  existingIds: Set<string>; // ids already stored, so a file imported twice adds nothing
};

// Device times must say they are UTC ("Z") or give an offset ("+02:00"). Without
// one, the browser would read the time in its own time zone and shift the day.
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

// demo parameter: a cap so a wrong file cannot flood storage.
export const MAX_IMPORT_ROWS = 500;

const CSV_COLUMNS = ["timestamp", "indicator", "context", "value", "systolic", "diastolic"] as const;

// Simple CSV: one row per line, comma-separated, no quoted commas (device
// exports in this format have none). The first line names the columns.
export function parseCsv(text: string): DeviceRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  // Header names in any case; a byte-order mark at the start of the file is ignored.
  const header = lines[0]
    .replace(/^\uFEFF/, "")
    .split(",")
    .map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: DeviceRow = {};
    header.forEach((name, i) => {
      if ((CSV_COLUMNS as readonly string[]).includes(name) && cells[i] !== undefined && cells[i] !== "") {
        row[name as (typeof CSV_COLUMNS)[number]] = cells[i];
      }
    });
    return row;
  });
}

// The reverse, for the "download sample CSV" button.
export function toCsv(rows: DeviceRow[]): string {
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((name) => (row[name] === undefined ? "" : String(row[name]))).join(","),
  );
  return [CSV_COLUMNS.join(","), ...lines].join("\n") + "\n";
}

// Reads JSON or CSV. Returns the rows, or a message when the file cannot be read at all.
export function parseDeviceText(
  fileName: string,
  text: string,
): { ok: true; rows: DeviceRow[] } | { ok: false; message: string } {
  const trimmed = text.trim();
  const looksJson = fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{");
  if (!looksJson) return { ok: true, rows: parseCsv(text) };
  try {
    const data: unknown = JSON.parse(trimmed);
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { readings?: unknown }).readings)
        ? (data as { readings: unknown[] }).readings
        : null;
    if (!list) return { ok: false, message: "The JSON file needs a list of readings, or { \"readings\": [...] }." };
    return { ok: true, rows: list.filter((r): r is DeviceRow => !!r && typeof r === "object") };
  } catch {
    return { ok: false, message: "The file is not valid JSON or CSV." };
  }
}

// Validates one number with the same check a typed entry gets.
function checkNumber(measure: Measure, raw: unknown): { ok: true; value: number } | { ok: false; message: string } {
  return validateEntry(measure, raw === undefined || raw === null ? "" : String(raw));
}

export function rowsToReadings(rows: DeviceRow[], options: ImportOptions): ImportResult {
  const readings: Reading[] = [];
  const problems: ImportProblem[] = [];
  const seen = new Set<string>(); // ids already taken in this file

  rows.slice(0, MAX_IMPORT_ROWS).forEach((row, index) => {
    const rowNumber = index + 1;
    const problem = (message: string) => problems.push({ row: rowNumber, message });

    const indicator = String(row.indicator ?? "").trim();
    if (!isIndicatorId(indicator)) return problem(`Unknown indicator "${indicator}".`);
    const id: IndicatorId = indicator;
    const meta = INDICATORS[id];

    // Mood is how the crewmember says they feel, so it is typed in a check-in, never imported.
    if (id === "mood") return problem("Mood is a self-rating; log it in the check-in, not from a device.");

    const rawTime = String(row.timestamp ?? "").trim();
    const timeMs = Date.parse(rawTime);
    if (Number.isNaN(timeMs)) return problem("Missing or unreadable timestamp.");
    if (!HAS_ZONE.test(rawTime)) return problem(`Timestamp "${rawTime}" needs a time zone, for example 2026-11-14T20:00:00Z.`);
    const missionDay = options.missionDayOf(timeMs);
    if (missionDay > options.currentMissionDay) return problem(`Timestamp is after today (MD-${options.currentMissionDay}).`);
    if (missionDay < 0) return problem("Timestamp is before the mission started.");
    const timestamp = new Date(timeMs).toISOString();

    const context = row.context === undefined ? meta.defaultContext : String(row.context).trim();
    const allowed = [meta.defaultContext, ...(meta.contexts?.map((c) => c.context) ?? [])];
    if (!allowed.includes(context)) return problem(`${meta.name}: unknown context "${context}".`);

    // Context is part of the id: a resting and an exercise heart rate at the same time are two readings.
    const readingId = `device-${id}-${context}-${timestamp}`;
    if (options.existingIds.has(readingId)) return problem(`${meta.name} at ${timestamp} is already stored.`);
    if (seen.has(readingId)) return problem(`${meta.name} at ${timestamp} appears twice in this file.`);

    const base = {
      id: readingId,
      unit: meta.unit,
      timestamp,
      missionDay,
      environment: options.environment,
      context,
      simulated: true, // everything in the demo is simulated, device feeds included
      provenance: "device" as const,
    };

    if (id === "bloodPressure") {
      const systolic = checkNumber("systolic", row.systolic);
      if (!systolic.ok) return problem(`Systolic: ${systolic.message}`);
      const diastolic = checkNumber("diastolic", row.diastolic);
      if (!diastolic.ok) return problem(`Diastolic: ${diastolic.message}`);
      readings.push({ ...base, indicator: "bloodPressure", systolic: systolic.value, diastolic: diastolic.value });
    } else {
      const value = checkNumber(id, row.value);
      if (!value.ok) return problem(`${meta.name}: ${value.message}`);
      readings.push({ ...base, indicator: id, value: value.value });
    }
    seen.add(readingId);
  });

  return { readings, problems, truncated: rows.length > MAX_IMPORT_ROWS };
}
