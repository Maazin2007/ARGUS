import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { COLOR_TOKENS, COLOR_TOKENS_DARK, COLOR_TOKEN_VARS } from "@/lib/indicatorMeta";

// Reads one :root block of globals.css into { "--tx": "#12161A", ... }.
// The first block is the light theme; the :root[data-theme="dark"] block is the dark theme.
function rootVariables(theme: "light" | "dark"): Record<string, string> {
  let css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  if (theme === "dark") {
    const start = css.indexOf(':root[data-theme="dark"]');
    assert.ok(start >= 0, "globals.css has a dark theme block");
    css = css.slice(start);
  }
  // [^{]* allows the dark block's longer selector, :root[data-theme="dark"].
  const root = css.match(/:root[^{]*\{([^}]*)\}/);
  assert.ok(root, `globals.css has a :root block for the ${theme} theme`);
  const vars: Record<string, string> = {};
  for (const part of root[1].split(";")) {
    const [name, ...rest] = part.split(":");
    if (name.trim().startsWith("--")) vars[name.trim()] = rest.join(":").trim();
  }
  return vars;
}

// #fff and #FFFFFF are the same colour, so compare in one spelling.
function normalise(hex: string): string {
  const h = hex.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
}

for (const [theme, tokens] of [
  ["light", COLOR_TOKENS],
  ["dark", COLOR_TOKENS_DARK],
] as const) {
  test(`${theme} colour tokens match the variables in globals.css`, () => {
    const vars = rootVariables(theme);
    for (const [key, cssVar] of Object.entries(COLOR_TOKEN_VARS)) {
      const css = vars[cssVar];
      assert.ok(css, `${cssVar} exists in the ${theme} block of globals.css`);
      assert.equal(
        normalise(tokens[key as keyof typeof COLOR_TOKENS]),
        normalise(css),
        `${key} should match ${cssVar} (${theme})`,
      );
    }
  });
}
