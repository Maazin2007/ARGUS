"use client";

// Handover report for the crew medical officer and the ground. Earth is minutes
// away on a Mars transit, so the crew cannot wait for advice: this page is what
// they send. It can be printed (or saved as PDF) and copied as a JSON packet.

import { useEffect, useMemo, useState } from "react";
import type { CheckIn } from "@/lib/types";
import {
  INDICATORS,
  INDICATOR_ORDER,
  STATUS_TEXT,
  environmentInfo,
  formatRange,
  formatReading,
  provenanceLabel,
} from "@/lib/indicatorMeta";
import { buildHandover, telemetryPacket } from "@/lib/handover";
import { getCheckIns } from "@/lib/storage";
import { missionDayOf, useArgus } from "@/components/ArgusProvider";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";

// "12 min" or "1 s".
function delayText(seconds: number): string {
  return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds} s`;
}

export function HandoverScreen() {
  const { ready, environment, missionDay, statusTime, readings } = useArgus();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  // Storage is read after the first paint (CODING_STANDARDS.md).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckIns(getCheckIns());
  }, [readings]);

  const env = environmentInfo(environment);
  const report = useMemo(
    () =>
      buildHandover({
        readings,
        checkIns,
        environment,
        missionDay,
        oneWayDelaySeconds: env.delaySeconds,
        now: statusTime,
        missionDayOf,
        indicators: INDICATOR_ORDER,
      }),
    [readings, checkIns, environment, missionDay, env.delaySeconds, statusTime],
  );

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(telemetryPacket(report));
      setCopyMessage("Ground telemetry packet copied.");
    } catch {
      setCopyMessage("Copying is blocked in this browser. Use Print / Save PDF instead.");
    }
  }

  return (
    <Screen label="Handover report">
      <div className="grid">
        <div className="cell c12">
          <div className="head">
            <h2>Handover report</h2>
            <div className="row no-print">
              <button type="button" className="btn btn-pri" onClick={() => window.print()}>
                Print / Save PDF
              </button>
              <button type="button" className="btn" onClick={copyPacket}>
                Copy ground telemetry packet
              </button>
            </div>
          </div>
          {/* Always in the page, so screen readers announce the message when it appears. */}
          <p
            role="status"
            className={copyMessage ? "note no-print" : "no-print"}
            style={{ margin: copyMessage ? "0 0 16px" : 0 }}
          >
            {copyMessage}
          </p>
          <div className="row" style={{ gap: "8px 32px" }}>
            <div>
              <span className="lbl">Mission day</span>
              <div className="val mono">{missionDay}</div>
            </div>
            <div>
              <span className="lbl">Environment</span>
              <div className="val">{env.label}</div>
            </div>
            <div>
              <span className="lbl">Signal delay to Earth · simulated</span>
              <div className="val mono">
                {delayText(report.oneWayDelaySeconds)} one way · {delayText(report.roundTripDelaySeconds)} round trip
              </div>
            </div>
            <div>
              <span className="lbl">Covers</span>
              <div className="val mono">
                MD-{report.days[0]} to MD-{report.days[report.days.length - 1]}
              </div>
            </div>
            <span className="pill">Simulated data</span>
          </div>
        </div>

        <div className="cell c12 flush">
          <div className="head">
            <h2>Last 7 mission days</h2>
            <span className="hint mono">Latest reading of each day</span>
          </div>
          <div className="tw">
            <table className="plain">
              <thead>
                <tr>
                  <th>Indicator</th>
                  {report.days.map((day) => (
                    <th key={day} className="r">
                      MD-{day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INDICATOR_ORDER.map((id) => (
                  <tr key={id}>
                    <td>
                      {INDICATORS[id].name}
                      <br />
                      <small style={{ color: "var(--mu)" }}>{INDICATORS[id].unit}</small>
                    </td>
                    {report.days.map((day) => {
                      const dayReadings = report.table[id][day];
                      const latest = dayReadings[dayReadings.length - 1];
                      return (
                        <td key={day} className="r mono" title={latest ? provenanceLabel(latest) : undefined}>
                          {latest ? formatReading(latest) : "--"}
                          {dayReadings.length > 1 ? (
                            <small style={{ color: "var(--mu)" }}> ×{dayReadings.length}</small>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cell c12 flush">
          <div className="head">
            <h2>Alerts in this window</h2>
            <span className="hint mono">
              {ready ? `${report.alerts.length} not green` : ""}
            </span>
          </div>
          {report.alerts.length === 0 ? (
            <p className="note" style={{ margin: "0 24px 24px" }}>
              Every result in the last 7 mission days is green. Green means no checks fired.
            </p>
          ) : (
            <div className="tw">
              <table className="plain">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Indicator</th>
                    <th className="r">Reading</th>
                    <th>Status</th>
                    <th>Why</th>
                    <th>Reference / baseline</th>
                    <th>Entered via</th>
                  </tr>
                </thead>
                <tbody>
                  {report.alerts.map(({ reading, result }) => {
                    const decimals = INDICATORS[reading.indicator].decimals;
                    return (
                      <tr key={reading.id}>
                        <td className="mono">MD-{reading.missionDay}</td>
                        <td>{INDICATORS[reading.indicator].name}</td>
                        <td className="r mono">
                          {formatReading(reading)} {reading.unit}
                        </td>
                        <td>
                          <StatusBadge status={result.status} />
                        </td>
                        <td style={{ whiteSpace: "normal", maxWidth: 360 }}>{result.reasons.join(" ")}</td>
                        <td className="mono" style={{ whiteSpace: "normal" }}>
                          {formatRange(result.referenceRange, decimals)}
                          {result.baseline ? (
                            <>
                              <br />
                              <small style={{ color: "var(--mu)" }}>
                                baseline {formatRange(result.baseline, decimals)}
                              </small>
                            </>
                          ) : null}
                        </td>
                        <td>{provenanceLabel(reading)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="cell c12 flush">
          <div className="head">
            <h2>Self-ratings</h2>
            <span className="hint mono">How the crewmember said they feel, 1 to 5</span>
          </div>
          {report.checkIns.length === 0 ? (
            <p className="note" style={{ margin: "0 24px 24px" }}>
              No check-ins saved in the last 7 mission days.
            </p>
          ) : (
            <div className="tw">
              <table className="plain">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time (UTC)</th>
                    <th className="r">Self-rating</th>
                    <th>Feel vs data</th>
                  </tr>
                </thead>
                <tbody>
                  {report.checkIns.map(({ checkIn, missionDay: day, mismatch, readingCount }) => (
                    <tr key={checkIn.id}>
                      <td className="mono">MD-{day}</td>
                      <td className="mono">{checkIn.timestamp.slice(11, 16)}</td>
                      <td className="r mono">{checkIn.selfRating} of 5</td>
                      <td style={{ whiteSpace: "normal" }}>
                        {mismatch ? (
                          <span>
                            <span className="st st-amber">
                              <i aria-hidden="true">{STATUS_TEXT.amber.symbol}</i>
                            </span>{" "}
                            {mismatch}
                          </span>
                        ) : readingCount === 0 ? (
                          "No readings with this check-in"
                        ) : (
                          "Rating and data agree"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="note" style={{ margin: "0 24px 24px" }}>
            <strong>Limits.</strong> Simulated data. Not a medical device. No diagnosis and no
            medication advice. Every number has a source or is marked demo parameter.
          </p>
        </div>
      </div>
    </Screen>
  );
}
