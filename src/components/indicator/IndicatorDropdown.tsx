"use client";

import { useEffect, useRef, useState } from "react";
import type { IndicatorId } from "@/lib/types";
import { INDICATORS, INDICATOR_ORDER } from "@/lib/indicatorMeta";
import { COLOR_TOKENS } from "@/lib/indicatorMeta";

// The mockup's custom indicator picker: a button that opens a listbox.
// Keyboard: arrows move between options, Enter/Space picks, Escape closes.
export function IndicatorDropdown({
  value,
  onChange,
}: {
  value: IndicatorId;
  onChange: (id: IndicatorId) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // When the menu opens, focus the selected option so arrow keys start from there.
  useEffect(() => {
    if (!isOpen) return;
    const selected = INDICATOR_ORDER.indexOf(value);
    itemRefs.current[selected >= 0 ? selected : 0]?.focus();
  }, [isOpen, value]);

  // A click anywhere outside the dropdown closes it.
  useEffect(() => {
    if (!isOpen) return;
    function onDocumentClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [isOpen]);

  function pick(id: IndicatorId) {
    onChange(id);
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function onItemKeyDown(e: React.KeyboardEvent<HTMLLIElement>, index: number, id: IndicatorId) {
    const count = INDICATOR_ORDER.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itemRefs.current[(index + 1) % count]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itemRefs.current[(index + count - 1) % count]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(id);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div className="dd" ref={wrapRef}>
      <button
        type="button"
        className="dd-btn"
        ref={buttonRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Indicator"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{INDICATORS[value].name}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke={COLOR_TOKENS.muted} strokeWidth="1.5" />
        </svg>
      </button>
      <ul className="dd-menu" role="listbox" aria-label="Indicator" hidden={!isOpen}>
        {INDICATOR_ORDER.map((id, index) => (
          <li
            key={id}
            role="option"
            tabIndex={-1}
            aria-selected={id === value}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            onClick={() => pick(id)}
            onKeyDown={(e) => onItemKeyDown(e, index, id)}
          >
            <span className="ref mono">{INDICATORS[id].ref}</span>
            {INDICATORS[id].name}
          </li>
        ))}
      </ul>
    </div>
  );
}
