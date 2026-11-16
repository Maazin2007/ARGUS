# Pitch, video and project page

A starting point for whoever owns the submission. Everything here matches what is built on 15 November. Change the wording freely; do not add claims the app cannot show.

Two things are not confirmed and change the lengths below: the video length and slide limit (an older guide said a 30-second demo and 7 slides), and this year's judging criteria. Ask the organizers first.

## The one line

**On the way to Mars, the doctor is minutes away in each direction. ARGUS is for that gap.**

Say it at the start and again at the end.

## The story in four beats

1. **The problem.** Astronauts are not doctors, and on a Mars mission they cannot wait for one. The CPR guideline we cite puts the Mars communication delay at 3 to 23 minutes.
2. **What ARGUS does.** Six readings (typed or imported from a device file), a plain-language status for each, a card that says what to do, a 7-day handover report for the Crew Medical Officer and the ground, and an emergency mode with logged break-the-glass crew access.
3. **Why you can trust it.** Many teams say Earth ranges do not fit space. We pre-registered the fever test and a 2,000-run sensitivity test, ran five scenarios over 100 random seeds each, and publish where our method is slower, where it misses, and the two predictions we got wrong (`plan/EVALUATION.md`). Every medical rule, card, environment delay, and emergency step is checked by automated tests for a source or a demo label.
4. **What it refuses to do.** No diagnosis, no medication advice, no green light for a reading it could not check.

## Demo path

Rehearse this exact path on the live site, https://argus-delta-gules.vercel.app. Press "Load demo profile" on the dashboard before every run.

| # | Screen | Do | Say |
|---|---|---|---|
| 1 | Shared console | Tap MS1 on "Who is using this console?". Point at the Crew table, then the six rows and the 3D figure. | "One medical console on the ship. Each crewmember taps their name and sees their own readings. Crewmates see only a status word: the pilot is critical and mission specialist 2 has gone quiet, with no numbers shown." |
| 2 | Header | Switch Earth, then back to Mars transit. Watch body temperature. | "37.4 degrees needs review on Earth and is within range in flight. Core temperature rises and blood pressure falls on long missions, so the ranges shift with the mission day. The critical limit never does." |
| 3 | Check-in | Show "Load sample sensor packet" (device import), or log a check-in with fever, short sleep, low mood, and a self-rating of 4 out of 5. | "Readings come from a sensor CSV/JSON export or a step-by-step check-in. When the readings and the crewmember's self-rating disagree—or sleep and mood drop together—ARGUS points it out." |
| 4 | Handover | Open `/handover` and click "Copy ground telemetry packet". | "You cannot wait 24 minutes for a reply from Earth, so ARGUS builds a 7-day handover report and JSON telemetry packet ready for the Crew Medical Officer and the ground." |
| 5 | Alert test | Show the five-scenario, 100-seed headline table, then switch the trace chart. | "Temperature runs about a degree higher in flight, so Earth ranges flag every healthy day: 30 false alerts before the fever. Our adjusted range gives zero, the personal baseline catches the fever about a day and a half sooner on average over 100 seeds, and a single-day typo raises nothing in 100 seeds. We wrote the predictions down before running it, and we publish the ones we got wrong." |
| 6 | Emergency | From the Crew table press "Open emergency" on the pilot's row, show "Open full record (logged)", then answer NO, NO. | "I'm signed in, so I'm the responder, and the pilot is already the patient: it goes straight to the steps. You see the rescue vitals first, here a fever of 38.7, and can open the full record in one logged tap. Then the published microgravity CPR steps." |

If time is short, keep steps 2, 5 and 6.

## 30-second video

One take of the live site, with a voice-over. About 75 words.

| Time | On screen | Voice-over |
|---|---|---|
| 0 to 5 s | Dashboard, six statuses and 3D figure | "Halfway to Mars, the nearest doctor is minutes away. ARGUS helps the crew check themselves." |
| 5 to 12 s | Switch Earth and Mars transit; temperature changes | "Reference ranges adjust for spaceflight using published astronaut studies. The critical limit never moves." |
| 12 to 20 s | Alert test: 5-scenario, 100-seed table and trace | "We tested our rules across five scenarios and 100 random seeds. Zero false alarms, earlier fever detection, and honest reporting where we're slower." |
| 20 to 27 s | Emergency: "Open emergency" on the pilot, NO, NO, Published CPR step | "And when a crewmate collapses, it logs responder access, walks microgravity CPR one step at a time, and prepares the ground packet." |
| 27 to 30 s | ARGUS title and the URL | "ARGUS. For when Earth can't answer." |

Record a second, longer take of the full demo path as a backup for the live pitch.

## Pitch script (about 3 minutes)

Cut the bracketed parts for a shorter slot.

> Imagine you are halfway to Mars and your crewmate has chest pain. You are not a doctor. A question to Earth takes minutes to arrive and minutes to come back. That is the challenge the Brazilian Space Agency set, and that is who ARGUS is for.
>
> ARGUS is a health monitor that runs entirely on board. [No server, no connection to Earth; the readings stay on the crewmember's device.] The astronaut logs six readings—heart rate, blood pressure, glucose, temperature, sleep and mood—or imports a JSON or CSV packet from a sensor. Each reading gets a status in plain words, with the reason, and a five-section card that explains how to measure it, why it matters, what spaceflight does to it, what you can do and when to escalate.
>
> Three things make it more than a tracker.
>
> First, it knows it is in space. Published studies on station astronauts found that resting core body temperature rises by about a degree over the first 75 days, while 24-hour blood pressure falls by 8 to 9 millimetres of mercury. An ordinary reading in flight would trip an Earth-based alert every day. So ARGUS shifts the reference range with the mission day. [Watch: 37.4 degrees needs review on Earth, and is within range in Mars transit.] The critical limit never moves.
>
> Second, it learns your normal. It builds an outlier-resistant personal baseline from your own readings using the median and median absolute deviation, and flags three readings in a row outside it—while ignoring a single-day typo or sensor glitch.
>
> Third, we tested it, and we wrote our predictions down before we ran it. Five scenarios, 100 random seeds each, through the exact same function the dashboard uses. Because core temperature runs about a degree higher in flight, Earth ranges flagged all 30 healthy days before a fever. The adjusted range gave zero false alerts but took five days to notice the fever; adding the personal baseline caught it in three, and a single-day typo raised nothing in 100 seeds. Then we varied the noise and the fever speed over 2,000 more runs. The result held everywhere, but a fever that creeps up very slowly is usually missed, and two of our seven predictions were wrong. It is all in the repo.
>
> When the crew needs to brief the Crew Medical Officer or Mission Control, a handover screen packages the last seven days, every alert, and every feel-versus-data mismatch into a printable report or JSON telemetry bundle.
>
> And for the moment in the challenge video, a crewmate collapsing, there is a full-screen emergency mode. The responder selects who collapsed and who is responding. It shows the rescue vitals immediately, lets the responder open the full record in one logged tap—because in an arrest a rescuer cannot be blocked by a PIN—and walks the published microgravity CPR guideline one step at a time.
>
> Just as important is what ARGUS refuses to do. It does not diagnose. It gives no medication advice. It never shows green for a reading it could not check. And 153 automated tests verify the logic and fail the build if any medical number, card, or emergency step lacks a source or demo label.
>
> On the way to Mars, the doctor is minutes away. ARGUS is for that gap.

## Slides (7)

Few words per slide. The demo carries the detail.

| # | Title | On the slide |
|---|---|---|
| 1 | ARGUS | The one line. Team SpaceRangers. The challenge name. |
| 2 | The gap | "Astronauts are not doctors." Communication delay to Mars: 3 to 23 minutes (Hinkelbein et al. 2020). |
| 3 | What it does | Dashboard screenshot (6-site 3D suit figure + list + light/dark mode). Six indicators, four statuses, device import, and `/handover` ground packet. |
| 4 | It knows it is in space | Temperature & blood pressure adjustment (Stahn et al. 2017; Norsk et al. 2015) + outlier-resistant personal baseline. "The range moves. The critical limit never does." |
| 5 | We tested it (5 scenarios × 100 seeds, plus a 2,000-run sensitivity grid) | Headline results table (`results/summary.md`) and the prediction verdicts (`plan/EVALUATION.md`, section 8). "Predictions committed before the code. 5 of 7 met. Slow fevers are our weak spot." |
| 6 | When a crewmate collapses | Red emergency mode screenshot: Patient + Responder selection, logged break-the-glass vitals access, and Published microgravity CPR step (Hinkelbein et al. 2020). |
| 7 | What it refuses to do | No diagnosis. No medication advice. No green without a check. 153 automated tests guarding every rule and source. Live URL and repository. |

Screenshots: take them from the live site after pressing "Load demo profile", so every slide shows the same data.

## Project page text

Draft sections. Check the field names against this year's submission form.

**High-level summary**

ARGUS is an on-board browser application that helps astronauts assess their own health when Earth is too far away to ask in real time. Crewmembers log six indicators—by hand or via browser CSV/JSON sensor import—and receive a plain-language status, explanation, and five-section reference card for each. Reference ranges shift with the spaceflight environment and mission day (Stahn et al. 2017 for core temperature; Norsk et al. 2015 for blood pressure), an outlier-resistant personal baseline flags sustained changes across three consecutive readings, a 7-day handover report packages alerts for the Crew Medical Officer and Mission Control, and a red emergency mode walks a responder through a collapse with logged break-the-glass vitals access. We tested the status engine across five scenarios and 100 random seeds per scenario, publishing both average and worst-case performance.

**How it addresses the challenge**

- **Assess their own health:** Six indicators (`heartRate`, `bloodPressure`, `bloodGlucose`, `bodyTemperature`, `sleepDuration`, `mood`), four statuses (`Within range`, `Needs review`, `Critical`, `Unknown`), always shown as a word, a symbol and a colour together, plus feel-vs-data and combined sleep/mood checks.
- **Astronauts are not doctors:** Each indicator has a five-section guidance card (how to measure, why it matters, what spaceflight does, self-care, when to escalate), and a `/handover` report prepares a printable summary and JSON telemetry bundle for the Crew Medical Officer and the ground.
- **Guidance in an emergency:** Tailored to the challenge video's chest-pain collapse scenario, with Patient and Responder selection, limited rescue vitals by default, one-tap logged full-record access ("break-the-glass"), Y/N keyboard-accessible steps, elapsed timer, and a ground emergency message builder.
- **Different environments:** Earth, space station and Mars transit, each with its simulated one-way and round-trip signal delay; both body temperature and blood pressure reference ranges adjust by mission day.
- **Routine prompts & device feeds:** A check-in due banner on the dashboard, advancing check-in timestamps, and browser-based CSV/JSON device import validated through the same bounds as typed entries.
- **Charts, 3D figure and themes:** Interactive SVG strip charts with reference and personal baseline bands, a 6-site 3D suit figure (with wireframe fallback), and light/dark console themes.

**How we built it**

React and TypeScript on Next.js, hosted on Vercel, with zero server or database dependencies so all health data remains on board in `localStorage`. All status, baseline, validation, device-import, handover, and emergency-tree logic lives in pure functions backed by **153 automated tests**. Medical numbers live in JSON data files, each verified by automated tests to carry a citation from `plan/SOURCES.md` or an explicit `"demo parameter"` / `"Demo copy"` label. `npm run evaluate` deterministically regenerates `results/fever.md`, the 5-scenario, 100-seed `results/summary.md`, and the 2,000-run `results/sensitivity.md`. The test protocol, the commit timeline behind each pre-registration claim, and the limits are in `plan/EVALUATION.md`.

**Results**

Paste the headline table from `results/summary.md` and `results/fever.md` along with the "Limits" section.

**Space agency data and resources**

Take the full table from `plan/SOURCES.md`. Highlight:
- **NASA Human Research Program** (5 Hazards and Risks of Human Spaceflight: orthostatic intolerance, altered nutrition, sleep loss, behavioral conditions)
- **Stahn et al. 2017** (*Scientific Reports*, core body temperature `+1.01 °C` shift over 75 mission days in ISS astronauts)
- **Norsk et al. 2015** (*Journal of Physiology*, 24-hour ambulatory blood pressure `-8 mmHg` systolic / `-9 mmHg` diastolic shift in ISS astronauts)
- **Hinkelbein et al. 2020** (*Scand J Trauma Resusc Emerg Med*, DGLRM/ESAM microgravity CPR guideline: Evetts-Russomano, Reverse-Bear-Hug, and Handstand methods)
- **AHA, CDC, NIDDK, and ADA Standards of Care** (resting heart rate, blood pressure, sleep duration, and fasting/post-meal/Level-2 hypoglycaemia glucose thresholds)

**Limits**

All readings in the demo are simulated. The alert evaluation is a software benchmark on five simulated scenarios (100 seeds each) and a sensitivity grid, with team-chosen demo parameters, not clinical validation. Only the fever scenario and the sensitivity grid were pre-registered. The Earth-range false alerts follow from the in-flight base temperature we assume. A fever that rises 0.5 °C over ten days is usually missed. Only temperature and blood pressure adjust for the spaceflight environment. Unsourced emergency triage steps are labelled `"Demo copy"`, while the microgravity CPR compression step is labelled `"Published"`. ARGUS is not a medical device.

**Next steps**

1. **Replay against NASA bed-rest data:** Run `getStatus` unchanged against the UTMB head-down bed-rest dataset on the NASA Life Sciences / OSDR portal (DOI `10.83263/wjw1-ta27`) with planted fever and blood-pressure shifts to measure false-alarm and miss rates on human longitudinal vitals alongside our 100-seed synthetic benchmark.
2. **Ephemeris-driven signal delay:** Replace the fixed `720 s` Mars transit demo parameter in `environments.json` with a precomputed JPL Horizons Earth–Mars one-way light-time table by mission day.
3. **Passive cabin & radiation feeds:** Feed continuous dosimeter (MSL RAD / OSDR RadLab) and cabin $\text{CO}_2$ / $\text{SpO}_2$ streams through `deviceImport.ts`.
4. **Objective cognitive check:** Add a 3-minute Psychomotor Vigilance Test (PVT-B) alongside self-reported sleep duration and mood.

**Use of AI**

Take this from `plan/AI_USE.md`. It lists every tool the team used and what for.

## Questions judges may ask

| Question | Answer |
|---|---|
| Is this medically validated? | No. It is a software prototype evaluated on simulated data. Every screen, the footer, and the results files state this plainly. |
| Other teams shift ranges for space too—what makes yours different? | We tested ours and wrote the protocol down (`plan/EVALUATION.md`): five scenarios over 100 random seeds, plus a pre-registered sensitivity grid of 2,000 runs, all through the same function the dashboard uses (`npm run evaluate`). We publish where our method is slower, where it misses, and which predictions failed. |
| Why use simulated scenarios instead of NASA bed-rest data? | Bed-rest studies contain no real fevers or emergencies, so teams using them still have to inject synthetic spikes. Controlled simulation lets us set the exact onset day and run 100 Monte Carlo seeds per scenario to measure mean and worst-case days-to-detection and prove that a single-day typo causes zero false alarms. Replaying our pure `getStatus` function on the UTMB bed-rest dataset is our first Next Step. |
| Why is there no radiation or $\text{SpO}_2$ tile? | Radiation is measured continuously by spacecraft dosimeters, not self-administered crew check-ins. We focused on the six crew-logged indicators named in the challenge brief and built browser CSV/JSON device import so external sensor packets can feed into the same pipeline. |
| Why one-tap logged unlock in emergency mode instead of a PIN? | Two reasons: in a collapse or cardiac arrest, a responder must never be blocked by a PIN they do not know; and in a client-side browser app with no server, a PIN in JavaScript cannot keep a secret from DevTools anyway. Instead, we use hospital "break-the-glass" access: rescue vitals show first, opening the full record takes one tap, and every access is logged with the responder's role and UTC timestamp into the ground message. |
| Why no AI model predicting illness or prescribing treatment? | Data from a few dozen astronauts is too small to train a reliable clinical model, and an isolated crew needs a deterministic, auditable reason for every alert. We use median/MAD personal baselines with plain-language reasons, and we refuse to diagnose or recommend medications. |
| Did you tune the fever test until you won? | No. `scripts/scenarios/fever.json` and its expected outcomes were committed (`10e27ba`) before `scripts/evaluate.ts` existed (`81983c1`), and the fever results have not changed since. One honest caveat: the temperature baseline floor (0.3 °C) was set in the same commit as the freeze, so git cannot prove it was chosen blind. That is why we then ran a sensitivity grid with its predictions committed first. |
| Were all five scenarios pre-registered? | No, only the fever scenario. The other four had expectations written before the first run, but they were committed together with the results, so we call them expectations, not pre-registration. The sensitivity test was pre-registered (`6c665d2`, before the code in `68e5869`). The full timeline is in `plan/EVALUATION.md`, section 5. |
| Isn't the 30 Earth false alerts built into your scenario? | Yes, and we say so. We set the healthy in-flight temperature at 37.4 °C because spaceflight raises core temperature (Stahn et al. 2017), and that sits above the Earth limit of 37.2 °C. The test shows what follows if that rise is real: the adjusted range removes the false alerts without delaying the red alert. |
| What do the 100 seeds actually vary? | Only the random noise on each reading. They show the frozen-seed table was not luck. The sensitivity grid then varies the noise size (0.05 to 0.3 °C) and the fever speed (0.05 to 0.3 °C a day). |
| Where does it fail? | Slow fevers. A rise of 0.05 °C a day never crosses the adjusted range, and the baseline catches it in only 33 of 100 seeds at normal noise. We predicted more than half (P5), so that prediction is marked not met. P6 also failed by 0.13 days. Both are in `plan/EVALUATION.md`, section 8. |
| Why trust station data for Mars transit? | Mars transit is weightless like the station, making ISS studies (Stahn et al. 2017; Norsk et al. 2015) the closest published human evidence. We cap the shift at the published value, label the extrapolation, and never move the critical limit. |
| What about the CPR instructions? | Step `a3` follows Recommendations 2, 3 and 10 of the published microgravity CPR guideline (Hinkelbein et al. 2020). Because the paper gives no compression rate or depth of its own and refers to Earth guidelines, we show an elapsed timer without inventing numbers, and note that CPR has never been performed on a human in spaceflight. |
| How does the crew find out about each other? | ARGUS runs as one shared console. Each crewmember taps their name and sees their own readings; everyone else sees a status word and the last reading day. A critical status or a missed check-in is flagged on the crew board. A flight version would also take a live wearable feed. |
| Why no login password? | A password in a browser app protects nothing. Privacy comes from what is shown: status only on ordinary days, rescue vitals in an emergency, and the full record in one logged tap. |

## Before submitting

- [ ] Video length, slide limit and judging criteria confirmed with the organizers
- [ ] Every claim in the pitch can be shown on the live site
- [ ] Video link plays without signing in
- [ ] Repository is public; the README shows the live URL
- [ ] `plan/SOURCES.md` and `plan/AI_USE.md` are complete
- [ ] The build is tagged and the commit is recorded
