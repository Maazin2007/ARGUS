"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CheckIn, Reading } from "@/lib/types";
import { INDICATORS } from "@/lib/indicatorMeta";
import { getCheckIns, getReadings, saveCheckIn, saveReading } from "@/lib/storage";
import { checkInTime } from "@/lib/checkInTime";
import { Screen } from "@/components/Screen";
import { useArgus } from "@/components/ArgusProvider";
import { CHECK_IN_STEPS, type CheckInStep, type LogEntry } from "@/components/checkin/steps";
import { StepPanel } from "@/components/checkin/StepPanel";
import {
  CheckInResults,
  useResultRows,
  type DraftResult,
} from "@/components/checkin/CheckInResults";

type Results = { drafts: DraftResult[]; selfRating: CheckIn["selfRating"]; timestamp: string };

const EMPTY_LOG: (LogEntry | null)[] = CHECK_IN_STEPS.map(() => null);

// Turns one logged step into a Reading. Runs inside a click handler, because
// crypto.randomUUID() may not run during rendering.
function buildReading(
  step: CheckInStep,
  entry: LogEntry,
  base: Pick<Reading, "timestamp" | "missionDay" | "environment">,
): Reading | null {
  if (!step.indicator || entry.skipped) return null;
  const meta = INDICATORS[step.indicator];
  // Backend context string for the chosen button; sleep and mood have no buttons.
  const context =
    meta.contexts?.find((c) => c.label === entry.context)?.context ?? meta.defaultContext;
  const common = {
    ...base,
    id: crypto.randomUUID(),
    unit: meta.unit,
    context,
    simulated: true, // demo profile: everything entered here joins the simulated history
    provenance: "manual" as const, // typed in by the crew
  };
  if (step.indicator === "bloodPressure") {
    return {
      ...common,
      indicator: "bloodPressure",
      systolic: Number(entry.raw[0]),
      diastolic: Number(entry.raw[1]),
    };
  }
  return { ...common, indicator: step.indicator, value: Number(entry.raw[0]) };
}

export function CheckInScreen() {
  const router = useRouter();
  const { environment, missionDay, statusTime, lastCheckInDay, readings, reload, setStorageError } =
    useArgus();
  const [cur, setCur] = useState(0);
  const [log, setLog] = useState<(LogEntry | null)[]>(EMPTY_LOG);
  const [results, setResults] = useState<Results | null>(null);
  // Bumped on reset so the step panel remounts with fresh inputs even if `cur` stays 0.
  const [round, setRound] = useState(0);
  const [lastSelfRating, setLastSelfRating] = useState<string | null>(null);

  // The previous self-rating, for the "Last reading" box on the last step.
  // Storage is read after the first paint (CODING_STANDARDS.md), hence the effect.
  useEffect(() => {
    const checkIns = getCheckIns();
    const last = checkIns[checkIns.length - 1];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSelfRating(
      last ? `${last.selfRating} of 5${lastCheckInDay !== null ? ` · MD-${lastCheckInDay}` : ""}` : null,
    );
  }, [lastCheckInDay]);

  const rows = useResultRows(results?.drafts ?? []);
  const total = CHECK_IN_STEPS.length;
  const loggedCount = log.filter((l) => l && !l.skipped).length;

  function reset() {
    setCur(0);
    setLog(EMPTY_LOG);
    setResults(null);
    setRound((r) => r + 1);
  }

  function logStep(entry: LogEntry) {
    const nextLog = log.slice();
    nextLog[cur] = entry;
    setLog(nextLog);
    if (cur < total - 1) {
      setCur(cur + 1);
      return;
    }
    // Last step (the self-rating, which has no Skip button): build a Reading for
    // every logged indicator and show the results.
    if (entry.skipped) return;
    const selfRating = Number(entry.raw[0]) as CheckIn["selfRating"];
    const base = { timestamp: checkInTime(statusTime, readings).toISOString(), missionDay, environment };
    const drafts: DraftResult[] = [];
    CHECK_IN_STEPS.forEach((step, i) => {
      const logged = nextLog[i];
      if (!step.indicator) return;
      drafts.push({
        id: step.indicator,
        reading: logged ? buildReading(step, logged, base) : null,
      });
    });
    setResults({ drafts, selfRating, timestamp: base.timestamp });
  }

  function jumpTo(i: number) {
    setResults(null);
    setCur(i);
  }

  function save() {
    if (!results) return;
    // Stop at the first failed write and stay on this screen, so the entries are
    // not lost and the astronaut can try again. On a retry, readings that were
    // saved the first time are skipped, so nothing is stored twice.
    const storedIds = new Set(getReadings().map((r) => r.id));
    for (const row of rows) {
      if (row.skipped || !row.reading || storedIds.has(row.reading.id)) continue;
      const saved = saveReading(row.reading);
      if (!saved.ok) return showSaveError(saved.message);
    }
    const saved = saveCheckIn({
      id: crypto.randomUUID(),
      timestamp: results.timestamp,
      selfRating: results.selfRating,
    });
    if (!saved.ok) return showSaveError(saved.message);
    setStorageError(null);
    reload();
    reset();
    router.push("/");
  }

  function showSaveError(message: string) {
    setStorageError(`${message} This check-in was not fully saved. Your entries are still on screen.`);
    reload();
  }

  return (
    <Screen label="Check-in">
      <div className="grid">
        <div className="cell c4 flush">
          <div className="head">
            <h2>
              <span className="ix mono">01</span>Daily checklist
            </h2>
            <span className="hint mono" id="ci-count">
              {loggedCount} of {total} logged
            </span>
          </div>
          <div className="prog" id="ci-prog" aria-hidden="true">
            {CHECK_IN_STEPS.map((step, i) => {
              const l = log[i];
              const cls = i === cur && !results ? "cur" : l ? (l.skipped ? "skip" : "ok") : undefined;
              return <i key={step.name} className={cls} />;
            })}
          </div>
          <ol className="steps" id="ci-steps">
            {CHECK_IN_STEPS.map((step, i) => {
              const l = log[i];
              return (
                <li key={step.name}>
                  <button
                    type="button"
                    aria-current={i === cur && !results ? "step" : undefined}
                    onClick={() => jumpTo(i)}
                  >
                    <span className={l ? (l.skipped ? "box skip" : "box ok") : "box"} aria-hidden="true" />
                    <span className="ref mono">0{i + 1}</span>
                    {step.name}
                    <span className="done mono">{l ? (l.skipped ? "Skipped" : l.label) : ""}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="cell c8" style={{ padding: 24 }}>
          <div className="stack" id="ci-panel">
            {results ? (
              <CheckInResults
                rows={rows}
                selfRating={results.selfRating}
                onEdit={() => jumpTo(0)}
                onDiscard={() => {
                  reset();
                  router.push("/");
                }}
                onSave={save}
              />
            ) : (
              <StepPanel
                key={`${round}-${cur}`}
                step={CHECK_IN_STEPS[cur]}
                index={cur}
                total={total}
                entry={log[cur]}
                lastSelfRating={lastSelfRating}
                onLog={logStep}
                onBack={() => setCur((c) => Math.max(0, c - 1))}
              />
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
