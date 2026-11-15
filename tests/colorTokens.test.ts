import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { COLOR_TOKENS, COLOR_TOKEN_VARS } from "@/lib/indicatorMeta";

// Reads the :root block of globals.css into { "--tx": "#16181A", ... }.
function rootVariables(): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const root = css.match(/:root\{([^}]*)\}/);
  assert.ok(root, "globals.css has a :root block");
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

test("colour tokens match the variables in globals.css", () => {
  const vars = rootVariables();
  for (const [key, cssVar] of Object.entries(COLOR_TOKEN_VARS)) {
    const css = vars[cssVar];
    assert.ok(css, `${cssVar} exists in globals.css`);
    assert.equal(
      normalise(COLOR_TOKENS[key as keyof typeof COLOR_TOKENS]),
      normalise(css),
      `${key} should match ${cssVar}`,
    );
  }
});
