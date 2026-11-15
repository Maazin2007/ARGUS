"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen, replayAnimation } from "@/components/Screen";
import { useArgus } from "@/components/ArgusProvider";
import { environmentInfo, roundTripMinutes } from "@/lib/indicatorMeta";
import { EMERGENCY_LIMITS_NOTE, EMERGENCY_SCENARIO } from "@/lib/placeholders";
import {
  buttonLabel,
  utcTime,
  walkPath,
  type EmergencyAnswer,
} from "@/components/emergency/emergencyPath";

// Above this one-way delay the ground cannot help in real time, so the screen tells the
// crew to keep acting instead of waiting for a reply.
const LIVE_GROUND_MAX_DELAY_SECONDS = 5; // demo parameter

// Every path through the tree is three answers long (question, question, action).
const STEP_COUNT = 3;

// "MM:SS" since `since` (a time in milliseconds), ticking once a second. It counts from the
// moment the step opened, so leaving the screen and coming back does not reset it.
// It only counts time: no beat or pulse, because a pulse would read as a compression rate
// and the guideline gives none of its own.
function ElapsedTimer({ since }: { since: number }) {
  const [nowMs, setNowMs] = useState(since);
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor((nowMs - since) / 1000));
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    <p style={{ margin: "16px 0 0" }}>
      <span className="lbl">Time on this step</span>{" "}
      <span className="mono" role="timer" aria-live="off" style={{ fontSize: 28, fontWeight: 500 }}>
        {two(Math.floor(seconds / 60))}:{two(seconds % 60)}
      </span>
    </p>
  );
}

// Emergency mode: a yes/no tree read from the data file. The screen only shows the
// wording from the data; it never adds medical text of its own.
export function EmergencyScreen() {
  const router = useRouter();
  const { environment } = useArgus();
  const [path, setPath] = useState<EmergencyAnswer[]>([]);

  const { answered, current } = walkPath(path);
  const isFinished = current === null;
  const delaySeconds = environmentInfo(environment).delaySeconds;
  const isGroundLive = delaySeconds <= LIVE_GROUND_MAX_DELAY_SECONDS;
  const replyMinutes = roundTripMinutes(delaySeconds);

  const question = current ? current.text : "Stay with the crewmember and keep the monitor on";
  const hint = current
    ? current.hint
    : isGroundLive
      ? "Step log sent. Ground is live on the loop."
      : `Step log is queued for the ground. Earliest reply in ${replyMinutes} min at the current delay. Keep acting.`;

  // The clock is read here, in the handler, never during render.
  // The updater re-checks the tree, so a fast double key press cannot answer past the end.
  const answer = useCallback((value: "yes" | "no") => {
    const now = new Date();
    const entry = { answer: value, time: utcTime(now), at: now.getTime() };
    setPath((old) => (walkPath(old).current ? [...old, entry] : old));
  }, []);

  // Y and N answer while this screen is open. Skip typing in fields, shortcuts with
  // modifier keys, and a held-down key (which would answer several steps at once).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === "y") {
        e.preventDefault();
        answer("yes");
      } else if (key === "n") {
        e.preventDefault();
        answer("no");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [answer]);

  // Replay the `swap` animation when the question or hint text changes, like the mockup.
  // Remembering the last text means the first render (and React's dev double-run) does not animate.
  const questionRef = useRef<HTMLHeadingElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const lastText = useRef<{ question: string; hint: string } | null>(null);
  useEffect(() => {
    const last = lastText.current;
    if (last && last.question !== question) replayAnimation(questionRef.current, "swap");
    if (last && last.hint !== hint) replayAnimation(hintRef.current, "swap");
    lastText.current = { question, hint };
  }, [question, hint]);

  const stepNumber = isFinished ? STEP_COUNT : path.length + 1;

  return (
    <Screen label="Emergency">
      <div className="grid">
        <div className="c12 em-band">
          <span style={{ letterSpacing: ".1em" }}>EMERGENCY MODE</span>
          <span style={{ fontWeight: 500 }}>{EMERGENCY_SCENARIO}</span>
          <span style={{ flex: 1 }}></span>
          <button type="button" className="btn btn-sm" onClick={() => setPath([])}>
            Restart
          </button>
          <button type="button" className="btn btn-sm" onClick={() => router.push("/")}>
            Exit
          </button>
        </div>

        <div className="cell c8" style={{ padding: 32 }}>
          <div className="stack" style={{ gap: 32 }}>
            <div className="row">
              <span className="lbl">Step</span>
              <span className="ref mono">{current ? current.id.toUpperCase() : "END"}</span>
              <div className="pips" aria-hidden="true">
                {Array.from({ length: STEP_COUNT }, (_, i) => (
                  <i key={i} className={i < path.length ? "ok" : i === path.length ? "cur" : ""}></i>
                ))}
              </div>
              <span className="hint mono">
                {stepNumber} of {STEP_COUNT}
              </span>
              <span style={{ flex: 1 }}></span>
              <span>
                {current && (
                  <span className={current.label === "Published" ? "lab lab-pub" : "lab lab-demo"}>
                    {current.label}
                  </span>
                )}
              </span>
            </div>

            <div aria-live="polite">
              <span className="lbl">
                {current ? (current.type === "question" ? "Question" : "Action") : "Sequence complete"}
              </span>
              <h1 className="em-q" ref={questionRef}>
                {question}
              </h1>
              <p className="em-hint" ref={hintRef}>
                {hint}
              </p>
              {current?.showElapsed && path.length > 0 ? (
                <ElapsedTimer key={current.id} since={path[path.length - 1].at} />
              ) : null}
              <p className="src" style={{ marginTop: 10 }}>
                {current ? `Source: ${current.source}` : ""}
              </p>
              <div className="note" style={{ marginTop: 12 }} hidden={!current?.showLimits}>
                <strong>Guideline limits.</strong> {EMERGENCY_LIMITS_NOTE}
              </div>
            </div>

            <div className="yn">
              <button type="button" className="y" disabled={isFinished} onClick={() => answer("yes")}>
                <span>{current ? buttonLabel(current, "yes") : "DONE"}</span>
                <span className="kbd" aria-hidden="true">
                  Y
                </span>
              </button>
              <button type="button" className="nn" disabled={isFinished} onClick={() => answer("no")}>
                <span>{current ? buttonLabel(current, "no") : "UNABLE"}</span>
                <span className="kbd" aria-hidden="true">
                  N
                </span>
              </button>
            </div>

            <div className="row">
              <button
                type="button"
                className="btn"
                style={{ minHeight: 48 }}
                disabled={path.length === 0}
                onClick={() => setPath((old) => old.slice(0, -1))}
              >
                Back one step
              </button>
              <span className="hint">
                Keys Y and N answer. Every answer is logged with its time. No medication or dosing
                advice is given here.
              </span>
            </div>
          </div>
        </div>

        <div className="cell c4 flush">
          <div className="head">
            <h2>
              <span className="ix mono">01</span>Step log
            </h2>
          </div>
          <ul className="log mono">
            {answered.length === 0 ? (
              <li>
                <span>No answers yet</span>
              </li>
            ) : (
              answered.map(({ step, answer: given }) => (
                <li key={step.id}>
                  <span>
                    {step.id.toUpperCase()} · {given.time}
                    <br />
                    {given.answer === "yes" ? step.logYes : step.logNo}
                  </span>
                  <b>{buttonLabel(step, given.answer)}</b>
                </li>
              ))
            )}
          </ul>
          <div className="head" style={{ borderTop: "1px solid var(--line)" }}>
            <h2>
              <span className="ix mono">02</span>Ground contact
            </h2>
          </div>
          <div className="kv">
            <span className="lbl">Simulated one-way signal delay</span>
            <span>
              <span className="mono" style={{ fontSize: 22, fontWeight: 500 }} data-delay="">
                {delaySeconds}
              </span>{" "}
              <span className="unit">s</span>
            </span>
          </div>
          <div className="kv">
            <p>
              {isGroundLive
                ? "Ground is live. Keep working the steps while you talk."
                : `Act on these steps now. A question sent to the ground comes back in ${replyMinutes} min at best.`}
            </p>
          </div>
        </div>
      </div>
    </Screen>
  );
}
