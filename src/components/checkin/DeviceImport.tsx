"use client";

// Device import: the crew picks a JSON or CSV file exported by a sensor, the
// browser reads it (FileReader, no server), every row gets the same input checks
// as a typed entry, and the valid ones are saved with provenance "device".

import { useRef, useState } from "react";
import type { Reading } from "@/lib/types";
import { INDICATORS, formatReading } from "@/lib/indicatorMeta";
import {
  parseDeviceText,
  rowsToReadings,
  toCsv,
  MAX_IMPORT_ROWS,
  type DeviceRow,
  type ImportProblem,
} from "@/lib/deviceImport";
import { saveReading } from "@/lib/storage";
import { missionDayOf, useArgus } from "@/components/ArgusProvider";
import samplePacket from "@/data/sampleDevicePacket.json";

type Summary = { fileName: string; saved: Reading[]; problems: ImportProblem[]; truncated: boolean };

const SAMPLE_ROWS = samplePacket.readings as DeviceRow[];

export function DeviceImport() {
  const { environment, missionDay, readings, reload, setStorageError } = useArgus();
  const [summary, setSummary] = useState<Summary | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Validates the rows, saves the good ones, and shows what happened.
  function importRows(fileName: string, rows: DeviceRow[]) {
    const { readings: parsed, problems, truncated } = rowsToReadings(rows, {
      environment,
      missionDayOf,
      currentMissionDay: missionDay,
      existingIds: new Set(readings.map((r) => r.id)),
    });
    const saved: Reading[] = [];
    for (const reading of parsed) {
      const result = saveReading(reading);
      if (!result.ok) {
        setStorageError(result.message);
        break;
      }
      saved.push(reading);
    }
    setSummary({ fileName, saved, problems, truncated });
    reload();
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseDeviceText(file.name, String(reader.result ?? ""));
      if (!parsed.ok) {
        setSummary({ fileName: file.name, saved: [], problems: [{ row: 0, message: parsed.message }], truncated: false });
        return;
      }
      importRows(file.name, parsed.rows);
    };
    reader.onerror = () =>
      setSummary({ fileName: file.name, saved: [], problems: [{ row: 0, message: "The file could not be read." }], truncated: false });
    reader.readAsText(file);
    event.target.value = ""; // so picking the same file again fires onChange
  }

  // Downloads the sample packet as CSV, to show judges the file format.
  function downloadSample() {
    const blob = new Blob([toCsv(SAMPLE_ROWS)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "argus-sample-device-packet.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cell c12">
      <div className="head">
        <h2>Device import</h2>
        <span className="pill">Simulated data</span>
      </div>
      <div className="stack">
        <p className="note" style={{ margin: 0 }}>
          Load readings exported by a sensor as a JSON or CSV file. The file is read in this
          browser only. Each row gets the same input checks as a typed entry, and imported
          readings are marked &ldquo;Device import&rdquo;. Columns: timestamp, indicator, context,
          value (or systolic and diastolic for blood pressure).
        </p>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <input
            ref={fileInput}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            onChange={onFile}
            hidden
          />
          <button type="button" className="btn btn-pri" onClick={() => fileInput.current?.click()}>
            Import device file (JSON / CSV)
          </button>
          <button type="button" className="btn" onClick={() => importRows("Sample sensor packet", SAMPLE_ROWS)}>
            Load sample sensor packet
          </button>
          <button type="button" className="btn btn-ghost" onClick={downloadSample}>
            Download sample CSV
          </button>
        </div>
        {/* The status region is always in the page, so screen readers announce new text in it. */}
        <div role="status" className="stack">
        {summary ? (
          <>
            <p style={{ margin: 0 }}>
              <strong>{summary.fileName}:</strong> {summary.saved.length} reading
              {summary.saved.length === 1 ? "" : "s"} imported, {summary.problems.length} skipped.
              {summary.truncated ? ` Only the first ${MAX_IMPORT_ROWS} rows were read.` : ""}
            </p>
            {summary.saved.length ? (
              <ul className="note" style={{ margin: 0, paddingLeft: 36 }}>
                {summary.saved.map((r) => (
                  <li key={r.id}>
                    {INDICATORS[r.indicator].name}: {formatReading(r)} {r.unit} · MD-{r.missionDay} ·{" "}
                    {r.timestamp.slice(11, 16)} UTC · Device import
                  </li>
                ))}
              </ul>
            ) : null}
            {summary.problems.length ? (
              <ul className="note" style={{ margin: 0, paddingLeft: 36 }}>
                {summary.problems.map((p, i) => (
                  <li key={i}>
                    {p.row ? `Row ${p.row}: ` : ""}
                    {p.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
        </div>
      </div>
    </div>
  );
}
