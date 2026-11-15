"use client";

import { useEffect, useRef } from "react";
import { useArgus } from "@/components/ArgusProvider";

// Wraps one screen. Mounting with the `screen on` classes plays the mockup's entrance:
// the screen fades in and each `.cell` rises in turn (CSS in globals.css).
// Cells that start below the fold glide in later, as they scroll into view.
export function Screen({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const { storageError, setStorageError } = useArgus();

  // Next.js 16 keeps a visited screen alive but hidden (React <Activity>): leaving the screen
  // runs this cleanup (the observer is disconnected) and coming back runs the effect again on
  // the SAME DOM, so cells may already carry `rv` from the last visit. A cell still waiting
  // (`rv` without `in`) must be observed again wherever it is now; otherwise, if it moved into
  // view while hidden (window resized, banner or card above it gone), nothing ever adds `in`
  // and it stays at opacity 0, which looked like "the data doesn't appear".
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const waiting = () => section.querySelectorAll(".cell.rv:not(.in)");
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      // No reveal animation here: show any cell left waiting by an earlier visit.
      waiting().forEach((cell) => cell.classList.add("in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    // Cells still waiting from an earlier visit: observe them again. The observer reports
    // each one straight away, so one that is already on screen gets `in` at once.
    waiting().forEach((cell) => observer.observe(cell));
    // Cells that start below the fold: hide them until they scroll into view.
    section.querySelectorAll(".cell:not(.rv)").forEach((cell) => {
      if (cell.getBoundingClientRect().top > window.innerHeight * 0.92) {
        cell.classList.add("rv");
        observer.observe(cell);
      }
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="screen on" aria-label={label}>
      {storageError && (
        <div className="storage-alert" role="alert">
          <span>{storageError}</span>
          <button type="button" className="btn btn-sm" onClick={() => setStorageError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {children}
    </section>
  );
}

// Restarts a CSS animation on an element (used for the `tick` and `swap` effects).
export function replayAnimation(el: Element | null, className: string): void {
  if (!el) return;
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth; // forces the browser to notice the removal
  el.classList.add(className);
}
