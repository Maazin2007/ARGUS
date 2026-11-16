# Coding standards

Short rules so six people's code reads like one person's. When a rule and a deadline disagree, keep `main` working and note what you skipped.

## Keep it simple

- No new library without asking the team. We have React, Next.js, Tailwind and three.js (for the body figure). Charts are hand-built SVG. A few lines of your own code beat a new dependency.
- No server code, no database, no login, no state-management library. React's `useState` and our `storage.ts` are enough.
- Write the plain version first. Make it clever only if it is too slow or too long, which this weekend it will not be.
- If you do not understand a line, do not merge it. This includes lines an AI tool wrote. Ask it, or a teammate, to explain first.

## TypeScript

- Import shared shapes from `@/lib/types`. Do not redefine them.
- No `any`. If the type is hard, ask.
- Named exports: `export function getStatus`. No default exports, except where Next.js requires one (`page.tsx`, `layout.tsx`).
- `const` by default, `let` only when the value changes.
- Functions that fail on bad input return a result the caller can show (`{ ok: false, message }`, or status `"unknown"`). Do not throw for things a user can cause.

## Names

| Thing | Style | Example |
|---|---|---|
| Variables, functions | camelCase | `missionDay`, `getStatus` |
| Types, components | PascalCase | `StatusResult`, `TrendChart` |
| Constants | UPPER_SNAKE_CASE | `MIN_BASELINE_READINGS` |
| Files in `lib/` | camelCase | `feelVsData.ts` |
| Component files | PascalCase | `StatusBadge.tsx` |
| Routes | kebab-case | `check-in/` |

- Put the unit in the name when it is a number of something: `delaySeconds`, `staleAfterHours`.
- Booleans read as questions: `isDue`, `hasBaseline`.
- Use the ids from `types.ts` exactly: `heartRate`, `bloodPressure`, `bloodGlucose`, `bodyTemperature`, `sleepDuration`, `mood`.

## Where code goes

- `src/lib/` is logic only. No React, no `localStorage` (except `storage.ts`), no `Date.now()` or `new Date()` without an argument. Pass `now` in. This keeps the logic testable.
- `src/components/` shows things. A component receives data and draws it. It does not decide what is green or red; it asks `getStatus`.
- `src/data/` holds every medical number and every piece of medical wording. None of it is typed into `.ts` or `.tsx` files.
- Only `storage.ts` touches `localStorage`.

## Medical content

- Every number and instruction has a `source`, or the label `"demo parameter"` or `"Demo copy"`.
- Open the source before you use a number. Never from memory, never from an AI answer.
- The app never says "healthy", "safe" or "normal". Green means "no checks fired".
- No diagnosis, no medication, no dosing.

## React and Next.js

- Every screen starts with `"use client";` on line one. We are not using server features.
- Read from storage inside `useEffect`, not while rendering. The page is first built without a browser, and reading storage there causes a "hydration" error.
- Styling is Tailwind classes. Colours come from the tokens in `globals.css` (see `DESIGN_IDEAS.md`), not one-off hex values.
- Status is always a word and a colour together, through `StatusBadge`.
- Simulated data always shows a "Simulated" tag.

## Comments

- Comment why, not what. `// Median, so one typo does not move the baseline` is useful. `// loop over readings` is not.
- Mark demo values: `// demo parameter`.

## Tests

- Logic in `src/lib/` gets a test file in `tests/` with the same name: `baseline.ts` → `baseline.test.ts`.
- Test names say what should happen: `"exercise heart rate returns unknown"`.
- One behaviour per test. Fixed dates and fixed seeds, so a test passes today and tomorrow.
- Screens are tested by a teammate clicking through them (`plan/SCREEN_TESTS.md`).
- What every test file covers, and which safety rule each test enforces: `plan/TESTING.md`.

## Git

1. `git pull` on `main` before you start.
2. Branch: `yourname/short-topic`, for example `james/feel-vs-data`.
3. Small commits with a message that says what changed: `Add median and spread with tests`.
4. Before you push: `npm run lint && npm test && npm run build`. All three pass.
5. Open a pull request. Vercel builds a preview link for it. One teammate looks; anything medical is also checked by Angad.
6. Merge, delete the branch, tell the group chat.

- Never commit secrets, `.env` files or real health data.
- Do not edit files another person owns (`BACKEND.md` has the list). Ask them, or pair.
- If `main` breaks, fixing it comes before any new feature.

## AI tools

Using them is fine and must be disclosed. Add a row to `plan/AI_USE.md`: which tool and what for.
