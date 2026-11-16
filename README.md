# ARGUS

Health monitoring software for astronauts on space missions. Built by team SpaceRangers for the NASA Space Apps Challenge 2026.

**Live site:** https://argus-delta-gules.vercel.app

On a long mission, astronauts have to spot health changes in themselves, and they are not doctors. On the way to Mars a message to Earth can take many minutes each way, so the crew cannot wait for a doctor. ARGUS lets an astronaut enter six health readings, explains what each one means, says what to do about it, and guides the crew through one emergency.

The name comes from Argus Panoptes, the hundred-eyed watchman of Greek myth.

> ARGUS is a hackathon project. It is not a medical device and has not been clinically validated. All data in the demo is simulated.

## What it does

- **Check-in and device import** for six indicators: heart rate, blood pressure, blood glucose, body temperature, sleep duration and mood, one step at a time, with how-to-measure help beside each input, plus browser JSON / CSV device import (`src/lib/deviceImport.ts`) and reading provenance.
- **A status for every reading:** within range, needs review, critical or unknown, always as a word, a symbol and a colour, with the reasons in plain language. A reading that could not be checked is shown as unknown, never as green.
- **Ranges adjusted for the environment.** Body temperature (Stahn et al. 2017) and blood pressure (Norsk et al. 2015) shift with the environment and mission day. The critical limit never moves.
- **A personal baseline** that flags three readings in a row outside the astronaut's own usual band, while ignoring single-day outliers so a slow fever cannot drag the baseline up.
- **Feel vs. data and combined checks** that point out when the readings and the astronaut's own rating disagree, or when multiple indicators (such as sleep and mood) need review together.
- **Indicator pages** with a trend chart, the reference range and baseline as bands, and a card covering how to measure, why it matters, what spaceflight does, what you can do and when to escalate.
- **An escalation card and handover report (`/handover`):** who to notify, what to do meanwhile, the simulated signal delay to Earth, and a printable / JSON-exportable 7-day handover report for the Crew Medical Officer and the ground.
- **A shared crew console.** Each crewmember taps their name and sees their own readings. Crewmates see only a status word and the last reading day, so a critical status or a missed check-in is visible without exposing anyone's data. No password: a browser cannot keep one.
- **Emergency mode** for a crewmate who collapses after chest pain: patient and responder role selection, rescue vitals with logged one-tap full-record access ("break-the-glass"), yes/no questions one step per screen, a timestamped step log, microgravity CPR guidance sourced to Hinkelbein et al. 2020, and a ground emergency message builder.
- **A documented alert test** that compares three alert methods across five scenarios (slow-onset fever, single odd reading, sudden spike, creeping sleep debt, falling mood) and 100 seeds each, plus a pre-registered 2,000-run sensitivity grid. Protocol, timeline and limits: [plan/EVALUATION.md](plan/EVALUATION.md).

## Does the alerting work?

We ran five simulated scenarios through the same `getStatus` function the dashboard uses, comparing three methods on both a frozen seed and 100 deterministic random seeds. The protocol, what was pre-registered and when, and the limits are in [plan/EVALUATION.md](plan/EVALUATION.md). Full results: [results/summary.md](results/summary.md), [results/fever.md](results/fever.md) and [results/sensitivity.md](results/sensitivity.md).

On the slow-onset fever scenario (30 ordinary days in Mars transit, then a temperature rising 0.15 °C a day for 10 days):

| Method | First amber (days after onset) | First red (days after onset) | Fever readings left green | False alerts before onset | 100-seed first amber (mean / worst) | 100-seed false alerts (mean / worst) |
|---|---|---|---|---|---|---|
| Earth range only | 0 | 7 | 0 | 30 | 0 / 0 | 30 / 30 |
| Adjusted range | 5 | 7 | 5 | 0 | 5.3 / 6 | 0 / 0 |
| Adjusted range and baseline | 3 | 7 | 3 | 0 | 3.84 / 5 | 0 / 0 |

Earth ranges flag every ordinary day in flight (this follows from the in-flight base of 37.4 °C we assume from Stahn et al. 2017, above the Earth limit of 37.2 °C). The adjusted range removes those false alerts, and adding the personal baseline catches the fever earlier while a single odd reading (`scripts/scenarios/typo.json`) causes zero false alerts across all 100 seeds. Red arrives on the same day for all three methods, because nothing moves the critical limit.

**Sensitivity.** We then varied the noise (0.05 to 0.3 °C) and the fever speed (0.05 to 0.3 °C a day), 100 seeds per setting, with seven predictions committed before the code existed. Five were met: across all 20 settings the adjusted range gave no false alerts, the baseline was never slower, and the red day never moved. Two were not: a fever rising only 0.05 °C a day is caught by the baseline in just 33 of 100 seeds at normal noise, and the baseline's lead on fast fevers grew slightly with noise instead of shrinking. Slow fevers are the weak spot.

Only the fever scenario and the sensitivity grid were pre-registered; the other four scenarios' expectations were committed with their results. This is a software test on simulated scenarios with parameters the team chose. It is not clinical validation.

## Getting started

You need Node.js 20 or newer.

```
git clone https://github.com/Maazin2007/ARGUS.git
cd ARGUS
npm install
npm run dev
```

Open http://localhost:3000 and tap a crewmember on "Who is using this console?" (MS1 is the one used in the demo). The demo profile loads by itself for all five crewmembers; "Load demo profile" on the dashboard resets it.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app locally |
| `npm test` | Runs the 153 tests in `tests/`: status rules, baseline, input checks, storage, device import, handover, crew board, emergency tree and message, data sources, and that `results/` matches the engine |
| `npm run lint` | Checks code style and common mistakes |
| `npm run build` | Builds the app the way Vercel does |
| `npm run generate` | Regenerates the simulated demo data in `src/data/seed.json` |
| `npm run evaluate` | Regenerates the alert results in `results/` (fever, five-scenario summary, sensitivity grid) |

Run `npm run lint && npm test && npm run build` before you push.

## How it is built

React and TypeScript on Next.js, styled with CSS and Tailwind, hosted on Vercel. The body figure uses three.js. There is no server and no database: everything runs in the browser, and readings are kept in the browser's local storage, so no health data leaves the device.

| Screen | Route |
|---|---|
| Dashboard | `/` |
| Check-in & Device import | `/check-in` |
| Indicator | `/indicator/[id]` |
| Handover report | `/handover` |
| Emergency | `/emergency` |
| Alert test | `/alerts` |

Every pull request runs lint, tests and build on GitHub Actions and gets a Vercel preview link; merging to `main` updates the live site. How to release, check, and roll back a deploy: [plan/DEPLOYMENT.md](plan/DEPLOYMENT.md).

```
src/app/          routes for the six screens
src/components/   screens, body figure, charts, status badge, escalation card
src/lib/          logic: types, storage, input checks, baseline, status rules, feel vs. data
src/data/         thresholds, card text, emergency steps, environments, demo data (all with sources)
scripts/          simulated data generator, alert scenarios, alert evaluation
results/          generated alert results (never edited by hand)
tests/            tests for the logic and the data
plan/             build plan and team documents
```

## Team documents

| Document | Read it for |
|---|---|
| [plan/BUILD.md](plan/BUILD.md) | What is built, what is left, decisions made |
| [plan/FLOW.md](plan/FLOW.md) | How the app works end to end |
| [plan/SCREEN_TESTS.md](plan/SCREEN_TESTS.md) | The click-through checklist for every screen |
| [plan/EVALUATION.md](plan/EVALUATION.md) | How the alert test works, what was pre-registered, results and limits |
| [plan/BACKEND.md](plan/BACKEND.md) | The step-by-step plan for the logic and data |
| [plan/CODING_STANDARDS.md](plan/CODING_STANDARDS.md) | Rules for code, tests and git |
| [plan/DESIGN_IDEAS.md](plan/DESIGN_IDEAS.md) | Design guidance for the screens |
| [plan/SOURCES.md](plan/SOURCES.md) | Where every medical number comes from |
| [plan/AI_USE.md](plan/AI_USE.md) | AI disclosure log |
| [plan/PITCH.md](plan/PITCH.md) | Pitch script, video, slides and project page text |
| [plan/DEPLOYMENT.md](plan/DEPLOYMENT.md) | The pipeline, Vercel, releasing, checking and rolling back a deploy |

New to the project? Read `FLOW.md`, then `CODING_STANDARDS.md`, then `BUILD.md`. Checking our evidence? Read `EVALUATION.md`, then `SOURCES.md`.

## Team

Team SpaceRangers.

| Name | Area |
|---|---|
| Maazin (team lead) | Status engine, alert evaluation |
| Angad | Storage, input checks, thresholds |
| James | Feel vs. data, seeded generator, demo data |
| Ihsan | Indicator cards |
| Arnav | Screens and components |
| Shail | Project page, video, slides, AI disclosure |

AI tool use is disclosed in [plan/AI_USE.md](plan/AI_USE.md).

## Privacy and safety

- **Health data never leaves the browser.** Readings live in `localStorage` on the device; the app only downloads its own files (pages, scripts, the 3D model) and never sends readings anywhere. There is no server or database.
- **No passwords.** Code in a browser cannot keep a secret, so ARGUS does not pretend to. On the shared console, crewmates see only a status word and the last reading day, never values.
- **Emergency access is logged, not blocked.** A responder sees the rescue vitals first; opening the full record takes one tap and records who opened it and when, in the message for the ground.
- **Not a medical device.** It explains and recommends, never diagnoses, and gives no medication or dosing advice. All demo data is simulated and labelled.

## Ground rules

- Every medical number or instruction has a source, or is labelled as a demo parameter.
- Simulated data is always labelled on screen.
- The app explains and recommends. It does not diagnose and gives no medication or dosing advice.
- Emergency steps are labelled "Published" with a source, or "Demo copy".

## Licence

Apache 2.0. See [LICENSE](LICENSE).
