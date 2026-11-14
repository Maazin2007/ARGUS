# Backend plan: Maazin, Angad, James

"Backend" here means the logic and data behind the screens: `src/lib/`, `src/data/`, `scripts/` and `tests/`. There is no server and no database. Everything runs in the browser and Vercel only hosts the files. That is a deliberate choice: a server would add logins, hosting and failure points that the demo does not need.

Read `FLOW.md` first for the big picture, and `CODING_STANDARDS.md` before your first commit.

## How the three of you stay independent

1. **Each person owns their own files.** Nobody edits a file in someone else's column. That removes merge conflicts.
2. **Everyone codes against `src/lib/types.ts`.** It already exists. It describes the shape of a reading, a status result, a config rule and an emergency step. If your code accepts and returns those shapes, it will fit with everyone else's.
3. **Everyone tests with their own made-up data.** You never wait for a teammate's real output. Maazin tests with fake rules, James runs against the `getStatus` stub, Angad's functions need nothing from anyone.
4. **The pieces join by themselves.** `getStatus` already exists as a stub that returns "unknown". When Maazin fills it in and Angad fills in `indicators.json`, the screens and James's scripts start showing real statuses without anyone changing their code.

| | Maazin | Angad | James |
|---|---|---|---|
| Area | Status engine | Storage, input checks, thresholds | Simulation, evidence, emergency tree |
| Files | `src/lib/status.ts`, `src/lib/baseline.ts`, `tests/status.test.ts`, `tests/baseline.test.ts` | `src/lib/storage.ts`, `src/lib/validate.ts`, `src/data/indicators.json`, `src/data/cards.json`, `tests/validate.test.ts`, `tests/data.test.ts` | `src/lib/feelVsData.ts`, `src/lib/emergency.ts`, `src/data/emergency.json`, `src/data/seed.json`, `scripts/`, `results/`, `tests/feelVsData.test.ts`, `tests/emergency.test.ts` |
| You will learn | Pure functions, writing tests, turning rules into code | Browser storage, JSON, input validation, reading a scientific source | Reproducible random data, command-line scripts, measuring whether a method works |

Commands everyone uses:

```
npm run dev      # the app at http://localhost:3000
npm test         # every file in tests/
npm run lint     # style and mistake checker
```

A test file looks like `tests/status.test.ts`. Copy it as your starting point.

---

## Maazin: the status engine

**Goal:** one function, `getStatus`, that takes a reading and answers green, amber, red or unknown, with plain-language reasons.

**The idea to learn: pure functions.** A pure function only uses its arguments and only returns a value. It does not read the clock, storage or the screen. That is why `now` is passed in as an argument. Pure functions are easy to test: same input, same output, every time.

### Step 1. Run what exists (10 minutes)
Read `src/lib/types.ts` and `src/lib/status.ts`. Run `npm test` and see one test pass. Change the stub's status to `"green"`, run again, change it back. Now you know the loop: edit, test, read the result.

### Step 2. Median and spread (`src/lib/baseline.ts`)
Write two small functions and test them in `tests/baseline.test.ts`.

- `median(numbers)`: sort a copy, take the middle one (or the average of the two middle ones).
- `spread(numbers)`: the median absolute deviation. Take each number's distance from the median, then take the median of those distances.

Why median and not average: one wrong reading (a typo, a bad sensor) drags an average a long way but barely moves a median.

Tests to write: odd count, even count, one number, a list with one extreme value.

### Step 3. The core function with rules passed in
In `status.ts`, add a second function that receives the rules as an argument:

```ts
export function checkReading(reading, history, rules, environment, missionDay, now): StatusResult
```

`getStatus` then becomes one line: it loads the rules from `indicators.json` and calls `checkReading`. Why split it: your tests can pass in fake rules with easy numbers (say 50 to 100), so you are not waiting for Angad's real ones. Label them clearly as test values.

Build the decision order one rule at a time. Write the test first, watch it fail, then make it pass.

1. **Unknown.** No rule matches the reading's measure and context, or the reading is older than a stale limit (a demo parameter constant at the top of the file). Example: an exercise heart rate has no rule, so it is unknown.
2. **Red.** The value is outside the rule's `criticalLimit`. Set `criticalLimitCrossed: true`. If `criticalLimit` is `null` (sleep, mood), skip this step.
3. **Amber.** The value is outside the reference range.
4. **Green.** Nothing fired.

Every rule that fires pushes one plain sentence into `reasons`, such as "Heart rate 130 bpm is above the reference range of 60 to 100 bpm."

### Step 4. Environment adjustment
Write `adjustRange(rule, environment, missionDay)`. If the rule has an adjustment for this environment:

```
adjusted limit = earth limit + shift × min(missionDay ÷ rampDays, 1)
```

The `min(..., 1)` stops the shift growing past its full size. Use the adjusted range in step 3's amber check and set `adjusted: true` in the result. Never apply it to the critical limit.

Tests: mission day 0 gives the Earth range; a day past `rampDays` gives the full shift; a temperature that is amber on Earth is green late in the mission; a temperature above the critical limit is still red.

### Step 5. Personal baseline
Add `buildBaseline(reading, history)` to `baseline.ts`.

1. Keep only earlier readings with the same indicator, the same context and the same `simulated` value.
2. Walk through them from oldest to newest, keeping a list of "normal" readings. A reading joins the list if the list has fewer than 5 items, or if it is close to the median of the list so far (within the larger of the rule's `baselineFloor` or 3 × spread).
3. The baseline is the median of the last 10 normal readings from the past 14 days. Fewer than 5: return `null`, and add the reason "Baseline not available yet."

Why the walk: if a fever builds slowly and every reading is added to the baseline, the baseline rises with the fever and never notices it. Leaving unusual readings out keeps the baseline where it was. This changes section 4 of the docx, which used the plain last 10 readings.

Then in `checkReading`: if this reading and the two before it all sit outside the baseline, return amber. A baseline deviation never returns red.

### Step 6. Blood pressure
It has two numbers, so it has two measures, `systolic` and `diastolic`, each with its own rule. Run the check on each and return the worse of the two results, with the reasons from both. Write `if (reading.indicator === "bloodPressure")` first; inside that block TypeScript knows `systolic` and `diastolic` exist.

### Done when
`npm test` passes with a test for each rule, baseline not ready, unknown for an unsupported context, late-mission temperature green after adjustment, and above-critical temperature still red.

---

## Angad: storage, input checks and thresholds

**Goal:** readings are saved and loaded safely, typing mistakes are caught, and every medical number in the app has a source.

### Step 1. Storage (`src/lib/storage.ts`)
**The idea to learn:** `localStorage` is a small key-value store built into every browser. It only stores text, so you turn objects into text with `JSON.stringify` and back with `JSON.parse`.

Write these functions:

```ts
saveReading(reading: Reading): void
getReadings(indicator?: IndicatorId): Reading[]   // oldest first
saveCheckIn(checkIn: CheckIn): void
getCheckIns(): CheckIn[]
clearAll(): void
```

Three things to get right:
- Use one key per list, such as `"argus.readings"`.
- Wrap `JSON.parse` in `try/catch` and return `[]` if the stored text is broken. A crash on load would lock the user out.
- `localStorage` does not exist while Vercel builds the pages. Start each function with `if (typeof window === "undefined") return` (or return `[]`).

This is the only file in the project allowed to mention `localStorage`. If the team later wants a real database, only this file changes.

Test it by hand: run `npm run dev`, open the browser console, and look at Application → Local Storage after saving.

### Step 2. Input checks (`src/lib/validate.ts`)

```ts
validateEntry(measure: Measure, text: string):
  | { ok: true; value: number }
  | { ok: false; message: string }
```

Reject empty text, text that is not a number, and impossible values (a heart rate of 900). The message names the expected unit: "Enter heart rate in bpm, for example 72."

These bounds only catch typing errors. They are not medical limits, so keep them wide and say so in a comment. Write tests in `tests/validate.test.ts`: empty, letters, negative, impossible, a normal value, mood 3.5 (mood must be a whole number 1 to 5).

### Step 3. Thresholds (`src/data/indicators.json`)
The file is currently `[]`. Each entry is one `IndicatorRule` from `types.ts`: one measure in one context.

```json
{
  "measure": "heartRate",
  "context": "resting",
  "unit": "bpm",
  "earthRange":    { "low": 0, "high": 0, "source": "" },
  "criticalLimit": { "low": 0, "high": 0, "source": "" },
  "baselineFloor": 10,
  "adjustments": []
}
```

Rules for filling it in:
- **Open the source and copy the number from it.** Never type a medical number from memory or from an AI answer. Record the source name and link in `source`.
- If no source gives a number, write `"demo parameter"` as the source, or set `criticalLimit` to `null` so there is no red rule.
- Only add a rule for a context you have a range for. Resting heart rate gets a rule; exercise heart rate does not, and will correctly show as unknown.

Order: heart rate first (the team needs it today), then body temperature and both blood pressure measures with their `adjustments` (Stahn 2017 and Norsk 2015, listed in the docx), then glucose (fasting and after a meal are separate rules), sleep and mood (both with `criticalLimit: null`).

### Step 4. A test that guards the data (`tests/data.test.ts`)
Import the JSON and check every rule: `source` is not empty, and `low` is less than `high` where both exist. This turns the team's rule "every number has a source" into something the computer checks on every run.

### Step 5. Cards (`src/data/cards.json`)
One `Card` per indicator, five sections each. Write them while the source is still open from step 3. Short sentences, written for someone who is not a doctor. Heart rate first. If the frontend team has a spare person, hand this step over; it needs no code.

### Done when
A reading saved on one page appears after a refresh; bad input shows a helpful message; all six indicators have rules with sources; `npm test` passes.

---

## James: simulation, evidence and the emergency tree

**Goal:** fake but realistic data for the demo, a table that shows whether our alert rules work, and the emergency decision tree.

### Step 1. Feel vs. data (`src/lib/feelVsData.ts`)
A warm-up that needs nothing from anyone.

```ts
checkFeelVsData(selfRating: number, statuses: Status[]): string | null
```

Return the message when the rating is 4 or 5 and any status is amber or red, or when the rating is 1 or 2 and every status is green. Otherwise return `null`. Message: "Your readings don't match how you feel. Consider re-measuring or adding a symptom note." Put the cut-offs in named constants marked as demo parameters. Test each case in `tests/feelVsData.test.ts`.

### Step 2. A repeatable random generator (`scripts/generate.ts`)
**The idea to learn: seeds.** `Math.random()` gives different numbers each run, so nobody could reproduce our results table. A seeded generator gives the same sequence every time for the same seed. A small one called mulberry32 is about six lines; copy it in and credit it in a comment.

Write a function that makes one healthy astronaut's readings: one resting heart rate per day for 30 days, a base value plus a little random noise. Every reading has `simulated: true`. Write the list to `src/data/seed.json`. Run it with `npm run generate`, and run it twice to check the file does not change.

Then add the other indicators the same way.

### Step 3. The fever scenario
Add a scenario file, `scripts/scenarios/fever.json`, with the seed, the mission day the fever starts, how fast temperature rises, and the alerts you expect. **Commit this file before running the evaluation.** If you tune the numbers after seeing results, you are fitting the test to the answer; if you do change them, say so on the project page.

### Step 4. The results table (`scripts/evaluate.ts`)
Run the scenario's readings through `getStatus` three ways. You do not need to change `getStatus` to do it:

| Method | How to call it |
|---|---|
| Earth range only | `environment: "earth"`, empty history |
| Adjusted range | real environment, empty history |
| Adjusted range and baseline | real environment, real history |

For each method count: days from fever start to the first alert, missed alerts, and false alerts before the fever started. Count amber and red separately. Write the table to `results/fever.md`. Run with `npm run evaluate`.

Until Maazin's engine is merged the table will show "unknown" everywhere. That is fine: build the script against the stub, and the real numbers appear later with no change from you. Report what the table shows, even if the adjusted method is slower.

### Step 5. Emergency tree (`src/data/emergency.json`, `src/lib/emergency.ts`)
The tree is a list of `EmergencyStep` objects. A question step points to its `yes` and `no` steps; an instruction step points to `next`. Start with the shape and placeholder text, then fill in the wording.

- Cardiac-arrest branch: take method, rate, depth and ratio from Hinkelbein et al. 2020. Open the paper; do not write it from memory. Label those steps "Published".
- Anything without a source is labelled "Demo copy". No medication or dosing advice.

In `emergency.ts` write `getStep(id)` and `nextStepId(step, answer)`. In `tests/emergency.test.ts` check that every `yes`, `no` and `next` points to a step that exists, and every step has a label. This catches a broken link before a judge finds it.

### Step 6, if time allows. Check-in due (`src/lib/checkInDue.ts`)
`isCheckInDue(lastCheckInTimestamp, now)` returns true when the last check-in is older than a demo-parameter number of hours.

### Done when
`npm run generate` and `npm run evaluate` each work with one command; the tree can be walked on both branches; `npm test` passes.

---

## Joining up

| When | What |
|---|---|
| Today, 5:30 PM | Each of you shows your part running alone. Then try heart rate through the real screen. |
| Sunday, 9:00 AM | Maazin's engine and Angad's rules are both on `main`. James re-runs `npm run evaluate`. |
| Sunday, 11:00 AM | All six indicators give real statuses on the dashboard. |

If one of you finishes early, write tests for your own code or pair with someone and watch them work. Do not start editing their files on your own.
