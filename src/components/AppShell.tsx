"use client";

// The frame around every screen, as in the mockup: header strip (mission day,
// environment switch, signal delay, UTC clock, status counts, EMERGENCY), the tab
// bar with its sliding ink, and the footer.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Status } from "@/lib/types";
import { ENVIRONMENTS, STATUS_TEXT, environmentInfo } from "@/lib/indicatorMeta";
import { useAllStatuses, useArgus } from "@/components/ArgusProvider";
import { replayAnimation } from "@/components/Screen";

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
      <header className="top">
        <div>
          <span className="brand">ARGUS</span>
          <span className="brand-sub mono">CREW AUTONOMOUS MEDICAL CONSOLE // HAB-04</span>
        </div>
        <div>
          <span className="lbl">Mission day</span>
          <span className="val mono">{missionDay}</span>
        </div>
        <div>
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
        <div>
          <span className="lbl">Signal delay · simulated</span>
          <span className="val mono">
            <span data-delay="">{delay}</span> s
          </span>
        </div>
        <div>
          <span className="lbl">UTC</span>
          <span className="val mono">{clock}</span>
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
        <Link href="/emergency" className="btn-em">
          EMERGENCY
        </Link>
      </header>

      {/* The tab bar reads the URL, so Next.js 16 needs it inside <Suspense>. The fallback
          is the same bar with no tab selected; it only shows while a URL is unknown. */}
      <Suspense fallback={<nav className="tabs" aria-label="Screens" />}>
        <Tabs />
      </Suspense>

      <main>{children}</main>

      <footer className="foot">
        <span>Design prototype v13</span>
        <span>NASA Space Apps Challenge 2026 · Team SpaceRangers</span>
        <span
          className="offline-badge"
          title="ARGUS makes no server calls: readings stay in this browser's storage on this device."
        >
          ON-BOARD STORAGE · NO SERVER CALLS
        </span>
        <span>Simulated data</span>
        <span>Every number has a source or is marked demo parameter</span>
        <span>Not a medical device. No diagnosis, no medication advice.</span>
      </footer>
    </div>
  );
}

type Tab = { href: string; label: string; active: boolean };

// Tab bar with the dark "ink" pill that slides to the selected tab.
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


  const navRef = useRef<HTMLElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const activeIndex = tabs.findIndex((t) => t.active);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const ink = inkRef.current;
    if (!nav || !ink) return;

    const place = (instant: boolean) => {
      const tab = nav.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!tab) {
        ink.style.width = "0px";
        return;
      }
      if (instant) ink.style.transition = "none";
      ink.style.width = `${tab.offsetWidth}px`;
      ink.style.transform = `translateX(${tab.offsetLeft}px)`;
      if (instant) {
        void ink.offsetWidth;
        ink.style.transition = "";
      }
    };

    // The first placement jumps; later ones slide.
    place(!placed.current);
    placed.current = true;

    const onResize = () => place(true);
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(() => place(true));
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex]);

  return (
    <nav ref={navRef} className="tabs js" role="tablist" aria-label="Screens">
      <span ref={inkRef} className="tab-ink" />
      {tabs.map((tab, i) => (
        <Link key={tab.label} href={tab.href} role="tab" aria-selected={tab.active}>
          <span className="n mono">{`0${i + 1}`}</span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
