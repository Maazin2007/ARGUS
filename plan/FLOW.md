# How ARGUS works, end to end

ARGUS is a browser app. An astronaut enters readings, the app explains each one, and it guides the crew through one emergency. There is no server: the code is hosted on Vercel and all data stays in the astronaut's browser.

## The five screens

| Screen | Route | What the astronaut does |
|---|---|---|
| Dashboard | `/` | Sees six statuses on the body figure and in a list. Sees the check-in due banner and, on a red status, the escalation card. |
| Check-in | `/check-in` | Enters the six readings and one "how do you feel" rating, one step at a time, then sees the results. |
| Indicator | `/indicator/[id]` | Reads the trend chart and the five-section card for one indicator. |
| Emergency | `/emergency` | Answers yes/no questions, one step per screen. |
| Alert test | `/alerts` | Reads the results table and the day-by-day trace of the fever scenario. |

The header is on every screen: mission day, the environment switch, the simulated signal delay, a count of the six statuses and the emergency button.

Shared state lives in `src/components/ArgusProvider.tsx`: the environment, the mission day, the stored readings and `statusFor(indicator)`, which calls `getStatus` on the latest reading. Switching the environment in the header updates every screen at once.

## The shared console

ARGUS runs as one console for the whole crew. A new browser opens on "Who is using this console?"; tapping a name signs that person in, and "Switch" in the header returns to that screen. Every screen starts again when the crewmember changes, so nothing one person typed is carried over. There is no password, because code in a browser cannot keep a secret.

- Each crewmember's readings and check-ins are stored separately (`src/lib/storage.ts`: `argus.readings.<crew id>`). Every storage function works on the signed-in person unless it is given a crew id.
- Every screen shows the signed-in person's data.
- The dashboard's Crew table shows every crewmember as a status word and last reading day, never a value (`summarizeCrew` in `src/lib/crewBoard.ts`). A critical status, or no reading for two mission days ("Check-in overdue"), gets a button into emergency mode.
- In emergency mode the signed-in person is the responder, so only the patient is asked. If the patient is the signed-in person, or nobody is signed in, it asks who is responding. The patient's rescue vitals show first; the full record opens with one logged tap.
- The demo profile gives all five crewmembers readings. The demo parameters in `src/data/crew.json` give each person their own usual values and make the pilot critical, the medical officer short of sleep (needs review) and mission specialist 2 overdue.

## Flow 1: a check-in

```
Astronaut types "72" for heart rate
        │
        ▼
validateEntry()            src/lib/validate.ts     catches typing errors
        │ ok, for each of the seven steps
        ▼
getStatus()                src/lib/status.ts       decides green / amber / red / unknown
        │   uses rules from src/data/indicators.json
        │   uses history from getReadings()
        ▼
checkFeelVsData()          src/lib/feelVsData.ts   compares the rating with the statuses
        │
        ▼
Results: six StatusBadges, the reasons, the feel vs. data message
        │ any red
        ▼
EscalationCard: who to notify, what to do meanwhile, simulated signal delay (from src/data/environments.json)
        │ "Save to dashboard"
        ▼
saveReading(), saveCheckIn()   src/lib/storage.ts   writes to localStorage
```

Nothing is stored until the astronaut presses "Save to dashboard". Readings saved here are marked simulated, so they join the demo profile's history.

## Flow 2: how a status is decided

`getStatus` stops at the first rule that fires.

1. **Unknown** if no rule covers this measure and context, or the reading is older than 48 hours.
2. **Red** if the value crosses the fixed critical limit. Nothing can move this limit.
3. **Unknown** if the rule has no reference range. Green means a range check ran and found nothing.
4. **Amber** if the value is outside the reference range. In space, the range is first adjusted for the environment and mission day.
5. **Amber** if this reading and the two before it sit outside the personal baseline.
6. **Green** otherwise.

Each rule that fires adds one sentence to the reasons shown on screen.

The adjustment: `adjusted limit = earth limit + shift × min(missionDay ÷ rampDays, 1)`. Only the end the shift points towards moves, so a rise in flight raises the upper limit and leaves the lower limit alone.

The baseline: the median of the last 10 ordinary readings from the past 14 days, plus or minus the larger of the rule's floor or three times the spread. At least 5 readings are needed. Unusual readings are left out, so a slow fever cannot pull the baseline up.

Blood pressure has two measures, systolic and diastolic. Each is checked on its own and the worse status wins.

## Flow 3: looking at one indicator

1. The astronaut clicks a site on the body figure, or a row in the list.
2. The indicator screen takes that indicator's readings and status from `ArgusProvider`.
3. `StripChart` draws the readings over time, with the reference range and the personal baseline as shaded bands.
4. `ReferenceCard` shows the five sections from `src/data/cards.json`: how to measure, why it matters, what spaceflight does, what you can do, when to escalate.

## Flow 4: emergency mode

1. The astronaut presses the emergency button in the header.
2. The screen shows the first step from `src/data/emergency.json`.
3. Each answer is logged with its time, and `nextStepId(step, answer)` picks the next step. The Y and N keys answer too.
4. Each step shows its label, "Published" or "Demo copy", and its source. The compressions step shows how long it has been open.
5. The tree ends when a step has no next step.

Emergency mode reads no stored readings, so it works even if everything else is broken. The screen never adds medical wording of its own; all of it comes from the data file.

## Flow 5: the evidence

```
npm run generate   →  scripts/generate.ts                     →  src/data/seed.json
                      reads scripts/profiles/demo.json           (fixed seed, same output every run)

npm run evaluate   →  scripts/evaluate.ts, scripts/scenario.ts →  results/fever.md, results/fever.json
                      reads scripts/scenarios/fever.json         (three methods compared)
```

The three methods call the same `getStatus` the app uses. Only the inputs differ:

| Method | Environment passed in | History passed in |
|---|---|---|
| Earth range only | `earth` | none |
| Adjusted range | the scenario's environment | none |
| Adjusted range and baseline | the scenario's environment | all earlier readings |

The alert test screen reads `results/fever.json` and draws it. `tests/evaluate.test.ts` fails if the committed results no longer match the engine; run `npm run evaluate` and commit the new files.

## Flow 6: the demo profile

Storage is empty in a new browser. `ArgusProvider` then calls `loadDemoProfile()` (`src/lib/demoProfile.ts`), which saves every reading from `seed.json`. The "Load demo profile" button on the dashboard does the same after clearing what is stored. Every seed reading is marked simulated, and the screens show a "Simulated data" tag.

## Flow 7: from your laptop to the public URL

1. You push a branch and open a pull request. GitHub runs lint, tests and build; Vercel builds a preview link.
2. A teammate checks the preview and merges with "Create a merge commit".
3. Vercel rebuilds `main` and updates https://argus-delta-gules.vercel.app, usually within two minutes.

## What the screens call

| Function or file | Owner | Returns |
|---|---|---|
| `getStatus(reading, history, environment, missionDay, now)` in `src/lib/status.ts` | Maazin | status, reasons, ranges |
| `adjustRange(rule, environment, missionDay)` in `src/lib/status.ts` | Maazin | the adjusted reference range |
| `validateEntry(measure, text)` in `src/lib/validate.ts` | Angad | the number, or a message to show |
| `saveReading`, `getReadings`, `saveCheckIn`, `getCheckIns`, `clearAll` in `src/lib/storage.ts` | Angad | stored readings and check-ins |
| `src/data/indicators.json` | Angad | one rule per measure and context |
| `checkFeelVsData(selfRating, statuses)` in `src/lib/feelVsData.ts` | James | a message or `null` |
| `src/data/seed.json` | James | demo readings, all marked simulated |
| `loadDemoProfile()` in `src/lib/demoProfile.ts` | Maazin | fills storage from `seed.json` |
| `getStep(id)`, `nextStepId(step, answer)` in `src/lib/emergency.ts` | Arnav | emergency steps |
| `src/data/cards.json` | Ihsan | card text |
| `src/data/environments.json` | Maazin | label and simulated signal delay per environment |
| `results/fever.json` | Maazin | the alert test results |
| `src/lib/indicatorMeta.ts` | Arnav | display names, units, context buttons, status words and symbols |

Only `src/lib/storage.ts` touches `localStorage`. The check-in due banner is worked out on the dashboard from the last check-in's mission day.
