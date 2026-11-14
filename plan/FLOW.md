# How ARGUS works, end to end

ARGUS is a browser app. An astronaut enters readings, the app explains each one, and it guides the crew through one emergency. There is no server: the code is hosted on Vercel and all data stays in the astronaut's browser.

## The four screens

| Screen | Route | What the astronaut does |
|---|---|---|
| Dashboard | `/` | Sees six statuses on the body figure and in a list. Sees the check-in due banner. Can open emergency mode from anywhere. |
| Check-in | `/check-in` | Enters the six readings and one "how do you feel" rating, then sees the results. |
| Indicator | `/indicator/[id]` | Reads the five-section card and the trend chart for one indicator. |
| Emergency | `/emergency` | Answers yes/no questions, one step per screen. |

## Flow 1: a check-in

```
Astronaut types "72" for heart rate
        │
        ▼
validateEntry()            src/lib/validate.ts     catches typing errors
        │ ok
        ▼
saveReading()              src/lib/storage.ts      writes to localStorage
        │
        ▼
getStatus()                src/lib/status.ts       decides green / amber / red / unknown
        │   uses rules from src/data/indicators.json
        │   uses history from getReadings()
        ▼
checkFeelVsData()          src/lib/feelVsData.ts   compares the rating with the statuses
        │
        ▼
Results screen: six StatusBadges, the reasons, the feel vs. data message
        │ any red
        ▼
EscalationCard: who to notify, what to do meanwhile, simulated signal delay
```

## Flow 2: how a status is decided

`getStatus` stops at the first rule that fires.

1. **Unknown** if the reading is stale, or no rule covers this measure and context.
2. **Red** if the value crosses the fixed critical limit. Nothing can move this limit.
3. **Amber** if the value is outside the reference range. In space, the range is first shifted for the environment and mission day.
4. **Amber** if this reading and the two before it sit away from the personal baseline.
5. **Green** otherwise.

Each rule that fires adds one sentence to the reasons shown on screen.

## Flow 3: looking at one indicator

1. The astronaut clicks a region of the body figure, or a row in the list.
2. The indicator screen loads that indicator's readings with `getReadings(id)`.
3. `TrendChart` draws the readings over time, with the reference range and the baseline as shaded bands.
4. `IndicatorCard` shows the five sections from `src/data/cards.json`: how to measure, why it matters, what spaceflight does, what you can do, when to escalate.

## Flow 4: emergency mode

1. The astronaut presses the emergency button.
2. The screen shows the first step from `src/data/emergency.json`.
3. Each answer calls `nextStepId(step, answer)` and shows the next step.
4. Steps with `timerSeconds` show a timer. Each step shows "Published" with its source, or "Demo copy".
5. The tree ends when a step has no next step.

Emergency mode reads no stored data, so it works even if everything else is broken.

## Flow 5: the evidence

```
npm run generate   →  scripts/generate.ts  →  src/data/seed.json     (fixed seed, same output every run)
npm run evaluate   →  scripts/evaluate.ts  →  results/fever.md       (three methods compared)
```

`evaluate.ts` calls the same `getStatus` the app uses, so the table tests the real rules.

## Flow 6: from your laptop to the public URL

1. You push a branch and open a pull request. Vercel builds a preview link for it.
2. A teammate checks the preview and merges.
3. Vercel rebuilds `main` and updates the public URL, usually within two minutes.

One-time setup: sign in to vercel.com with GitHub, choose "Add New Project", pick this repository, press Deploy. There are no settings or secrets to fill in.

## What the screens may call

The frontend uses only these. If a screen needs something else, ask the owner to add it here.

| Function or file | Owner | Returns |
|---|---|---|
| `validateEntry(measure, text)` | Angad | the number, or a message to show |
| `saveReading`, `getReadings`, `saveCheckIn`, `getCheckIns`, `clearAll` | Angad | stored readings and check-ins |
| `getStatus(reading, history, environment, missionDay, now)` | Maazin | status, reasons, ranges |
| `checkFeelVsData(selfRating, statuses)` | James | a message or `null` |
| `getStep(id)`, `nextStepId(step, answer)` | James | emergency steps |
| `isCheckInDue(lastTimestamp, now)` | James | true or false |
| `src/data/cards.json` | Angad | card text |
| `src/data/seed.json` | James | demo readings, all marked simulated |

`getStatus` already exists as a stub that returns "unknown", so screens can be built today.
