# Testing

How ARGUS is tested: what the 153 automated tests check, which safety rules they guarantee, and what is checked by hand instead.

## Running the tests

```
npm test                                     # all 153 tests
npx tsx --test tests/status.test.ts          # one file
npm run lint && npm test && npm run build    # everything CI runs
```

The tests use Node's built-in test runner (`node:test` and `node:assert/strict`), run through `tsx` so they can read TypeScript directly. No test framework is installed.

GitHub Actions runs lint, the tests and the build on every pull request and every push to `main` (`.github/workflows/ci.yml`, see `plan/DEPLOYMENT.md`). A pull request with a failing test shows a red cross and should not be merged.

## How the tests are written

From `plan/CODING_STANDARDS.md`:

- Each logic file in `src/lib/` has a test file with the same name: `baseline.ts` → `tests/baseline.test.ts`.
- Test names say what should happen: `"stale reading returns unknown"`.
- One behaviour per test.
- Fixed dates and fixed seeds, so a test that passes today passes tomorrow. Logic never reads the clock itself; `now` is passed in.
- Data files (`src/data/*.json`) are tested too, so a wrong number or a missing source fails the build like a code bug.

## The safety rules and the tests that enforce them

These are ARGUS's non-negotiable rules (`plan/BUILD.md`, "Rules for every merge"). Each one has tests that fail if it is broken.

| Rule | Enforced by |
|---|---|
| Missing, stale or unsupported data is unknown, never green | `status.test.ts`: "unsupported context returns unknown", "stale reading returns unknown", "rule with no reference range and no critical limit returns unknown, never green"; `crewBoard.test.ts`: "stale readings are never green" |
| Red comes only from the fixed critical limit, and the space adjustment never moves it | `status.test.ts`: "temperature above criticalLimit stays red even after space adjustment", "rule with only a critical limit still returns red past the limit"; `evaluate.test.ts`: "all three methods turn red on the same day" |
| A baseline deviation alone is never red | `status.test.ts`: "three consecutive readings outside the personal baseline return amber, never red" |
| A slow fever cannot drag the baseline up | `baseline.test.ts`: "buildBaseline leaves out unusual readings after the initial 5" |
| Every medical number or instruction has a source or a demo label | `data.test.ts`: "indicator rules have sources", "every card section ... has a non-empty source or demo label", "every environment ... has a non-empty source"; `emergency.test.ts`: "every step has a valid label and a source", "every Published step cites an opened publication" |
| No diagnosis, no medication or dosing advice | `emergency.test.ts`: "no step gives medication or dosing advice", "no step uses the words healthy, safe or normal" |
| Simulated data is labelled | `seed.test.ts`, `crewBoard.test.ts`: every demo reading is marked simulated; `handover.test.ts`: the telemetry packet says the data is simulated |
| The emergency steps always end and never trap the responder | `emergency.test.ts`: every pointer is a real step, every step is reachable, no loops, every path ends after at most five steps |
| A device cannot store a value a person could not type | `deviceImport.test.ts`: "values a person could not type are rejected, with the row number" |
| No secret is stored in the app | `emergencyMessage.test.ts`: "the crew data holds no PIN or other secret" |
| The published alert results match the code | `evaluate.test.ts`: `results/fever.json`, `summary.json` and `sensitivity.json` must equal a fresh run |

## What each test file covers

| File | Tests | What it checks |
|---|---|---|
| `status.test.ts` | 21 | The status engine (`getStatus`, `adjustRange`): unknown, red, amber and green rules, plain-language reasons, the temperature and blood pressure space adjustments, one-sided ranges, blood pressure's worse-status-wins rule, the baseline alert |
| `baseline.test.ts` | 10 | `median`, `spread` (median absolute deviation) and `buildBaseline`: not pulled by outliers, needs 5 readings, leaves unusual readings out |
| `validate.test.ts` | 9 | Input checks: refuses empty, non-numeric, negative, implausible, exponent and hex input and fractional mood |
| `storage.test.ts` | 11 | Saving and reading readings and check-ins, sorting, clearing, broken stored data, full or blocked storage returning a message instead of crashing, separate storage per crewmember |
| `data.test.ts` | 10 | `indicators.json`, `cards.json`, `environments.json`: sources present, ranges in order, no duplicate rules, contexts and units match the app |
| `seed.test.ts` | 4 | The demo data: 30 readings per indicator, all simulated, and the day-212 temperature amber on Earth and green in Mars transit |
| `random.test.ts` | 4 | The seeded random generator: same seed, same numbers; noise stays in bounds |
| `feelVsData.test.ts` | 9 | When the self-rating and the readings disagree, and when they do not |
| `checkInDue.test.ts` | 7 | The check-in due banner and the combined sleep-with-mood and temperature-with-heart-rate notes |
| `checkInTime.test.ts` | 4 | Check-in timestamps advance, so three out-of-baseline temperatures in a row turn amber |
| `deviceImport.test.ts` | 12 | JSON and CSV device import: round trip, blood pressure, bad values, duplicates, future and zone-less times, mood never imported |
| `handover.test.ts` | 7 | The 7-day handover report: window, alerts with reasons, unknown results, check-ins, the JSON packet |
| `crewBoard.test.ts` | 7 | The Crew table: worst status wins, overdue after two days, each crewmember's own demo data |
| `emergency.test.ts` | 13 | The emergency tree in `emergency.json`: links, reachability, no loops, labels, sources, no medication advice |
| `emergencyMessage.test.ts` | 10 | The ground message and break-the-glass access: limited view for a responder, full record logged, no PIN |
| `evaluate.test.ts` | 13 | The alert test: committed results match the engine, determinism, the odd-reading, spike, sleep and mood expectations, every sensitivity prediction gets a verdict |
| `colorTokens.test.ts` | 2 | The colours used in code match the CSS variables, in light and dark themes |

## How the alert test is protected

`npm run evaluate` writes the files in `results/`. `tests/evaluate.test.ts` reruns every scenario and fails if those files no longer match the current status engine. So nobody can change a rule and leave old, better-looking results in the repo. The protocol behind those results is in `plan/EVALUATION.md`.

## What is not tested by code

- **Screens.** They are tested by a teammate clicking through `plan/SCREEN_TESTS.md`, which covers every screen, the keyboard, offline use and the demo path.
- **Medical correctness.** The tests check that every number has a source or a demo label, not that the source is right. A team member opens each source (`plan/SOURCES.md`, "Opened by").
- **Real astronaut data.** None is used. All tests and scenarios use simulated data.

## Adding a test

1. Put it in the test file named after the logic file, or make one: `src/lib/foo.ts` → `tests/foo.test.ts`.
2. Name it after the behaviour: `test("a reading dated after today is refused", ...)`.
3. Use fixed dates and seeds. Pass `now` in; never let logic read the clock.
4. Run `npm test`, then open the pull request.
