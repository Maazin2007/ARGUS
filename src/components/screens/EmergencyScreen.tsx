"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen, replayAnimation } from "@/components/Screen";
import { useArgus } from "@/components/ArgusProvider";
import {
  INDICATORS,
  STATUS_TEXT,
  environmentInfo,
  formatReading,
  roundTripMinutes,
} from "@/lib/indicatorMeta";
import {
  CREW,
  accessFor,
  crewLabel,
  crewMember,
  type Access,
} from "@/lib/crew";
import { buildEmergencyMessage, type MessageVital } from "@/lib/emergencyMessage";
import type { IndicatorId } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { EMERGENCY_LIMITS_NOTE, EMERGENCY_SCENARIO, stepsLeft } from "@/lib/emergency";
import {
  buttonLabel,
  utcTime,
  walkPath,
  type EmergencyAnswer,
} from "@/components/emergency/emergencyPath";

// Above this one-way delay the ground cannot help in real time, so the screen tells the
// crew to keep acting instead of waiting for a reply.
const LIVE_GROUND_MAX_DELAY_SECONDS = 5; // demo parameter

// The four measured indicators. Sleep and mood are self-reports, so they are left off this
// panel: an unresponsive crewmember cannot give them.
const EMERGENCY_VITALS: IndicatorId[] = ["heartRate", "bloodPressure", "bodyTemperature", "bloodGlucose"];

// Shown only with full access (the patient themselves, or after the full record is opened).
const FULL_RECORD_EXTRA: IndicatorId[] = ["sleepDuration", "mood"];

// Age of a reading in words: "today", "3 d old" or "no reading".
function ageText(missionDay: number, readingDay: number | null): string {
  if (readingDay === null) return "no reading";
  const days = missionDay - readingDay;
  return days <= 0 ? "today" : `${days} d old`;
}

// The patient's latest stored readings, in the shape the ground message uses.
function useVitalsForMessage(crewId: string | null): () => MessageVital[] {
  const { missionDay, statusForCrew } = useArgus();
  return () =>
    EMERGENCY_VITALS.map((id) => {
      const { latest, result } = statusForCrew(crewId ?? "", id);
      return {
        name: INDICATORS[id].name,
        value: latest ? formatReading(latest) : "--",
        unit: INDICATORS[id].unit,
        status: STATUS_TEXT[result.status].label,
        age: ageText(missionDay, latest ? latest.missionDay : null),
      };
    });
}

// One row of the vitals panel: value, unit, age and status.
function VitalRow({ id, crewId }: { id: IndicatorId; crewId: string }) {
  const { missionDay, statusForCrew } = useArgus();
  const meta = INDICATORS[id];
  const { latest, result } = statusForCrew(crewId, id);
  return (
    <li title={result.reasons.join(" ")}>
      <span>
        {meta.name}
        <br />
        <span className="mono" style={{ fontSize: 20, fontWeight: 500 }}>
          {latest ? formatReading(latest) : "--"}
        </span>{" "}
        <span className="unit">{meta.unit}</span>{" "}
        <span className="hint mono">· {ageText(missionDay, latest ? latest.missionDay : null)}</span>
      </span>
      <StatusBadge status={result.status} />
    </li>
  );
}

// The patient's latest STORED readings, not a live feed. What it shows depends on access
// (src/lib/crew.ts): the emergency vitals for a responder, and the full record for the
// patient themselves or once a responder opens it (logged).
function VitalsPanel({
  patientId,
  access,
  onUnlock,
}: {
  patientId: string | null;
  access: Access | null;
  onUnlock: () => void; // opens the full record and logs who opened it
}) {
  const { ready } = useArgus();
  const patient = crewMember(patientId);
  const head = (
    <div className="head">
      <h2>Latest vitals</h2>
      {access === "emergency" ? (
        <span className="hint mono">Limited emergency view</span>
      ) : access === "full" ? (
        <span className="hint mono">Full record · stored, not live</span>
      ) : null}
    </div>
  );
  if (!patient || access === null) {
    return (
      <>
        {head}
        <p className="note" style={{ margin: "0 24px 16px" }}>
          Choose who needs help first.
        </p>
      </>
    );
  }
  return (
    <>
      {head}
      <ul className="log">
        {ready ? EMERGENCY_VITALS.map((id) => <VitalRow key={id} id={id} crewId={patient.id} />) : null}
        {ready && access === "full" ? FULL_RECORD_EXTRA.map((id) => <VitalRow key={id} id={id} crewId={patient.id} />) : null}
      </ul>
      {access === "emergency" ? (
        <div className="kv">
          <span className="lbl">
            Only the vitals a rescuer needs are shown. Opening {patient.code}&apos;s full record is
            logged with your role and the time, and the log goes in the message for the ground.
          </span>
          <button type="button" className="btn" onClick={onUnlock}>
            Open full record (logged)
          </button>
        </div>
      ) : (
        <p className="note" style={{ margin: "0 24px 16px" }}>
          If you can, take a fresh reading once the steps allow it.
        </p>
      )}
    </>
  );
}

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

  // Turn the whole page red while this screen is open (the CSS is in globals.css, "Emergency mode").
  // The cleanup runs when the crew leaves the screen, so every other screen goes back to normal.
  useEffect(() => {
    document.documentElement.dataset.mode = "emergency";
    return () => {
      delete document.documentElement.dataset.mode;
    };
  }, []);
  const { environment, missionDay, activeCrewId } = useArgus();
  const [path, setPath] = useState<EmergencyAnswer[]>([]);
  // Who needs help and who is helping. The responder is whoever is using the console,
  // so usually only the patient is asked. The one case the console cannot know is when
  // the patient is the person signed in (someone else stepped up to help), or nobody is:
  // then it asks who is responding. The steps start once both are known.
  const [patientId, setPatientId] = useState<string | null>(null);
  const [chosenResponderId, setResponderId] = useState<string | null>(null);
  const responderId =
    chosenResponderId ?? (activeCrewId && patientId && activeCrewId !== patientId ? activeCrewId : null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  // Whether a responder has opened the patient's full record. Cleared on Restart.
  const [recordOpened, setRecordOpened] = useState(false);
  const [accessLog, setAccessLog] = useState<string[]>([]);
  const vitalsForMessage = useVitalsForMessage(patientId);
  const patient = crewMember(patientId);
  const responder = crewMember(responderId);
  const started = patient !== null && responder !== null;
  const access = patient && responder ? accessFor(patient.id, responder.id, recordOpened) : null;

  // Opens the full record and logs who opened it and when. The clock is read here, in the handler.
  function unlock() {
    if (!patient || !responder || recordOpened) return;
    setRecordOpened(true);
    setAccessLog((log) => [...log, `${utcTime(new Date())} full record opened by ${responder.code} · ${responder.role}`]);
  }

  const { answered, current } = walkPath(path);
  const isFinished = current === null;
  const delaySeconds = environmentInfo(environment).delaySeconds;
  const isGroundLive = delaySeconds <= LIVE_GROUND_MAX_DELAY_SECONDS;
  const replyMinutes = roundTripMinutes(delaySeconds);

  // The tree ended on UNABLE: the last action was not done, so the screen must not say "complete".
  const lastAnswer = answered[answered.length - 1];
  const endedUnable =
    isFinished && lastAnswer !== undefined && lastAnswer.step.type === "instruction" && lastAnswer.answer.answer === "no";

  const question = current
    ? current.text
    : endedUnable
      ? "Last action not completed. Stay with the crewmember and call the crew medical officer"
      : "Stay with the crewmember and keep the monitor on";
  // ARGUS never transmits anything itself, so the end screen says the message is ready to
  // copy for the ship's comms, not that it was sent or queued.
  const hint = current
    ? current.hint
    : isGroundLive
      ? "Ground is live on the loop. Copy the message for the ground (right) to share the step log."
      : `Copy the message for the ground (right) for the ship's comms to send. Earliest reply in ${replyMinutes} min at the current delay. Keep acting.`;

  // The clock is read here, in the handler, never during render.
  // The updater re-checks the tree, so a fast double key press cannot answer past the end.
  const answer = useCallback(
    (value: "yes" | "no") => {
      if (!patientId || !responderId) return; // choose who needs help and who is responding first
      const now = new Date();
      const entry = { answer: value, time: utcTime(now), at: now.getTime() };
      setPath((old) => (walkPath(old).current ? [...old, entry] : old));
    },
    [patientId, responderId],
  );

  // Builds the message for the ground and copies it, ready for the ship's comms system.
  // ARGUS has no server, so it never sends anything itself.
  async function copyGroundMessage() {
    if (!patient || !responder) return;
    const text = buildEmergencyMessage({
      patient,
      responder,
      scenario: EMERGENCY_SCENARIO,
      missionDay,
      environment: environmentInfo(environment).label,
      oneWayDelaySeconds: delaySeconds,
      sentAtUtc: utcTime(new Date()),
      steps: answered.map(({ step, answer: given }) => ({
        id: step.id,
        time: given.time,
        question: step.text,
        answer: buttonLabel(step, given.answer),
        logged: given.answer === "yes" ? step.logYes : step.logNo,
      })),
      vitals: vitalsForMessage(),
      accessLog,
      finished: isFinished,
      lastActionNotDone: endedUnable,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Message copied. Paste it into the ship's comms to send it to the ground.");
    } catch {
      setCopyMessage("Copying is blocked in this browser.");
    }
  }

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

  // Paths are 3 to 5 steps long, so the total follows the branch taken: the answers so far
  // plus the longest route left from here.
  const stepCount = path.length + (current ? stepsLeft(current.id) : 0);
  const stepNumber = isFinished ? stepCount : path.length + 1;

  return (
    <Screen label="Emergency">
      <div className="grid">
        <div className="c12 em-band">
          <span style={{ letterSpacing: ".1em" }}>EMERGENCY MODE</span>
          <span style={{ fontWeight: 500 }}>{EMERGENCY_SCENARIO}</span>
          {patient ? <span>Patient: {crewLabel(patient)}</span> : null}
          <span style={{ flex: 1 }}></span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setPath([]);
              setPatientId(null);
              setResponderId(null);
              setCopyMessage(null);
              setRecordOpened(false);
              setAccessLog([]);
            }}
          >
            Restart
          </button>
          <button type="button" className="btn btn-sm" onClick={() => router.push("/")}>
            Exit
          </button>
        </div>

        <div className="cell c8" style={{ padding: 32 }}>
          {!started ? (
            <div className="stack" style={{ gap: 24 }}>
              <div>
                <span className="lbl">Before the steps</span>
                <h1 className="em-q">Who needs help?</h1>
                <p className="em-hint">
                  Tap the crewmember. You are the responder, so the steps start at once. If you are
                  helping the person signed in to this console, also choose who is responding.
                </p>
              </div>
              {/* Big targets: this is tapped in a hurry, maybe with gloves. */}
              <div
                role="group"
                aria-label="Who needs help"
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}
              >
                {CREW.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="btn"
                    aria-pressed={c.id === patientId}
                    style={{
                      minHeight: 72,
                      fontSize: 18,
                      borderRadius: 20,
                      flexDirection: "column",
                      gap: 2,
                      outline: c.id === patientId ? "3px solid currentColor" : undefined,
                    }}
                    onClick={() => setPatientId(c.id)}
                  >
                    <span className="mono" style={{ fontWeight: 500 }}>{c.code}</span>
                    <small style={{ color: "var(--mu)", fontSize: 13 }}>
                      {c.role}
                      {c.id === activeCrewId ? " · signed in" : ""}
                    </small>
                  </button>
                ))}
              </div>
              <div>
                <span className="lbl" style={{ display: "block" }}>Who is responding?</span>
                <div className="seg" role="group" aria-label="Who is responding" style={{ flexWrap: "wrap", marginTop: 8 }}>
                  {CREW.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={c.id === responderId}
                      onClick={() => setResponderId(c.id)}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>
              <p className="hint">
                Crew roles are demo data. A responder sees only the vitals a rescuer needs; opening
                the full record is logged.
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 32 }}>
              <div className="row">
                <span className="lbl">Step</span>
                <span className="ref mono">{current ? current.id.toUpperCase() : "END"}</span>
                <div className="pips" aria-hidden="true">
                  {Array.from({ length: stepCount }, (_, i) => (
                    <i key={i} className={i < path.length ? "ok" : i === path.length ? "cur" : ""}></i>
                  ))}
                </div>
                <span className="hint mono">
                  {stepNumber} of {stepCount}
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
                  {current
                    ? current.type === "question"
                      ? "Question"
                      : "Action"
                    : endedUnable
                      ? "Sequence ended · last action not completed"
                      : "Sequence complete"}
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
          )}
        </div>

        <div className="cell c4 flush">
          <VitalsPanel key={patientId ?? "none"} patientId={patientId} access={access} onUnlock={unlock} />
          <div className="head" style={{ borderTop: "1px solid var(--line)" }}>
            <h2>Step log</h2>
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
            <h2>Ground contact</h2>
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
          <div className="kv">
            <button type="button" className="btn btn-pri" disabled={!patient} onClick={copyGroundMessage}>
              Copy message for the ground
            </button>
            <p className="hint" style={{ margin: 0 }}>
              Who needs help, who is responding, every step with its time
              , the emergency vitals and who opened the full record. ARGUS
              does not send it: the ship&apos;s comms do.
            </p>
            <p role="status" className="hint" style={{ margin: 0 }}>
              {copyMessage}
            </p>
          </div>
        </div>
      </div>
    </Screen>
  );
}
