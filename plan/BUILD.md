# Build checklist

Working version of `SpaceRangers_Final_Build_Plan.docx`, mapped to this repo. Tick boxes as things merge.

| File | Read it for |
|---|---|
| `FLOW.md` | How the whole app works, and what the screens may call |
| `BACKEND.md` | Step-by-step work for Maazin, Angad and James |
| `CODING_STANDARDS.md` | Rules everyone follows |
| `DESIGN_IDEAS.md` | Ideas for the frontend team |
| `SOURCES.md` | Where every medical number comes from; add a row when you open a source |
| `AI_USE.md` | AI disclosure log; add a row when you use an AI tool |
| `project_context.txt` | The challenge text |

## Changes from the docx

- **Build order.** Temperature and blood pressure come straight after heart rate, because they carry the environment adjustment, one of our three differentiators. Emergency mode moves up and gets its timer, because it is the scenario in the challenge video.
- **Baseline.** Unusual readings are left out of the baseline, so a slow fever cannot pull the baseline up with it (`BACKEND.md`, Maazin step 5).
- **Config shape.** One rule per measure and context. Blood pressure has two measures; glucose has a fasting rule and an after-meal rule. A reading with no matching rule is unknown.
- **Emergency steps** gain a `next` field for instruction steps.
- **Today's target** is heart rate end to end plus temperature on Earth versus Mars transit, because temperature is what we demo.
- **Papers first.** Angad opens Stahn 2017 and Norsk 2015 before writing code; they are the critical path. Cards move to a separate writer so Angad is not carrying five jobs.
- **List before figure.** The list view does everything; the body figure is drawn on top of the same data afterwards.
- **Demo profile.** A "Load demo profile" button fills the app from `seed.json`, so the pitch never starts from an empty dashboard.
- **Signal delay** lives in one file, `src/data/environments.json`, as labelled demo values.
- **Feel vs. data** is pitched as a small extra, not a headline. The honest results table is the differentiator.
- **Owners.** Backend parts A, C and E, plus the emergency data from D, are split across three people. The frontend team owns the screens.

## Owners

| Area | Owner |
|---|---|
| Status engine | Maazin |
| Sources, storage, input checks, thresholds | Angad |
| Simulation, results table, feel vs. data, emergency tree, signal delay, demo profile | James |
| Cards (`src/data/cards.json`) | To be named (a frontend person; no code needed) |
| Screens and components | Frontend team |
| Deployment, project page, video, slides, AI disclosure | To be named |

## Milestone 0: kickoff (today)

- [x] Next.js app scaffolded; `types.ts`, `getStatus` stub and `npm test` working
- [x] Commit and push the scaffold
- [ ] Angad: open Stahn 2017, Norsk 2015 and a resting heart-rate source; fill "Opened by" in `SOURCES.md`
- [ ] Name the cards writer and the submission owner
- [ ] Deploy on Vercel (vercel.com → Add New Project → pick this repo → Deploy) and share the URL
- [ ] Everyone has read `FLOW.md` and `CODING_STANDARDS.md`
- [ ] Frontend: `npm install recharts`
- [ ] Ask organizers about video length and slide limit

## Milestone 1: heart rate and temperature (today, 6:00 PM)

- [ ] Maazin: median and spread; unknown, red, amber, green rules; environment adjustment; tests
- [ ] Angad: `storage.ts`; `validate.ts`; resting heart-rate and temperature rules with sources
- [ ] James: `feelVsData.ts`; generator with a fixed seed; `seed.json` with the demo path
- [ ] Cards writer: heart-rate and temperature cards
- [ ] Frontend: list view first; heart-rate and temperature entry; `StatusBadge`; indicator screen with chart; environment switch; then the body figure
- [ ] All, 5:30 PM: demo heart rate and temperature (Earth versus Mars transit) together and list what is missing

## Milestone 2: the differentiators (Sunday, 10:00 AM)

- [ ] Angad: blood pressure rules with adjustments and sources
- [ ] Maazin: personal baseline; blood pressure
- [ ] James: emergency tree with sources and labels; fever scenario committed; `loadDemoProfile()`
- [ ] Frontend: emergency screens with timer; mission day in the header; "Adjusted for environment" tag; "Load demo profile" button
- [ ] Frontend: feel vs. data message on the results screen

## Milestone 3: six indicators and evidence (Sunday, 11:00 AM)

- [ ] Angad: glucose, sleep and mood rules
- [ ] Cards writer: remaining cards
- [ ] Maazin: all six indicators return real statuses; full test list passes
- [ ] James: `npm run evaluate` writes `results/fever.md` from the real engine
- [ ] Frontend: full check-in; dashboard on real statuses; escalation card with signal delay from `environments.json`; "Simulated" tag

## Milestone 4: freeze (Sunday, 2:30 PM)

- [ ] Check-in due banner
- [ ] Every number has a source or a demo label; sources list complete
- [ ] Build tagged, commit recorded, first complete submission sent
- [ ] Video, slides, AI disclosure

## If we fall behind, cut in this order

1. Due banner
2. Points and streaks, extra environments, second scenario, report (all optional anyway)
3. Results table stays at one scenario
4. Glucose, sleep and mood shown as "input only"

Never cut: the heart-rate flow, the list view, the cards, temperature with environment adjustment, emergency mode, the demo profile. The body figure stays too, but if time is short it is a simple outline with clickable regions, not an illustration.

## Rules for every merge

- Missing, stale or unsupported data is unknown, never green.
- Red comes only from the fixed critical limit. The environment adjustment never moves it.
- A baseline deviation alone is never red.
- Every medical number or instruction has a source or a demo label.
- Simulated data is labelled on screen.
- No diagnosis, no medication or dosing advice.
