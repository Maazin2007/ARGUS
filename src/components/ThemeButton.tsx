"use client";

// The light / dark switch at the end of the tab bar.
// The theme is one attribute, <html data-theme="light"> or "dark". globals.css has a set of
// colour variables for each value, so changing the attribute recolours the whole app.
// The choice is saved in this browser, so it is still there after a reload.

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

// A display setting, not health data, so it has its own key and "Load demo profile" leaves it alone.
const THEME_KEY = "argus.theme";

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function ThemeButton() {
  // Starts as "light" because that is what the server sends (layout.tsx).
  const [theme, setTheme] = useState<Theme>("light");

  // After the page loads, switch to dark if that was the saved choice.
  useEffect(() => {
    const restore = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(THEME_KEY);
      } catch {
        // Storage can be blocked (private window). The app then just stays light.
      }
      if (saved === "dark") {
        applyTheme("dark");
        setTheme("dark");
      }
    };
    restore();
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not saved: the theme still changes now, it just will not be remembered.
    }
  }

  // The label says what pressing the button will do.
  return (
    <button type="button" className="btn btn-ghost btn-sm no-print" onClick={toggle}>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
