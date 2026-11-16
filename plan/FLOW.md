# How ARGUS works, end to end

ARGUS is a browser app. An astronaut enters or imports readings, the app explains each one, packages a handover report for the ground, and guides the crew through one emergency. There is no server: the code is hosted on Vercel and all data stays in the astronaut's browser.

## The six screens

| Screen | Route | What the astronaut does |
|---|---|---|
| Dashboard | `/` | Sees six statuses on the body figure and in a list. Sees the check-in due banner and, on a red status, the escalation card. |
| Check-in | `/check-in` | Enters the six readings and one "how do you feel" rating, one step at a time, then sees the results. |
| Indicator | `/indicator/[id]` | Reads the trend chart and the five-section card for one indicator. |
| Handover | `/handover` | Reads the last 7 mission days, every alert with its reason, and the self-ratings; prints it or copies a JSON packet for the ground. |
| Emergency | `/emergency` | Picks who needs help, sees their rescue vitals, answers yes/no questions one step per screen, and copies a message for the ground. |
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

Device import on the same screen takes a JSON or CSV file instead: `parseDeviceText()` and `rowsToReadings()` in `src/lib/deviceImport.ts` run every row through the same `validateEntry()` as a typed reading, refuse duplicates, future times and times with no time zone, and save the rest marked `provenance: "device"`.

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

1. The astronaut presses the emergency button in the header, or "Open emergency" on a crewmate's row in the Crew table (`/emergency?patient=<crew id>`).
2. Who is who: the signed-in person is the responder. From the Crew table the patient is already chosen, so the steps start at once. From the header it asks "Who needs help?". It asks "Who is responding?" only when the patient is the signed-in person or nobody is signed in.
3. The vitals panel shows the patient's rescue vitals (heart rate, blood pressure, temperature, glucose) with their statuses, and the body figure marks any that are amber or red. "Open full record (logged)" adds the rest with one tap and records who opened it and when (`accessFor` in `src/lib/crew.ts`). There is no PIN.
4. The screen shows the first step from `src/data/emergency.json`. Each answer is logged with its time, and `nextStepId(step, answer)` picks the next step. The Y and N keys answer too.
5. Each step shows its label, "Published" or "Demo copy", and its source. The compressions step shows how long it has been open.
6. The tree ends when a step has no next step. "Copy message for the ground" (`buildEmergencyMessage` in `src/lib/emergencyMessage.ts`) puts the patient, the vitals, the step log and the access log into one plain-text message.

The steps read no stored readings, so the questions still work if storage is broken; only the vitals panel reads them. The Switch button is hidden in emergency mode so the log cannot be lost. The screen never adds medical wording of its own; all of it comes from the data file.

## Flow 5: the evidence

```
npm run generate   →  scripts/generate.ts                     →  src/data/seed.json
                      reads scripts/profiles/demo.json           (fixed seed, same output every run)

npm run evaluate   →  scripts/evaluate.ts, scripts/scenario.ts →  results/fever.md, results/fever.json
                      reads scripts/scenarios/*.json             results/summary.md, results/summary.json
                      (three methods compared)                   results/sensitivity.md, results/sensitivity.json
```

- `fever.*`: the frozen fever scenario, one seed, with the status of every reading.
- `summary.*`: all five scenarios, the frozen seed and 100 seeds each.
- `sensitivity.*`: the fever rerun over 4 noise sizes × 5 rise speeds × 100 seeds, with each pre-registered prediction marked met or not met.

The full protocol (how the data is made, what each measure means, what was pre-registered and when, results and limits) is in `plan/EVALUATION.md`.

The three methods call the same `getStatus` the app uses. Only the inputs differ:

| Method | Environment passed in | History passed in |
|---|---|---|
| Earth range only | `earth` | none |
| Adjusted range | the scenario's environment | none |
| Adjusted range and baseline | the scenario's environment | all earlier readings |

The alert test screen reads `results/summary.json` and draws the table and the trace for each scenario. `tests/evaluate.test.ts` fails if the committed results no longer match the engine; run `npm run evaluate` and commit the new files.

## Flow 6: the demo profile

Storage is empty in a new browser. `ArgusProvider` then calls `loadDemoProfile()` (`src/lib/demoProfile.ts`), which gives every crewmember their own copy of `seed.json`: `demoReadingsFor(crewId)` shifts each indicator by that person's offsets in `src/data/crew.json`, and can change their last day (the pilot's fever, the medical officer's short sleep) or drop it (mission specialist 2's missed check-ins). The "Load demo profile" button on the dashboard does the same after clearing what is stored. Every seed reading is marked simulated, and the screens show a "Simulated data" tag.

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
| `loadDemoProfile()`, `demoReadingsFor(crewId)` in `src/lib/demoProfile.ts` | Maazin | fills every crewmember's storage from `seed.json` |
| `summarizeCrew(readings, environment, missionDay, now)` in `src/lib/crewBoard.ts` | Maazin | worst status, last reading day and overdue flag for the Crew table |
| `accessFor(patientId, responderId, opened)` in `src/lib/crew.ts`, `src/data/crew.json` | Arnav | "emergency" or "full" vitals access |
| `buildEmergencyMessage(input)` in `src/lib/emergencyMessage.ts` | Arnav | the plain-text message for the ground |
| `parseDeviceText`, `rowsToReadings` in `src/lib/deviceImport.ts` | Arnav | readings from a device file, plus the rows refused and why |
| `buildHandover`, `telemetryPacket` in `src/lib/handover.ts` | Arnav | the 7-day handover report and its JSON packet |
| `isCheckInDue`, `checkCombinedAlerts` in `src/lib/checkInDue.ts` | Maazin | the check-in due banner and the sleep-with-mood note |
| `getStep(id)`, `nextStepId(step, answer)` in `src/lib/emergency.ts` | Arnav | emergency steps |
| `src/data/cards.json` | Ihsan | card text |
| `src/data/environments.json` | Maazin | label and simulated signal delay per environment |
| `results/summary.json`, `results/sensitivity.json` | Maazin | the alert test results (`plan/EVALUATION.md`) |
| `src/lib/indicatorMeta.ts` | Arnav | display names, units, context buttons, status words and symbols |

Only `src/lib/storage.ts` touches `localStorage`. The check-in due banner is worked out on the dashboard from the last check-in's mission day.
