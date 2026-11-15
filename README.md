# ARGUS

Health monitoring software for astronauts on space missions. Built by team SpaceRangers for the NASA Space Apps Challenge 2026.

**Live site:** https://argus-delta-gules.vercel.app

On a long mission, astronauts have to spot health changes in themselves, and they are not doctors. On the way to Mars a message to Earth can take many minutes each way, so the crew cannot wait for a doctor. ARGUS lets an astronaut enter six health readings, explains what each one means, says what to do about it, and guides the crew through one emergency.

> ARGUS is a hackathon project. It is not a medical device and has not been clinically validated. All data in the demo is simulated.

## What it does

- **Check-in** for six indicators: heart rate, blood pressure, blood glucose, body temperature, sleep duration and mood, one step at a time, with how-to-measure help beside each input.
- **A status for every reading:** within range, needs review, critical or unknown, always as a word, a symbol and a colour, with the reasons in plain language. A reading that could not be checked is shown as unknown, never as green.
- **Ranges adjusted for the environment.** The body temperature range shifts with the environment and mission day, based on a published spaceflight study. The critical limit never moves.
- **A personal baseline** that flags three readings in a row outside the astronaut's own usual band.
- **A feel vs. data check** that points out when the readings and the astronaut's own rating disagree.
- **Indicator pages** with a trend chart, the reference range and baseline as bands, and a card covering how to measure, why it matters, what spaceflight does, what you can do and when to escalate.
- **An escalation card** on a critical reading: who to notify, what to do meanwhile, and the simulated signal delay to Earth.
- **Emergency mode** for one scenario, a crewmate who collapses after chest pain: yes/no questions, one step per screen, with a step log.
- **An alert test** that compares three alert methods on a simulated fever.

## Does the alerting work?

We ran one simulated fever through the same status function the dashboard uses, three ways. The scenario is 30 ordinary days in Mars transit, then a temperature rising 0.15 °C a day for 10 days.

| Method | First amber (days after onset) | First red (days after onset) | Fever readings left green | False alerts before onset |
|---|---|---|---|---|
| Earth range only | 0 | 7 | 0 | 30 |
| Adjusted range | 5 | 7 | 5 | 0 |
| Adjusted range and baseline | 3 | 7 | 3 | 0 |

Earth ranges flag every ordinary day in flight. The adjusted range removes those false alerts but notices the fever later. Adding the personal baseline gets two of those days back. Red arrives on the same day for all three, because nothing moves the critical limit.

This is a software test on one simulated scenario with parameters the team chose. It is not clinical validation. The scenario and its expected outcomes were committed before the evaluation was first run. Full results: [results/fever.md](results/fever.md).

## Getting started

You need Node.js 20 or newer.

```
git clone https://github.com/Maazin2007/ARGUS.git
cd ARGUS
npm install
npm run dev
```

Open http://localhost:3000. The demo profile loads by itself; "Load demo profile" on the dashboard resets it.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app locally |
| `npm test` | Runs the tests in `tests/` |
| `npm run lint` | Checks code style and common mistakes |
| `npm run build` | Builds the app the way Vercel does |
| `npm run generate` | Regenerates the simulated demo data in `src/data/seed.json` |
| `npm run evaluate` | Regenerates the alert results in `results/` |

Run `npm run lint && npm test && npm run build` before you push.

## How it is built

React and TypeScript on Next.js, styled with CSS and Tailwind, hosted on Vercel. The body figure uses three.js. There is no server and no database: everything runs in the browser, and readings are kept in the browser's local storage, so no health data leaves the device.

| Screen | Route |
|---|---|
| Dashboard | `/` |
| Check-in | `/check-in` |
| Indicator | `/indicator/[id]` |
| Emergency | `/emergency` |
| Alert test | `/alerts` |

```
src/app/          routes for the five screens
src/components/   screens, body figure, charts, status badge, escalation card
src/lib/          logic: types, storage, input checks, baseline, status rules, feel vs. data
src/data/         thresholds, card text, emergency steps, environments, demo data (all with sources)
scripts/          simulated data generator, fever scenario, alert evaluation
results/          generated alert results
tests/            tests for the logic and the data
plan/             build plan and team documents
```

## Team documents

| Document | Read it for |
|---|---|
| [plan/BUILD.md](plan/BUILD.md) | What is built, what is left, decisions made |
| [plan/FLOW.md](plan/FLOW.md) | How the app works end to end |
| [plan/BACKEND.md](plan/BACKEND.md) | The step-by-step plan for the logic and data |
| [plan/CODING_STANDARDS.md](plan/CODING_STANDARDS.md) | Rules for code, tests and git |
| [plan/DESIGN_IDEAS.md](plan/DESIGN_IDEAS.md) | Design guidance for the screens |
| [plan/SOURCES.md](plan/SOURCES.md) | Where every medical number comes from |
| [plan/AI_USE.md](plan/AI_USE.md) | AI disclosure log |
| [plan/PITCH.md](plan/PITCH.md) | Pitch script, video, slides and project page text |

New to the project? Read `FLOW.md`, then `CODING_STANDARDS.md`, then `BUILD.md`.

## Ground rules

- Every medical number or instruction has a source, or is labelled as a demo parameter.
- Simulated data is always labelled on screen.
- The app explains and recommends. It does not diagnose and gives no medication or dosing advice.
- Emergency steps are labelled "Published" with a source, or "Demo copy".

## Licence

Apache 2.0. See [LICENSE](LICENSE).
