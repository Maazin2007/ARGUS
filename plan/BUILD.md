# Build status

Where the build stands against `SpaceRangers_Final_Build_Plan.docx`. Last updated 15 November 2026, before the feature freeze.

Live site: https://argus-delta-gules.vercel.app

| File | Read it for |
|---|---|
| `FLOW.md` | How the whole app works, and what the screens call |
| `BACKEND.md` | The step-by-step backend plan, with a note on what was built |
| `CODING_STANDARDS.md` | Rules everyone follows |
| `DESIGN_IDEAS.md` | Design guidance, with a note on what was adopted |
| `SOURCES.md` | Where every medical number comes from; add a row when you open a source |
| `AI_USE.md` | AI disclosure log; add a row when you use an AI tool |
| `PITCH.md` | Pitch script, 30-second video, slides, project page text and judge questions |
| `project_context.txt` | The challenge text |

## Owners

| Area | Owner |
|---|---|
| Status engine, alert evaluation | Maazin |
| Storage, input checks, thresholds | Angad |
| Feel vs. data, seeded generator, demo seed data | James |
| Cards (`src/data/cards.json`) | Ihsan |
| Screens and components | Arnav |
| Project page, video, slides, AI disclosure | Shail |

## Built

- [x] Status engine: unknown, red, amber and green rules with plain-language reasons (`src/lib/status.ts`)
- [x] Environment adjustment by mission day, for body temperature (Stahn et al. 2017) and blood pressure (Norsk et al. 2015)
- [x] Personal baseline that leaves unusual readings out (`src/lib/baseline.ts`)
- [x] Blood pressure as two measures, worse status wins
- [x] Thresholds for all six indicators, each with an opened source or a demo label (`src/data/indicators.json`)
- [x] Storage in the browser with safe write error handling, plus input checks (`src/lib/storage.ts`, `src/lib/validate.ts`)
- [x] Cards for all six indicators, five sections each (`src/data/cards.json`)
- [x] Seeded generator and a demo profile for all six indicators, all green in Mars transit (`scripts/generate.ts`, `src/data/seed.json`)
- [x] Demo profile loads automatically and from a button (`src/lib/demoProfile.ts`)
- [x] Feel vs. data check and combined multi-indicator alert notes on check-in results (`src/lib/feelVsData.ts`, `src/lib/checkInDue.ts`)
- [x] Browser JSON / CSV device import with provenance tracking (`src/lib/deviceImport.ts`, `src/components/checkin/DeviceImport.tsx`)
- [x] Dashboard with the body figure, the list, sparklines and the check-in due banner
- [x] Check-in, one indicator per step, with advancing timestamps and results
- [x] Indicator screen with the trend chart, reference range and baseline bands, and the card
- [x] Escalation card on a red status, with the simulated signal delay from `src/data/environments.json`
- [x] Handover report (`/handover`) for the Crew Medical Officer and the ground: last 7 mission days, active alerts, self-ratings, print view and JSON packet export (`src/lib/handover.ts`, `src/components/screens/HandoverScreen.tsx`)
- [x] Emergency mode: patient and responder selection, limited rescue vitals with logged one-tap full-record access ("break-the-glass"), step log, time on the compressions step, and ground message builder (`src/data/emergency.json`, `src/lib/emergency.ts`, `src/lib/crew.ts`, `src/lib/emergencyMessage.ts`)
- [x] Alert evaluation across five scenarios (slow-onset fever, single odd reading, sudden spike, creeping sleep debt, falling mood) and 100 Monte Carlo seeds (`npm run evaluate`, `results/summary.md`) on the alert test screen
- [x] Light and dark console themes (`ThemeButton.tsx`) and all six indicators mapped to sites on the 3D body figure (`BodyMap.tsx`)
- [x] CI runs lint, tests and build on every push; Vercel deploys `main`

All 140 tests pass.

## Left before the freeze (Sunday, 2:30 PM)

- [ ] Name the submission owner
- [ ] Ask the organizers about video length and slide limit; re-check this year's judging criteria
- [ ] Two people who did not write the screens walk `plan/SCREEN_TESTS.md` on the live site and sign the table
- [x] A team member opens Hinkelbein et al. 2020 and fills "Opened by" in `SOURCES.md`; the compressions step is labelled "Published"
- [x] Final check of `SOURCES.md` (every row used has "Opened by") and `AI_USE.md` (every tool is listed)
- [ ] Project page text, slides, pitch script
- [ ] Tag the build, record the commit, send the first complete submission

After the freeze: record the demo video from the live site, rehearse the pitch twice, fix only material issues.

## Notes on scope

- The emergency tree lives in `src/data/emergency.json` and `src/lib/emergency.ts`. `tests/emergency.test.ts` checks every link, that every step is reachable with no loops, and every label and source.
- Both body temperature (Stahn et al. 2017) and blood pressure (Norsk et al. 2015) adjust for the spaceflight environment and mission day.
- Optional items not included: Moon and Mars surface gravity environments, points and streaks.
- `recharts` is installed but unused; the charts are hand-built SVG.

## Decisions made during the build

These differ from the docx or settle something it left open.

- **Green needs a range check.** A rule with no reference range returns unknown, never green.
- **The adjustment moves one end of the range.** A rise in flight raises the upper limit and leaves the lower limit at the Earth value, so an ordinary Earth reading is not flagged in flight.
- **Baseline.** Unusual readings are left out of the baseline, so a slow fever cannot pull it up. Temperature and heart rate have a baseline; the other indicators do not.
- **Config shape.** One rule per measure and context. Blood pressure has two measures; glucose has a fasting rule and an after-meal rule. A reading with no matching rule is unknown.
- **CPR numbers.** Hinkelbein et al. 2020 gives no compression rate, depth or ratio of its own and refers to Earth-based guidelines. The numbers from the mockup were removed, and the timer shows elapsed time with no pulse.
- **Alert test.** The scenario and its expected outcomes were committed before the evaluation script existed. Nothing was changed after the first run.
- **Design.** The screens follow the team's ARGUS_v13 mockup: a light theme and a 3D suit figure (three.js) with a wireframe fallback. The list does everything the figure does.
- **Check-in readings** are saved as simulated, so they join the demo profile's history and its baseline.
- **Signal delay** lives in one file, `src/data/environments.json`, as labelled demo values.
- **Feel vs. data** is pitched as a small extra. The results table is the differentiator.

## If something breaks before the pitch

Fix in this order: the dashboard and the Earth to Mars transit switch on temperature, the alert test screen, emergency mode, the check-in. Press "Load demo profile" on the dashboard to reset the data.

## Rules for every merge

- Missing, stale or unsupported data is unknown, never green.
- Red comes only from the fixed critical limit. The environment adjustment never moves it.
- A baseline deviation alone is never red.
- Every medical number or instruction has a source or a demo label.
- Simulated data is labelled on screen.
- No diagnosis, no medication or dosing advice.
