"use client";

import { useArgus } from "@/components/ArgusProvider";

// Wraps one screen: the labelled <section>, plus the alert shown when saving to storage failed.
// The screen and its cards appear at once; there is no entrance animation.
export function Screen({ label, children }: { label: string; children: React.ReactNode }) {
  const { storageError, setStorageError } = useArgus();

  return (
    <section className="screen on" aria-label={label}>
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
