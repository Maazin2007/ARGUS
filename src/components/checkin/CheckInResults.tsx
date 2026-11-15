"use client";

import type { IndicatorId, Reading, StatusResult } from "@/lib/types";
import { INDICATORS, environmentInfo, formatReading } from "@/lib/indicatorMeta";
import { getStatus } from "@/lib/status";
import { checkFeelVsData } from "@/lib/feelVsData";
import { checkCombinedAlerts } from "@/lib/checkInDue";
import { useArgus } from "@/components/ArgusProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { EscalationCard } from "@/components/EscalationCard";

// One indicator of the finished check-in. `reading` is null when the step was skipped.
export type DraftResult = { id: IndicatorId; reading: Reading | null };

export type ResultRow = {
  id: IndicatorId;
  skipped: boolean;
  reading: Reading | null; // the new reading, or for a skipped one the latest stored reading
  result: StatusResult;
};

// Works out every row's status for the current environment. Called on each render,
// so switching the environment in the header recomputes the results, as in the mockup.
export function useResultRows(drafts: DraftResult[]): ResultRow[] {
  const { environment, missionDay, statusTime, statusFor } = useArgus();
  return drafts.map(({ id, reading }) => {
    const state = statusFor(id);
    if (!reading) return { id, skipped: true, reading: state.latest, result: state.result };
    // Keep the reading's id, but stamp it with the environment now shown in the header.
    const current: Reading = { ...reading, environment };
    return {
      id,
      skipped: false,
      reading: current,
      result: getStatus(current, state.history, environment, missionDay, statusTime),
    };
  });
}

type Props = {
  rows: ResultRow[];
  selfRating: number;
  onEdit: () => void;
  onDiscard: () => void;
  onSave: () => void;
};

export function CheckInResults({ rows, selfRating, onEdit, onDiscard, onSave }: Props) {
  const { environment, missionDay } = useArgus();
  const feelMessage = checkFeelVsData(
    selfRating,
    rows.map((r) => r.result.status),
  );
  const combinedNotes = checkCombinedAlerts(
    Object.fromEntries(rows.map((r) => [r.id, r.result.status])),
  );
  const reds = rows
    .filter((r) => r.result.status === "red")
    .map((r) => ({ id: r.id, reason: r.result.reasons[0] ?? "" }));

  // The backend message is one string; the mockup bolds its first sentence and puts the
  // rating in the middle, so split it at the first full stop.
  let feelHead = "";
  let feelTail = "";
  if (feelMessage) {
    const cut = feelMessage.indexOf(". ");
    feelHead = cut >= 0 ? feelMessage.slice(0, cut + 1) : feelMessage;
    feelTail = cut >= 0 ? feelMessage.slice(cut + 2) : "";
  }

  return (
    <>
      <div>
        <span className="lbl">
          Check-in MD-{missionDay} · {environmentInfo(environment).label}
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 500 }}>Your results</h1>
      </div>

      {feelMessage ? (
        <div className="note fvd">
          <strong>{feelHead}</strong> You rated yourself {selfRating} of 5. {feelTail}
        </div>
      ) : null}

      {combinedNotes.map((note) => (
        <div key={note} className="note fvd">
          <strong>Combined check-in pattern.</strong> {note}
        </div>
      ))}

      <EscalationCard items={reds} />

      <div className="res">
        {rows.map((row) => {
          const meta = INDICATORS[row.id];
          return (
            <div className="res-row" key={row.id}>
              <span className="ref mono">{meta.ref}</span>
              <div className="res-main">
                <div className="row" style={{ gap: 10 }}>
                  <b>{meta.name}</b>
                  <span className="mono">
                    {row.reading ? `${formatReading(row.reading)} ${meta.unit}` : "--"}
                  </span>
                  {row.skipped ? (
                    <span className="pill">
                      SKIPPED · {row.reading ? `MD-${row.reading.missionDay} READING` : "NO READING"}
                    </span>
                  ) : null}
                </div>
                <ul className="reasons">
                  {row.result.reasons.map((text, k) => (
                    <li key={k}>{text}</li>
                  ))}
                </ul>
              </div>
              <div>
                <StatusBadge status={row.result.status} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="note">
        Only you see these results unless you choose to share them. Demo profile: saved readings
        join the simulated history.
      </div>

      <div className="row">
        <button type="button" className="btn" id="ci-edit" onClick={onEdit}>
          Edit answers
        </button>
        <button type="button" className="btn btn-ghost" id="ci-discard" onClick={onDiscard}>
          Discard
        </button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-pri"
          id="ci-save"
          style={{ minWidth: 160 }}
          onClick={onSave}
        >
          Save to dashboard
        </button>
      </div>
    </>
  );
}
