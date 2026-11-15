"use client";

import { useState } from "react";
import type { Card, IndicatorId, Measure } from "@/lib/types";
import { INDICATORS, formatRange, formatReading, measuresFor } from "@/lib/indicatorMeta";
import { validateEntry } from "@/lib/validate";
import { useArgus } from "@/components/ArgusProvider";
import cardsData from "@/data/cards.json";
import type { CheckInStep, LogEntry } from "@/components/checkin/steps";

const CARDS = cardsData as Card[];

// The card's "how to measure" text, or null while that card is not written yet.
function howToMeasure(id: IndicatorId): string | null {
  return CARDS.find((c) => c.indicator === id)?.howToMeasure.text ?? null;
}

// Checks every input of the step. Returns which inputs are wrong and the first message.
// Blood pressure prefixes the message so the astronaut knows which box is wrong.
function checkInputs(measures: Measure[], values: string[]): { bad: boolean[]; message: string } {
  let message = "";
  const bad = values.map((text, k) => {
    const result = validateEntry(measures[k], text);
    if (result.ok) return false;
    if (!message) {
      const prefix = measures.length > 1 ? (k ? "Diastolic: " : "Systolic: ") : "";
      message = prefix + result.message;
    }
    return true;
  });
  return { bad, message };
}

type StampProps = { step: CheckInStep; lastSelfRating: string | null };

// "Last reading" and "14 d baseline" box beside the input.
function Stamp({ step, lastSelfRating }: StampProps) {
  const { statusFor } = useArgus();
  let previous = "None logged";
  let baseline = "Not tracked"; // the self-rating has no baseline
  if (step.indicator) {
    const meta = INDICATORS[step.indicator];
    const { latest, result } = statusFor(step.indicator);
    if (latest) previous = `${formatReading(latest)} ${meta.unit} · MD-${latest.missionDay}`;
    // For blood pressure the backend carries systolic's baseline, hence " sys".
    baseline = result.baseline
      ? formatRange(result.baseline, meta.decimals) + (step.indicator === "bloodPressure" ? " sys" : "")
      : "Not available yet";
  } else if (lastSelfRating) {
    previous = lastSelfRating;
  }
  return (
    <div className="stamp mono">
      <div>
        <span>Last reading</span>
        <b>{previous}</b>
      </div>
      <div>
        <span>14 d baseline</span>
        <b>{baseline}</b>
      </div>
    </div>
  );
}

type Props = {
  step: CheckInStep;
  index: number;
  total: number;
  entry: LogEntry | null;
  lastSelfRating: string | null;
  onLog: (entry: LogEntry) => void;
  onBack: () => void;
};

// One item of the checklist. It is remounted for every step (see the `key` in
// CheckInScreen), so its useState starts fresh from the saved entry or the demo value.
export function StepPanel({ step, index, total, entry, lastSelfRating, onLog, onBack }: Props) {
  const meta = step.indicator ? INDICATORS[step.indicator] : null;
  const isBloodPressure = step.indicator === "bloodPressure";
  const measures: Measure[] = step.indicator ? measuresFor(step.indicator) : [];
  const saved = entry && !entry.skipped ? entry : null;

  const [values, setValues] = useState<string[]>(() =>
    measures.map((_, k) => saved?.raw[k] ?? step.demo?.[k] ?? ""),
  );
  const [pick, setPick] = useState<number>(() => (saved ? Number(saved.raw[0]) : 0));
  const [context, setContext] = useState<string | null>(
    () => saved?.context ?? meta?.contexts?.[0].label ?? null,
  );
  const [bad, setBad] = useState<boolean[]>([]);
  const [message, setMessage] = useState("");

  // The pill only shows while the demo value has not been logged yet.
  const showDemoPill = step.demo !== null && entry === null;

  function validate(next: string[]): boolean {
    const result = checkInputs(measures, next);
    setBad(result.bad);
    setMessage(result.message);
    return !result.message;
  }

  function changeValue(k: number, text: string) {
    const next = values.slice();
    next[k] = text;
    setValues(next);
    validate(next); // live feedback, as in the mockup
  }

  function submit() {
    if (step.scale) {
      if (!pick) {
        setMessage("Pick a number from 1 to 5");
        return;
      }
      onLog({ skipped: false, raw: [String(pick)], context: null, label: `${pick} of 5` });
      return;
    }
    if (!validate(values)) return;
    const raw = values.map((v) => v.trim());
    onLog({ skipped: false, raw, context, label: `${raw.join("/")} ${step.unit}` });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  function field(k: number) {
    const input = (
      <input
        id={k === 0 ? "ci-in" : undefined}
        className="ci-in"
        inputMode={isBloodPressure ? "numeric" : "decimal"}
        aria-label={isBloodPressure ? (k ? "Diastolic" : "Systolic") : undefined}
        placeholder={isBloodPressure ? (k ? "DIA" : "SYS") : undefined}
        value={values[k]}
        autoComplete="off"
        onChange={(e) => changeValue(k, e.target.value)}
        onKeyDown={onKeyDown}
      />
    );
    return (
      <div
        className={bad[k] ? "field err" : "field"}
        style={isBloodPressure ? { maxWidth: 200 } : undefined}
      >
        {input}
        <span className="unit">{step.unit}</span>
      </div>
    );
  }

  const how = step.indicator ? howToMeasure(step.indicator) : null;

  return (
    <>
      <div>
        <span className="lbl">
          Item {index + 1} of {total}
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 500 }}>{step.name}</h1>
      </div>

      {step.scale ? (
        <>
          <div>
            <div className="lbl" style={{ marginBottom: 8 }}>
              Select one
            </div>
            <div className="row" style={{ gap: 24, alignItems: "flex-start" }}>
              <div>
                <div className="opts rate" role="group" aria-label={step.name}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="mono"
                      aria-pressed={n === pick}
                      onClick={() => {
                        setPick(n);
                        setMessage("");
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div
                  className="row"
                  style={{ justifyContent: "space-between", marginTop: 8, color: "var(--mu)", fontSize: 12 }}
                >
                  <span>{step.scale.lo}</span>
                  <span>{step.scale.hi}</span>
                </div>
              </div>
              <Stamp step={step} lastSelfRating={lastSelfRating} />
            </div>
            <div className="errmsg" id="ci-err" role="alert">
              {message}
            </div>
          </div>
          {step.isLast ? (
            <div className="note">
              <strong>Feel against data.</strong> If this rating and your readings disagree, the
              results screen will say so. Your results stay private unless you choose to share them.
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div>
            <label className="lbl" htmlFor="ci-in" style={{ display: "block", marginBottom: 8 }}>
              Reading
              {showDemoPill ? (
                <>
                  {" "}
                  <span className="pill" style={{ marginLeft: 6 }}>
                    DEMO VALUE FILLED IN
                  </span>
                </>
              ) : null}
            </label>
            <div className="row" style={{ gap: 24 }}>
              {isBloodPressure ? (
                <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
                  {field(0)}
                  <span className="mono" style={{ fontSize: 28, color: "var(--mu)" }}>
                    /
                  </span>
                  {field(1)}
                </div>
              ) : (
                field(0)
              )}
              <Stamp step={step} lastSelfRating={lastSelfRating} />
            </div>
            <div className="errmsg" id="ci-err" role="alert">
              {message}
            </div>
            {step.hint ? (
              <div className="hint" style={{ fontSize: 13 }}>
                {step.hint}
              </div>
            ) : null}
          </div>
          {meta?.contexts ? (
            <div>
              <div className="lbl" style={{ marginBottom: 8 }}>
                {meta.contextTitle}
              </div>
              <div className="opts ctx" role="group" aria-label="Context">
                {meta.contexts.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    aria-pressed={c.label === context}
                    onClick={() => setContext(c.label)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {how ? (
        <div className="note">
          <strong>How to measure.</strong> {how}
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 4 }}>
        <button type="button" className="btn" id="ci-back" disabled={index === 0} onClick={onBack}>
          Back
        </button>
        {step.isLast ? null : (
          <button
            type="button"
            className="btn btn-ghost"
            id="ci-skip"
            onClick={() => onLog({ skipped: true })}
          >
            Skip
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-pri"
          id="ci-next"
          style={{ minWidth: 140 }}
          onClick={submit}
        >
          {step.isLast ? "See results" : "Log and continue"}
        </button>
      </div>
    </>
  );
}
