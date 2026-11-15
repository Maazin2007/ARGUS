"use client";

import Link from "next/link";
import type { IndicatorId } from "@/lib/types";
import { INDICATORS, environmentInfo, roundTripMinutes } from "@/lib/indicatorMeta";
import { useArgus } from "@/components/ArgusProvider";
import copy from "@/data/escalation.json";

export type CriticalItem = { id: IndicatorId; reason: string };

// demo parameter: above this one-way delay, the card tells the crew not to wait for Earth.
const LIVE_DELAY_MAX_SECONDS = 5;

// Shown when any status is red: what is critical, who to notify, what to do meanwhile,
// and the simulated signal delay from environments.json. Renders nothing when `items` is empty.
export function EscalationCard({ items }: { items: CriticalItem[] }) {
  const { environment } = useArgus();
  if (!items.length) return null;
  const delay = environmentInfo(environment).delaySeconds;

  return (
    <div className="esc-card" role="alert">
      <div className="row" style={{ gap: 12 }}>
        <span className="st st-red">
          <i aria-hidden="true">■</i>
          <span>Critical reading</span>
        </span>
        <span className="lbl">Escalation</span>
        <span style={{ flex: 1 }} />
        <Link className="btn btn-sm esc-em" href="/emergency">
          Open emergency steps
        </Link>
      </div>
      <ul className="esc-list">
        {items.map((item) => (
          <li key={item.id}>
            <b>{INDICATORS[item.id].name}</b> {item.reason}
          </li>
        ))}
      </ul>
      <div className="esc-grid">
        <div>
          <span className="lbl">Notify now</span>
          <p>{copy.notifyNow}</p>
        </div>
        <div>
          <span className="lbl">Meanwhile</span>
          <p>{copy.meanwhile}</p>
        </div>
        <div>
          <span className="lbl">Simulated one-way signal delay</span>
          <p>
            <span className="mono" style={{ fontSize: 20, color: "var(--tx)" }}>
              {delay} s
            </span>
            {delay > LIVE_DELAY_MAX_SECONDS
              ? ` · earliest reply in ${roundTripMinutes(delay)} min. ${copy.delayLongText}`
              : ` · ${copy.delayShortText}`}
          </p>
        </div>
      </div>
    </div>
  );
}
