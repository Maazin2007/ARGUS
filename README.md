# ARGUS

Health monitoring software for astronauts on space missions. Built by team SpaceRangers for the NASA Space Apps Challenge 2026.

On a long mission, astronauts have to spot health changes in themselves, and they are not doctors. ARGUS lets an astronaut enter six health readings, explains what each one means, says what to do about it, and guides the crew through one emergency.

> ARGUS is a hackathon project. It is not a medical device and has not been clinically validated.

## What it does

- **Check-in** for six indicators: heart rate, blood pressure, blood glucose, body temperature, sleep duration and mood.
- **A status for every reading:** green, amber, red or unknown, with the reasons in plain language. Missing or unsupported data is shown as unknown, never as green.
- **Ranges adjusted for the environment.** Reference ranges shift with the environment and mission day, based on published spaceflight studies.
- **A personal baseline** that flags a sustained change from the astronaut's own usual values.
- **A feel vs. data check** that points out when the readings and the astronaut's own rating disagree.
- **Indicator cards** covering how to measure, why it matters, what spaceflight does, what you can do and when to escalate.
- **Emergency mode** for one scenario: a crewmate collapses after chest pain.
- **An alert results table** that compares three alert methods on simulated data.

This list is the plan. `plan/BUILD.md` shows what is finished.

## Getting started

You need Node.js 20 or newer.

```
git clone https://github.com/Maazin2007/ARGUS.git
cd ARGUS
npm install
npm run dev
```

Open http://localhost:3000.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app locally |
| `npm test` | Runs the tests in `tests/` |
| `npm run lint` | Checks code style and common mistakes |
| `npm run build` | Builds the app the way Vercel does |
| `npm run generate` | Regenerates the simulated demo data |
| `npm run evaluate` | Regenerates the alert results table |

Run `npm run lint && npm test && npm run build` before you push.

## How it is built

React and TypeScript on Next.js, styled with Tailwind, hosted on Vercel. There is no server and no database: everything runs in the browser and readings are kept in the browser's local storage.

```
src/app/          screens: dashboard, check-in, indicator, emergency
src/components/   BodyFigure, IndicatorCard, TrendChart, StatusBadge, EscalationCard
src/lib/          logic: types, storage, validation, baseline, status rules
src/data/         medical ranges, card text, emergency steps, demo data (all with sources)
scripts/          simulated data generator and alert evaluation
results/          generated results table
tests/            tests for the logic in src/lib/
plan/             build plan and team documents
```

## Team documents

| Document | Read it for |
|---|---|
| [plan/BUILD.md](plan/BUILD.md) | Milestones, owners, what to cut |
| [plan/FLOW.md](plan/FLOW.md) | How the app works end to end |
| [plan/BACKEND.md](plan/BACKEND.md) | Step-by-step work for the logic and data |
| [plan/CODING_STANDARDS.md](plan/CODING_STANDARDS.md) | Rules for code, tests and git |
| [plan/DESIGN_IDEAS.md](plan/DESIGN_IDEAS.md) | Design guidance for the screens |
| [plan/SOURCES.md](plan/SOURCES.md) | Where every medical number comes from |
| [plan/AI_USE.md](plan/AI_USE.md) | AI disclosure log |

New to the project? Read `FLOW.md`, then `CODING_STANDARDS.md`, then your part of `BUILD.md`.

## Ground rules

- Every medical number or instruction has a source, or is labelled as a demo parameter.
- Simulated data is always labelled on screen.
- The app explains and recommends. It does not diagnose and gives no medication or dosing advice.

## Licence

Apache 2.0. See [LICENSE](LICENSE).
