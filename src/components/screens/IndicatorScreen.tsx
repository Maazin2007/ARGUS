"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { IndicatorId, IndicatorRule, Range } from "@/lib/types";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { useArgus } from "@/components/ArgusProvider";
import { IndicatorDropdown } from "@/components/indicator/IndicatorDropdown";
import { StripChart } from "@/components/indicator/StripChart";
import { ReferenceCard } from "@/components/indicator/ReferenceCard";
import { adjustRange } from "@/lib/status";
import { MIN_BASELINE_READINGS } from "@/lib/baseline";
import { INDICATORS, contextLabel, fmt, formatRange, formatReading, isIndicatorId, ruleFor } from "@/lib/indicatorMeta";

// "< 40 or > 180": the status engine turns red only strictly past a critical limit.
function criticalText(limit: Range, decimals: number): string {
  const parts: string[] = [];
  if (limit.low !== null) parts.push(`< ${fmt(limit.low, decimals)}`);
  if (limit.high !== null) parts.push(`> ${fmt(limit.high, decimals)}`);
  return parts.join(" or ");
}

// Indicator detail: strip chart, readout and reference card for one indicator.
// `id` always comes from the URL (see IndicatorRoute below). It is NOT copied into
// local state: Next.js 16 keeps a visited page alive and hidden, with its state, so a
// copied id went stale. Example: open Heart rate, pick Body temperature in the
// dropdown, go to the Dashboard, click the Heart rate row: the URL said heartRate but
// the kept-alive page still showed Body temperature, so the click seemed to do nothing.
export function IndicatorScreen({ id }: { id: IndicatorId }) {
  const { statusFor, environment, missionDay, setLastIndicator } = useArgus();

  // The header's indicator tab links back to whichever indicator was viewed last.
  useEffect(() => {
    setLastIndicator(id);
  }, [id, setLastIndicator]);

  function changeIndicator(next: IndicatorId) {
    // Only the URL changes. Next.js 16 syncs the native History API with its router, so
    // usePathname() re-renders this same screen with the new id, without a navigation
    // (node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md).
    window.history.replaceState(null, "", `/indicator/${next}`);
  }

  const meta = INDICATORS[id];
  const isBp = id === "bloodPressure";
  const { latest, history, result } = statusFor(id);
  const ref = result.referenceRange;

  // Rules for the latest reading's context. Blood pressure has one per number.
  const rules: { label: string; rule: IndicatorRule | null }[] = !latest
    ? []
    : isBp
      ? [
          { label: "sys", rule: ruleFor("systolic", latest.context) },
          { label: "dia", rule: ruleFor("diastolic", latest.context) },
        ]
      : [{ label: "", rule: ruleFor(id, latest.context) }];
  const hasRule = rules.length > 0 && rules.every((r) => r.rule !== null);

  // Reference range. For blood pressure the result carries systolic's range, so the
  // diastolic range is worked out with the same backend function.
  let rangeText = formatRange(ref, meta.decimals);
  if (ref && isBp) {
    const diaRule = rules[1]?.rule;
    const dia = diaRule ? adjustRange(diaRule, environment, missionDay) : null;
    rangeText = `${rangeText} / ${formatRange(dia, meta.decimals)}`;
  }
  if (ref) rangeText += ` ${meta.unit}${ref.adjusted ? " · adjusted" : ""}`;

  // Critical limit. "Never red" is only claimed when a rule exists and has no limit.
  const limits = rules.flatMap((r) =>
    r.rule?.criticalLimit ? [{ label: r.label, limit: r.rule.criticalLimit }] : [],
  );
  let critText: string;
  let critSource = "";
  if (!hasRule) {
    critText = "Not set";
  } else if (!limits.length) {
    critText = "None. This indicator is never red.";
  } else {
    critText =
      limits
        .map((r) => `${r.label ? r.label + " " : ""}${criticalText(r.limit, meta.decimals)}`)
        .join(" · ") + ` ${meta.unit} · fixed`;
    critSource = Array.from(new Set(limits.map((r) => r.limit.source))).join("; ");
  }

  // Personal baseline, and the chart note explaining why it is missing.
  const earlierSameContext = latest
    ? history.slice(0, -1).filter((r) => r.context === latest.context).length
    : 0;
  const baseText = result.baseline
    ? `${formatRange(result.baseline, meta.decimals)}${isBp ? " sys" : ""} · n = ${result.baseline.count}`
    : `Not available yet (needs ${MIN_BASELINE_READINGS} earlier readings)`;
  const notes: string[] = [];
  if (!result.baseline && earlierSameContext < MIN_BASELINE_READINGS) {
    notes.push(`Baseline available after ${MIN_BASELINE_READINGS} readings (you have ${earlierSameContext}).`);
  }
  if (isBp) notes.push("Bands follow systolic");

  return (
    <Screen label="Indicator detail">
      <div className="grid">
        <div className="cell c12" style={{ padding: "12px 16px" }}>
          <div className="row" style={{ gap: 16 }}>
            <Link className="btn btn-sm" href="/">
              Back
            </Link>
            <span className="ref mono">{meta.ref}</span>
            <IndicatorDropdown value={id} onChange={changeIndicator} />
            <span>
              <StatusBadge status={result.status} />
            </span>
            <span style={{ flex: 1 }}></span>
            {ref?.adjusted ? <span className="tag">Adjusted for environment</span> : null}
            <span className="pill">Simulated data</span>
          </div>
        </div>

        <StripChart
          id={id}
          history={history}
          latest={latest}
          result={result}
          environment={environment}
          missionDay={missionDay}
          legendNote={notes.join(" · ")}
        />

        <div className="cell c4 flush">
          <div className="head">
            <h2>Readout</h2>
          </div>
          <div className="kv">
            <span className="lbl">Latest</span>
            <span>
              <span className="mono" style={{ fontSize: 28, fontWeight: 500 }}>
                {formatReading(latest)}
              </span>{" "}
              <span className="unit">{latest ? meta.unit : ""}</span>
            </span>
          </div>
          <div className="kv">
            <span className="lbl">Context</span>
            <span>{latest ? `${contextLabel(id, latest.context)} · MD-${latest.missionDay}` : "No reading"}</span>
          </div>
          <div className="kv">
            <span className="lbl">Reference range</span>
            <span className="mono">{rangeText}</span>
            <span className="src">{ref?.source ?? ""}</span>
          </div>
          <div className="kv">
            <span className="lbl">Critical limit</span>
            <span className="mono">{critText}</span>
            <span className="src">{critSource}</span>
          </div>
          <div className="kv">
            <span className="lbl">Personal baseline</span>
            <span className="mono">{baseText}</span>
          </div>
          <div className="kv">
            <span className="lbl">Why this status</span>
            <div>
              <ul className="reasons">
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <ReferenceCard id={id} />
      </div>
    </Screen>
  );
}

// Reads the indicator id from the URL in the browser. Reading it here, instead of
// awaiting `params` in page.tsx, keeps navigation instant in Next.js 16.
// The address bar (usePathname) wins over the route params: after the dropdown's
// replaceState the URL shows the new indicator, but the route params keep the id the
// page was opened with. While this page is hidden behind another screen, the pathname
// is not an indicator URL, so the route params are used instead.
export function IndicatorRoute() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const prefix = "/indicator/";
  const id = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : params.id;
  return <IndicatorScreen id={isIndicatorId(id) ? id : "heartRate"} />;
}
