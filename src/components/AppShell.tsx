"use client";

// The frame around every screen: header strip (status counts, mission day,
// environment switch, signal delay, UTC clock, EMERGENCY), the tab
// bar, and the footer.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Status } from "@/lib/types";
import { ENVIRONMENTS, STATUS_TEXT, environmentInfo } from "@/lib/indicatorMeta";
import { useAllStatuses, useArgus } from "@/components/ArgusProvider";
import { replayAnimation } from "@/components/Screen";
import { ThemeButton } from "@/components/ThemeButton";

function pad2(n: number): string {
  return (n < 10 ? "0" : "") + n;
}

function utcClock(d: Date): string {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

// Short environment labels on the switch, as in the mockup.
const ENV_BUTTON_LABEL: Record<string, string> = { station: "Station" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { environment, setEnvironment, missionDay } = useArgus();
  const statuses = useAllStatuses();
  const delay = environmentInfo(environment).delaySeconds;

  // The clock starts empty so the server and browser render the same first frame.
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setClock(utcClock(new Date()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Every number tagged data-delay flickers in when the environment changes.
  // Compare with the previous environment instead of a "first run" flag: React runs effects
  // twice in development, which got past the flag and added the class before the page had
  // loaded, so the server and browser HTML disagreed (a hydration error on Emergency).
  const prevEnv = useRef(environment);
  useEffect(() => {
    if (prevEnv.current === environment) return;
    prevEnv.current = environment;
    document.querySelectorAll("[data-delay]").forEach((el) => replayAnimation(el, "tick"));
  }, [environment]);

  const counts: Record<Status, number> = { green: 0, amber: 0, red: 0, unknown: 0 };
  for (const s of statuses) counts[s.state.result.status]++;

  return (
    <div className="app">
      {/* Header, in reading order: what this is, how the crew is doing (the six statuses),
          then the mission context in smaller type, then EMERGENCY. */}
      <header className="top">
        <div>
          <span className="brand">ARGUS</span>
          <span className="brand-sub">Crew health monitoring</span>
        </div>
        <div>
          <span className="lbl">Six indicators</span>
          <span className="val mono">
            {(["green", "amber", "red", "unknown"] as Status[]).map((k) => (
              <span
                key={k}
                className={`cnt st st-${k}`}
                title={STATUS_TEXT[k].label}
                style={k === "unknown" ? { marginRight: 0 } : undefined}
              >
                <i aria-hidden="true">{STATUS_TEXT[k].symbol}</i>
                <span aria-label={`${STATUS_TEXT[k].label}: ${counts[k]}`}>{counts[k]}</span>
              </span>
            ))}
          </span>
        </div>
        <div className="spacer" />
        {/* One group, so on a narrow screen the context wraps to the next line together. */}
        <div className="ctx-group">
          <div className="ctx">
            <span className="lbl">Mission day</span>
            <span className="val mono">{missionDay}</span>
          </div>
          <div className="ctx">
            <span className="lbl">Environment</span>
            <div className="seg" role="group" aria-label="Environment">
              {ENVIRONMENTS.map((env) => (
                <button
                  key={env.id}
                  type="button"
                  aria-pressed={env.id === environment}
                  onClick={() => setEnvironment(env.id)}
                >
                  {ENV_BUTTON_LABEL[env.id] ?? env.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ctx">
            <span className="lbl">Signal delay · simulated</span>
            <span className="val mono">
              <span data-delay="">{delay}</span> s
            </span>
          </div>
          <div className="ctx">
            <span className="lbl">UTC</span>
            <span className="val mono">{clock}</span>
          </div>
        </div>
        <Link href="/emergency" className="btn-em">
          EMERGENCY
        </Link>
      </header>

      {/* The tab bar reads the URL, so Next.js 16 needs it inside <Suspense>. The fallback
          is the same bar with no tab selected; it only shows while a URL is unknown. */}
      <div className="nav-row">
        <Suspense fallback={<nav className="tabs" aria-label="Screens" />}>
          <Tabs />
        </Suspense>
        <ThemeButton />
      </div>

      <main>{children}</main>

      {/* Footer: the one statement a reader must not miss comes first and darker. */}
      <footer className="foot">
        <strong>Not a medical device. No diagnosis, no medication advice.</strong>
        <span>Simulated data. Every number has a source or is marked demo parameter.</span>
        <span
          className="offline-badge"
          title="ARGUS makes no server calls: readings stay in this browser's storage on this device."
        >
          On-board storage · no server calls
        </span>
        <span>NASA Space Apps Challenge 2026 · Team SpaceRangers · prototype</span>
      </footer>
    </div>
  );
}

type Tab = { href: string; label: string; active: boolean };

// Tab bar. The selected tab gets the dark pill (CSS: .tabs [aria-selected="true"]).
function Tabs() {
  const { lastIndicator } = useArgus();
  const pathname = usePathname();
  const tabs: Tab[] = [
    { href: "/", label: "Dashboard", active: pathname === "/" },
    { href: "/check-in", label: "Check-in", active: pathname.startsWith("/check-in") },
    {
      href: `/indicator/${lastIndicator}`,
      label: "Indicator detail",
      active: pathname.startsWith("/indicator"),
    },
    { href: "/emergency", label: "Emergency", active: pathname.startsWith("/emergency") },
    { href: "/alerts", label: "Alert test", active: pathname.startsWith("/alerts") },
    { href: "/handover", label: "Handover", active: pathname.startsWith("/handover") },
  ];


  return (
    <nav className="tabs" role="tablist" aria-label="Screens">
      {tabs.map((tab) => (
        <Link key={tab.label} href={tab.href} role="tab" aria-selected={tab.active}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
