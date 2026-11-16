# ARGUS: Autonomous Crew Medical Console

**ARGUS** is a browser-based health-monitoring prototype built by Team SpaceRangers for the NASA Space Apps Challenge 2026.

**Live demo:** [argus-delta-gules.vercel.app](https://argus-delta-gules.vercel.app/)

> ARGUS is a hackathon prototype. It is not a medical device, does not diagnose illness, gives no medication or dosing advice, and has not been clinically validated. Demonstration data is simulated.

## The problem

On a deep-space mission, communication with Earth can take minutes in each direction. A crew cannot rely on an immediate reply from a flight surgeon when a reading changes or a medical incident begins. At the same time, long-duration spaceflight can change physiological measurements from their Earth expectations.

ARGUS addresses the software workflow around that gap: it collects or imports readings, explains an inspectable status, provides source-labelled guidance, records emergency steps, and prepares a structured handover for a Crew Medical Officer or Ground Control.

NASA analysis shows that one-way communication delay for a crewed Mars mission can vary from 0 to about 22 minutes, depending on trajectory. [NASA Technical Report 20220013418](https://ntrs.nasa.gov/citations/20220013418)

## What ARGUS does

### Shared crew console

The app models one console used by five fictional crew roles: Commander, Pilot, two Mission Specialists, and Crew Medical Officer.

- A person chooses their crew profile before using the console.
- Each profile has separate browser-local readings and check-ins.
- The crew overview exposes a status word and last-reading day, rather than routine numerical readings.
- Emergency mode can reveal a patient's rescue vitals and logs a request to open their full record.

This is an interface-level privacy design for the demo. It is not authentication, encryption, or a complete medical-record access-control system.

### Six indicators

ARGUS supports:

| Indicator | Typical context in the prototype |
|---|---|
| Heart rate | Resting |
| Body temperature | Resting |
| Blood pressure | Resting, with systolic and diastolic values checked separately |
| Blood glucose | Fasting or after a meal |
| Sleep duration | Overnight |
| Mood | 1–5 self-rating |

Each check-in also collects an overall self-rating. It is separate from the mood indicator and can prompt a “feel versus data” review when it conflicts with the available measurements.

### Check-in and device import

The check-in guides the user through the six indicators and self-rating. Readings can also be imported from supported CSV or JSON files.

The import format uses structured records containing fields such as timestamp, indicator, context, value, and—when relevant—systolic and diastolic pressure. Imported readings pass the same value checks as typed readings. The importer also checks timestamps, supported contexts, duplicate identifiers, and a 500-row demo cap.

File import is not a live medical-device connection. A production integration would need hardware protocols, calibration, timestamp handling, and connection-failure testing.

### Statuses and explanations

Every indicator is shown with a word, symbol, colour, and plain-language explanation.

| Status | Meaning in ARGUS |
|---|---|
| **Within range** | No configured check fired for the assessed reading. This does not establish that the person is healthy. |
| **Needs review** | A configured reference-range or sustained personal-baseline check fired. This does not diagnose a condition. |
| **Critical** | A configured fixed critical limit fired. |
| **Unknown** | The available data or configured rules do not support a current assessment, for example because a reading is missing, stale, or uses an unsupported context. |

The engine evaluates status rules in a fixed order:

1. Check whether the reading has a supported rule and is current enough to assess.
2. Check configured fixed critical limits.
3. Check whether a reference range exists.
4. Check the environment-adjusted reference range.
5. Check for three consecutive departures from an enabled personal baseline.
6. Return Within range if no configured check fired.

For blood pressure, systolic and diastolic values are evaluated independently and the more severe result is returned.

## How the rules work

### Environment-aware ranges

The prototype can adjust configured temperature and blood-pressure reference boundaries according to selected environment and mission day. The adjustment is a transparent, linear demo model:

`adjusted boundary = Earth boundary + shift × min(mission day / ramp days, 1)`

Only the boundary in the direction of the shift moves. Configured critical limits remain fixed.

The research motivating these adjustments is linked in the source register. The implementation deliberately labels the linear ramp, its Mars-transit use, and several thresholds as demo parameters where they are not directly established by a publication. An ISS core-temperature or blood-pressure study does not by itself validate a universal Mars reference interval or every temperature measurement method.

### Personal baseline

For indicators with baseline support, ARGUS derives a personal band from earlier readings using the median and median absolute deviation (MAD). This makes the calculation less sensitive to isolated extreme values than a simple average.

The current demo configuration requires at least five accepted prior readings, considers up to ten recent readings in a fourteen-day window, and alerts after three consecutive readings outside the band. These are engineering demo parameters. They require clinical review before any operational use.

## Guidance, handover, and emergency mode

### Indicator guidance

Each indicator page includes a trend chart and guidance covering:

1. How to measure it
2. Why it matters
3. What spaceflight may change
4. What the user can do
5. When to escalate

Medical content is kept in source-labelled data files. Every number or instruction is expected to cite a source or carry a `demo parameter` / `Demo copy` label.

### Handover

The handover page builds a seven-mission-day report containing available readings, non-green statuses, reasons, and recent self-ratings. It can prepare printable or JSON output.

ARGUS prepares a handover packet for copying or export. It does not implement spacecraft communications, a ground receiver, delivery acknowledgement, or a claim that a report was sent.

### Emergency mode

Emergency mode uses a small source-labelled question-and-instruction tree for a collapsed crewmember after chest pain. It records answers and timing as an action log. The tree includes both `Published` content and clearly identified `Demo copy`.

Recording **DONE** means the displayed action was recorded as completed. It does not mean the medical emergency has resolved. An **UNABLE** response records that an action was not completed and should remain available for handover.

This is not a complete medical protocol. Emergency-session recovery after browser refresh and robust failure isolation remain development work.

## Data and privacy

ARGUS uses structured, browser-local records. A reading contains its indicator, measured value or blood-pressure pair, unit, timestamp, context, mission day, environment, simulation flag, and provenance.

- **Application data:** browser local storage, separated by demo crew identifier.
- **Demo data:** deterministic synthetic data generated from fixed seeds.
- **Configuration:** JSON files for indicator rules, environment values, card guidance, crew settings, and emergency steps.
- **Research context:** published studies and public sources documented in the source register.

ARGUS does not send health readings to an application database or API server. Browser local storage still has meaningful limitations: it can be cleared, corrupted, unavailable, or accessed by someone using the device/browser profile. It should not be described as encrypted or as a complete privacy solution.

## Evidence and evaluation

ARGUS runs its alert evaluation through the same `getStatus` function used by the dashboard. The evaluation compares:

| Method | Environment | Earlier reading history |
|---|---|---|
| Earth range only | Earth | None |
| Adjusted range | Scenario environment | None |
| Adjusted range and baseline | Scenario environment | Earlier scenario readings |

Five simulated scenarios run across 100 deterministic seeds each: slow-onset fever, one odd reading, sudden spike, creeping sleep debt, and falling mood.

### Slow-onset fever demonstration

The frozen fever simulation assumes thirty ordinary Mars-transit days followed by a gradual temperature rise. It produces these results:

| Method | False amber alerts before onset | First amber after onset | First critical after onset |
|---|---:|---:|---:|
| Earth range only | 30 | Day 0 | Day 7 |
| Adjusted range | 0 | Day 5 | Day 7 |
| Adjusted range plus baseline | 0 | Day 3 | Day 7 |

Across 100 fever seeds, mean first amber was 5.3 days for the adjusted range and 3.84 days for adjusted range plus baseline. The Earth-only method was already amber during the assumed ordinary period, so its earlier alert does not distinguish fever onset.

These are **software-test results on team-designed synthetic scenarios**. They do not establish clinical sensitivity, clinical specificity, clinical performance, or patient outcomes. In particular, the adjusted methods leave early simulated fever readings green, and a slower fever is a documented weak case.

The fever scenario and its expectations were committed before its evaluator. A later sensitivity grid was also pre-registered. The other four scenario expectations were committed with their results; they are reported transparently but are not pre-registered evidence.

Read the full [evaluation protocol and limits](https://github.com/Maazin2007/ARGUS/blob/main/plan/EVALUATION.md), [all scenario results](https://github.com/Maazin2007/ARGUS/blob/main/results/summary.md), [fever trace](https://github.com/Maazin2007/ARGUS/blob/main/results/fever.md), and [sensitivity results](https://github.com/Maazin2007/ARGUS/blob/main/results/sensitivity.md).

## Architecture

| Layer | Main responsibility |
|---|---|
| Next.js and React interface | Routes, screens, shared console, presentation of statuses and guidance |
| TypeScript logic | Input validation, status calculation, baseline calculation, device parsing, handover and emergency routing |
| JSON data | Rules, sources, cards, environments, crew demo settings, emergency content and seeded readings |
| Browser local storage | Per-crew reading and check-in persistence |
| Scripts and tests | Deterministic data generation, scenario evaluation, regression tests and source/data checks |
| Vercel | Hosts the web application |

The project has no deployed application backend or database. References to the project’s “backend” mean the TypeScript logic, data, scripts, and tests that run behind the interface.

## Repository map

| Location | Purpose |
|---|---|
| `src/app/` | Application routes |
| `src/components/` | Screens, charts, body map, status badges and controls |
| `src/lib/` | Validation, status rules, baseline, storage, imports, handover and emergency logic |
| `src/data/` | Source-labelled rules, guidance, crew, environments and simulated demo data |
| `scripts/` | Synthetic-data generation and alert evaluation |
| `tests/` | Logic, data, scenario and emergency tests |
| `results/` | Generated simulated-evaluation results |
| `plan/` | Sources, evaluation protocol, development flow, coding standards and AI-use log |
| `presentations/` | Pitch materials and presentation notes |

## Run locally

ARGUS uses Node.js and npm.

```bash
git clone https://github.com/Maazin2007/ARGUS.git
cd ARGUS
npm install
npm run dev
```

Open `http://localhost:3000`.

| Command | Purpose |
|---|---|
| `npm run dev` | Run the development server |
| `npm test` | Run the test suite |
| `npm run lint` | Check style and common errors |
| `npm run build` | Build the production application |
| `npm run generate` | Regenerate seeded demonstration data |
| `npm run evaluate` | Regenerate simulated-evaluation results |

Before changing rules or data, run `npm run lint`, `npm test`, and `npm run build`. Generated results must be regenerated through the scripts, not edited by hand.

## Sources and responsible use

ARGUS maintains a [source register](https://github.com/Maazin2007/ARGUS/blob/main/plan/SOURCES.md) for the numbers and instructions shown by the app. It includes published research such as Stahn et al. (2017) on increased core body temperature during long-duration spaceflight and Norsk et al. (2015) on ambulatory blood-pressure changes during long-duration spaceflight.

Sources provide traceability and background. They do not constitute clinical validation of ARGUS. The project’s constraints, code rules, and AI disclosure are documented in the [coding standards](https://github.com/Maazin2007/ARGUS/blob/main/plan/CODING_STANDARDS.md) and [AI-use log](https://github.com/Maazin2007/ARGUS/blob/main/plan/AI_USE.md).

## Current limitations and next steps

Before real-world use, ARGUS would require at least:

- Clinician and flight-medicine review of thresholds, contexts and emergency guidance
- Validation with appropriate research data and pre-defined evaluation criteria
- User testing under representative crew workflows and time pressure
- Stronger runtime validation and recovery for malformed or corrupt local data
- Tested offline-installation behaviour and a recovery plan for storage/device failure
- Durable emergency-session recovery
- Hardware integration, calibration and error handling for live devices
- Real access controls, audit requirements, secure storage and a communications interface

These are prerequisites for further development, rather than claims that the current prototype already fulfils.

## Team

Team SpaceRangers: Shail, Ihsan, Arnav, Angad, Maazin, and James.

See the repository’s [README](https://github.com/Maazin2007/ARGUS/blob/main/README.md) for the project overview and the [pitch materials](https://github.com/Maazin2007/ARGUS/tree/main/presentations) for the final presentation evidence.
