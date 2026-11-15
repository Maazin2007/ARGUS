"use client";

import { useState } from "react";
import type { Card, IndicatorId } from "@/lib/types";
import cardsData from "@/data/cards.json";

const CARDS = cardsData as Card[];

const NOT_WRITTEN = "Card not written yet.";

// One accordion section's body: the text, then its source on a small line underneath.
function SourcedText({ text, source, hazard }: { text: string; source: string; hazard?: string }) {
  return (
    <>
      <p>
        {hazard ? <b>{hazard}. </b> : null}
        {text}
      </p>
      <span className="src">{source}</span>
    </>
  );
}

// The five reference-card sections from cards.json, as the mockup's accordion.
export function ReferenceCard({ id }: { id: IndicatorId }) {
  // "How to measure" starts open, as in the mockup. Open sections stay open when
  // switching indicators, again like the mockup.
  const [openSections, setOpenSections] = useState([true, false, false, false, false]);
  const card = CARDS.find((c) => c.indicator === id) ?? null;
  const missing = <p>{NOT_WRITTEN}</p>;

  const sections: { title: string; body: React.ReactNode }[] = [
    { title: "How to measure", body: card ? <SourcedText {...card.howToMeasure} /> : missing },
    { title: "Why it matters", body: card ? <SourcedText {...card.whyItMatters} /> : missing },
    {
      title: "What spaceflight does",
      body: card
        ? card.hazardEffects.map((h, i) => <SourcedText key={i} hazard={h.hazard} text={h.text} source={h.source} />)
        : missing,
    },
    {
      title: "What you can do",
      body: card ? card.selfCare.map((item, i) => <SourcedText key={i} {...item} />) : missing,
    },
    { title: "When to escalate", body: card ? <SourcedText {...card.whenToEscalate} /> : missing },
  ];

  function toggle(index: number) {
    setOpenSections(openSections.map((isOpen, i) => (i === index ? !isOpen : isOpen)));
  }

  return (
    <div className="cell c12 flush">
      <div className="head">
        <h2>Reference card</h2>
        <span className="pill">cards.json</span>
      </div>
      <div>
        {sections.map((section, i) => (
          <div key={section.title} className={openSections[i] ? "acc open" : "acc"}>
            <button type="button" aria-expanded={openSections[i]} onClick={() => toggle(i)}>
              <span className="ref mono">{String(i + 1).padStart(2, "0")}</span>
              {section.title}
              <span className="pm mono">{openSections[i] ? "−" : "+"}</span>
            </button>
            <div>{section.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
