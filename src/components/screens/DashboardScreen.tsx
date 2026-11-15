"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IndicatorId } from "@/lib/types";
import { INDICATORS, contextLabel, formatReading } from "@/lib/indicatorMeta";
import { loadDemoProfile } from "@/lib/demoProfile";
import { CREW } from "@/lib/crew";
import { useAllStatuses, useArgus } from "@/components/ArgusProvider";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { EscalationCard, type CriticalItem } from "@/components/EscalationCard";
import { BodyMap } from "@/components/BodyMap";
import { Sparkline } from "@/components/dashboard/Sparkline";

// The due banner counts missed days over this window.
const MISSED_WINDOW_DAYS = 14;

// The crew board: every crewmember as a status word and the last day they logged a reading.
// It never shows a value, so the crew sees who needs attention without seeing their data.
// A critical status or an overdue check-in gets a button into emergency mode.
function CrewBoard() {
  const { ready, activeCrewId, crewSummary } = useArgus();
  return (
    <div className="cell c12 flush">
      <div className="head">
        <div className="row">
          <h2>Crew</h2>
          <span className="pill">Simulated data</span>
          <span className="hint mono">Status only. Readings stay private.</span>
        </div>
      </div>
      <div className="tw">
        <table className="plain">
          <thead>
            <tr>
              <th>Crewmember</th>
              <th>Status</th>
              <th>Last reading</th>
              <th className="r">Action</th>
            </tr>
          </thead>
          <tbody>
            {ready
              ? CREW.map((member) => {
                  const summary = crewSummary(member.id);
                  const needsHelp = summary.status === "red" || summary.overdue;
                  return (
                    <tr key={member.id}>
                      <td>
                        <span className="mono">{member.code}</span> · {member.role}
                        {member.id === activeCrewId ? " · you" : ""}
                      </td>
                      <td>
                        <StatusBadge status={summary.status} />
                      </td>
                      <td>
                        {summary.lastReadingDay === null ? "None" : `MD-${summary.lastReadingDay}`}
                        {summary.overdue ? (
                          <strong style={{ marginLeft: 8 }}>Check-in overdue</strong>
                        ) : null}
                      </td>
                      <td className="r">
                        {needsHelp && member.id !== activeCrewId ? (
                          <Link className="btn btn-sm" href={`/emergency?patient=${member.id}`}>
                            Open emergency
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardScreen() {
  const { ready, missionDay, readings, lastCheckInDay, reload, setStorageError } = useArgus();
  const statuses = useAllStatuses();
  const router = useRouter();

  // Two separate "hot" sites: the row the pointer is on (tells the body map what to light up),
  // and the site the pointer is on in the body map (tells the table which row to shade).
  const [rowHot, setRowHot] = useState<IndicatorId | null>(null);
  const [mapHot, setMapHot] = useState<IndicatorId | null>(null);
  // true while the body map is enlarged (and the table is narrower).
  const [isMapWide, setIsMapWide] = useState(false);

  // Every red indicator goes on the escalation card, with the first reason the backend gave.
  const critical: CriticalItem[] = ready
    ? statuses
        .filter((s) => s.state.result.status === "red")
        .map((s) => ({ id: s.id, reason: s.state.result.reasons[0] ?? "" }))
    : [];

  // A check-in is due when there has never been one, or the last one was before today.
  const isDue = ready && (lastCheckInDay === null || lastCheckInDay < missionDay);

  // Missed days: the 14 mission days before today with no reading of any kind.
  // Today is left out because today's check-in is "due", not yet missed.
  const daysWithReadings = new Set(readings.map((r) => r.missionDay));
  let missedDays = 0;
  for (let day = missionDay - MISSED_WINDOW_DAYS; day < missionDay; day++) {
    if (!daysWithReadings.has(day)) missedDays++;
  }

  const lastCheckInText = lastCheckInDay === null ? "none" : `MD-${lastCheckInDay}`;

  function openIndicator(id: IndicatorId) {
    router.push(`/indicator/${id}`);
  }

  return (
    <Screen label="Dashboard">
      <div className="grid">
        <div className="c12" style={isDue ? undefined : { display: "none" }}>
          {isDue ? (
            <div className="banner">
              <span className="dot" aria-hidden="true" />
              <div>
                <b>Today’s check-in is due</b>
                <span className="hint mono" style={{ display: "block" }}>
                  MD-{missionDay} · last check-in {lastCheckInText} · {missedDays} missed in the last{" "}
                  {MISSED_WINDOW_DAYS} days
                </span>
              </div>
              <span style={{ flex: 1 }} />
              <Link className="btn btn-pri btn-sm" href="/check-in">
                Start check-in
              </Link>
            </div>
          ) : null}
        </div>

        <div className="c12" style={critical.length ? undefined : { display: "none" }}>
          <EscalationCard items={critical} />
        </div>

        <CrewBoard />

        {/* The body map and the table share one row. The button on the body map switches the
            row between "table wide" and "body map wide"; CSS animates the column widths. */}
        <div className={isMapWide ? "c12 split wide" : "c12 split"}>
          <BodyMap
            hot={rowHot}
            onHotChange={setMapHot}
            isWide={isMapWide}
            onToggleWide={() => setIsMapWide(!isMapWide)}
          />

          <div className="cell c8 flush">
            <div className="head">
              {/* Left: what the table is. Right: the actions, with one dark (primary) button at most. */}
              <div className="row">
                <h2>Latest readings</h2>
                <span className="pill">Simulated data</span>
                <span className="hint mono">{ready ? `Last check-in ${lastCheckInText}` : ""}</span>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Clears saved readings and check-ins, then reloads the simulated demo profile"
                  onClick={() => {
                    const loaded = loadDemoProfile();
                    setStorageError(loaded.ok ? null : loaded.message);
                    reload();
                  }}
                >
                  Load demo profile
                </button>
                <Link className="btn btn-sm" href="/handover">
                  Handover report
                </Link>
                {/* When a check-in is due, the banner above already has this button. */}
                {ready && !isDue ? (
                  <Link className="btn btn-pri btn-sm" href="/check-in">
                    Start check-in
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    {/* Ref and the 14-day sparkline are dropped when the body map is enlarged, so the
                        reading, status and age always fit beside it (globals.css, .split.wide). */}
                    <th className="col-ref">Ref</th>
                    <th>Indicator · why this status</th>
                    <th className="r">Reading</th>
                    <th className="col-spark">14 d</th>
                    <th>Status</th>
                    <th className="r">Age</th>
                  </tr>
                </thead>
                {/* Until storage has been read, the body stays empty instead of flashing "Unknown" rows. */}
                <tbody onMouseLeave={() => setRowHot(null)}>
                  {ready
                    ? statuses.map(({ id, state }) => {
                        const meta = INDICATORS[id];
                        const { latest, history, result } = state;
                        const ageDays = latest ? missionDay - latest.missionDay : null;
                        const age = ageDays === null ? "--" : ageDays === 0 ? "today" : `${ageDays} d`;
                        // Indicators with context buttons show the context; the rest show the reading's day.
                        const detail = !latest
                          ? undefined
                          : meta.contexts
                            ? contextLabel(id, latest.context)
                            : `MD-${latest.missionDay}`;

                        return (
                          <tr
                            key={id}
                            data-ref={id}
                            tabIndex={0}
                            className={mapHot === id ? "hot" : undefined}
                            onClick={() => openIndicator(id)}
                            onKeyDown={(e) => {
                              // Enter or Space, like a button. preventDefault stops Space scrolling the page.
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openIndicator(id);
                              }
                            }}
                            onMouseEnter={() => setRowHot(id)}
                          >
                            <td className="col-ref">
                              <span className="ref mono">{meta.ref}</span>
                            </td>
                            <td>
                              <span className="nm">{meta.name}</span>
                              <span className="sub" title={result.reasons.join(" ")}>
                                {result.reasons[0]}
                              </span>
                            </td>
                            <td className="r">
                              {latest ? (
                                <>
                                  <span className="num mono">{formatReading(latest)}</span>{" "}
                                  <span className="unit">{meta.unit}</span>
                                </>
                              ) : (
                                <span className="num mono" style={{ color: "var(--mu)" }}>
                                  --
                                </span>
                              )}
                            </td>
                            <td className="col-spark">
                              <Sparkline history={history} result={result} missionDay={missionDay} />
                            </td>
                            <td>
                              <StatusBadge status={result.status} detail={detail} />
                            </td>
                            <td className="r mono" style={latest ? undefined : { color: "var(--mu)" }}>
                              {age}
                            </td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}
