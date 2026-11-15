"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IndicatorId } from "@/lib/types";
import { INDICATORS, contextLabel, formatReading } from "@/lib/indicatorMeta";
import { loadDemoProfile } from "@/lib/demoProfile";
import { useAllStatuses, useArgus } from "@/components/ArgusProvider";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { EscalationCard, type CriticalItem } from "@/components/EscalationCard";
import { BodyMap } from "@/components/BodyMap";
import { Sparkline } from "@/components/dashboard/Sparkline";

// Only these three have a site on the 3D figure; hovering the other rows highlights nothing.
const BODY_SITES: IndicatorId[] = ["heartRate", "bodyTemperature", "bloodPressure"];
// The due banner counts missed days over this window.
const MISSED_WINDOW_DAYS = 14;

export function DashboardScreen() {
  const { ready, missionDay, readings, lastCheckInDay, reload } = useArgus();
  const statuses = useAllStatuses();
  const router = useRouter();

  // Two separate "hot" sites: the row the pointer is on (tells the body map what to light up),
  // and the site the pointer is on in the body map (tells the table which row to shade).
  const [rowHot, setRowHot] = useState<IndicatorId | null>(null);
  const [mapHot, setMapHot] = useState<IndicatorId | null>(null);

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

        <BodyMap hot={rowHot} onHotChange={setMapHot} />

        <div className="cell c8 flush">
          <div className="head">
            <h2>
              <span className="ix mono">02</span>Telemetry
            </h2>
            <div className="row">
              <span className="pill">SIMULATED DATA</span>
              <span className="hint mono">{ready ? `Last check-in ${lastCheckInText}` : ""}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                title="Clears saved readings and check-ins, then reloads the simulated demo profile"
                onClick={() => {
                  loadDemoProfile();
                  reload();
                }}
              >
                Load demo profile
              </button>
              <Link className="btn btn-pri btn-sm" href="/check-in">
                Start check-in
              </Link>
            </div>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Indicator · why this status</th>
                  <th className="r">Reading</th>
                  <th>14 d</th>
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
                            if (e.key === "Enter") openIndicator(id);
                          }}
                          onMouseEnter={() => setRowHot(BODY_SITES.includes(id) ? id : null)}
                        >
                          <td>
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
                          <td>
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
    </Screen>
  );
}
