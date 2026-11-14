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
- **Owners.** Backend parts A, C and E, plus the emergency data from D, are split across three people. The frontend team owns the screens.

## Owners

| Area | Owner |
|---|---|
| Status engine | Maazin |
| Storage, input checks, thresholds, cards | Angad |
| Simulation, results table, feel vs. data, emergency tree | James |
| Screens and components | Frontend team |
| Deployment, project page, video, slides, AI disclosure | To be named |

## Milestone 0: kickoff (today)

- [x] Next.js app scaffolded; `types.ts`, `getStatus` stub and `npm test` working
- [ ] Commit and push the scaffold
- [ ] Deploy on Vercel (vercel.com → Add New Project → pick this repo → Deploy) and share the URL
- [ ] Everyone has read `FLOW.md` and `CODING_STANDARDS.md`
- [ ] Frontend: `npm install recharts`
- [ ] Ask organizers about video length and slide limit

## Milestone 1: heart rate end to end (today, 6:00 PM)

- [ ] Maazin: median and spread; unknown, red, amber, green rules with tests
- [ ] Angad: `storage.ts`; `validate.ts`; heart-rate rule and card with sources
- [ ] James: `feelVsData.ts`; generator with a fixed seed; `seed.json`
- [ ] Frontend: heart-rate entry, `StatusBadge`, indicator screen with chart, body figure with placeholder statuses, list view
- [ ] All, 5:30 PM: demo heart rate together and list what is missing

## Milestone 2: the differentiators (Sunday, 10:00 AM)

- [ ] Angad: temperature and blood pressure rules with adjustments and sources
- [ ] Maazin: environment adjustment; personal baseline; blood pressure
- [ ] James: emergency tree with sources and labels; fever scenario committed
- [ ] Frontend: emergency screens with timer; environment switch and mission day in the header; "Adjusted for environment" tag
- [ ] Frontend: feel vs. data message on the results screen

## Milestone 3: six indicators and evidence (Sunday, 11:00 AM)

- [ ] Angad: glucose, sleep and mood rules; remaining cards
- [ ] Maazin: all six indicators return real statuses; full test list passes
- [ ] James: `npm run evaluate` writes `results/fever.md` from the real engine
- [ ] Frontend: full check-in; dashboard on real statuses; escalation card with signal delay; "Simulated" tag

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

Never cut: the heart-rate flow, the body figure, the cards, temperature with environment adjustment, emergency mode.

## Rules for every merge

- Missing, stale or unsupported data is unknown, never green.
- Red comes only from the fixed critical limit. The environment adjustment never moves it.
- A baseline deviation alone is never red.
- Every medical number or instruction has a source or a demo label.
- Simulated data is labelled on screen.
- No diagnosis, no medication or dosing advice.
