# Pitch, video and project page

A starting point for whoever owns the submission. Everything here matches what is built on 15 November. Change the wording freely; do not add claims the app cannot show.

Two things are not confirmed and change the lengths below: the video length and slide limit (an older guide said a 30-second demo and 7 slides), and this year's judging criteria. Ask the organizers first.

## The one line

**On the way to Mars, the doctor is minutes away in each direction. ARGUS is for that gap.**

Say it at the start and again at the end.

## The story in four beats

1. **The problem.** Astronauts are not doctors, and on a Mars mission they cannot wait for one. The CPR guideline we cite puts the Mars communication delay at 3 to 23 minutes.
2. **What ARGUS does.** Six readings, a plain-language status for each, a card that says what to do, and one emergency walked step by step.
3. **Why you can trust it.** We tested the alerts on a simulated fever and publish the result, including where our method is slower. Every number has a source or is labelled a demo parameter.
4. **What it refuses to do.** No diagnosis, no medication advice, no green light for a reading it could not check.

## Demo path

Rehearse this exact path on the live site, https://argus-delta-gules.vercel.app. Press "Load demo profile" on the dashboard before every run.

| # | Screen | Do | Say |
|---|---|---|---|
| 1 | Dashboard | Point at the six rows, all with a status. | "Mission day 212, Mars transit. Six indicators, each with a word, a symbol and a reason." |
| 2 | Header | Switch Earth, then back to Mars transit. Watch body temperature. | "37.4 degrees needs review on Earth and is within range in flight. Core temperature rises on long missions, so the range moves. The critical limit never does." |
| 3 | Check-in | Log the seven steps. Heart rate, temperature, blood pressure and sleep are filled in; type a glucose value, pick a mood, and choose 4 for the overall rating. | "A bad day: fever, short sleep. The astronaut still rates themselves 4 out of 5." |
| 4 | Results | Show the feel vs. data message and the escalation card. | "The readings and the rating disagree, so it says so. A critical reading opens the escalation card: who to tell, what to do, and that an answer from Earth is 24 minutes away." |
| 5 | Alert test | Show the table, then the trace. | "Earth ranges cry wolf for 30 days. The adjusted range stops that but takes 5 days to see the fever. Our personal baseline sees it in 3." |
| 6 | Emergency | Press EMERGENCY, answer NO, NO. | "The challenge video opens with a crewmate collapsing. One question per screen, every answer logged. The method comes from the published microgravity CPR guideline." |

If time is short, keep steps 2, 5 and 6.

## 30-second video

One take of the live site, with a voice-over. About 75 words.

| Time | On screen | Voice-over |
|---|---|---|
| 0 to 5 s | Dashboard, six statuses | "Halfway to Mars, the nearest doctor is minutes away. ARGUS helps the crew check themselves." |
| 5 to 12 s | Switch Earth and Mars transit; temperature changes | "Reference ranges adjust for spaceflight, using published astronaut data. The critical limit never moves." |
| 12 to 20 s | Alert test table and trace | "We tested it on a simulated fever. Earth ranges gave 30 false alerts. Ours gave none, and caught it two days sooner." |
| 20 to 27 s | Emergency: NO, NO, compressions step | "And when a crewmate collapses, it walks the crew through it, one step at a time." |
| 27 to 30 s | ARGUS title and the URL | "ARGUS. For when Earth can't answer." |

Record a second, longer take of the full demo path as a backup for the live pitch.

## Pitch script (about 3 minutes)

Cut the bracketed parts for a shorter slot.

> Imagine you are halfway to Mars and your crewmate has chest pain. You are not a doctor. A question to Earth takes minutes to arrive and minutes to come back. That is the challenge the Brazilian Space Agency set, and that is who ARGUS is for.
>
> ARGUS is a health monitor that runs entirely on board. [No server, no connection to Earth; the readings never leave the device.] The astronaut logs six readings: heart rate, blood pressure, glucose, temperature, sleep and mood. Each one gets a status in plain words, with the reason, and a card that explains how to measure it, why it matters, what spaceflight does to it and when to escalate.
>
> Three things make it more than a tracker.
>
> First, it knows it is in space. Research on the space station found that core body temperature rises by about a degree over the first months. A normal reading in flight would trip an alert built for Earth, every single day. So ARGUS shifts the reference range with the mission day. [Watch: 37.4 degrees needs review on Earth, and is within range in Mars transit.] The critical limit never moves.
>
> Second, it learns your normal. It builds a personal baseline from your own readings, and flags three readings in a row outside it.
>
> Third, we tested it and we publish the result. We simulated a slow fever and ran it three ways. Earth ranges gave 30 false alerts in 30 days. The adjusted range gave none, but took five days to notice the fever. Adding the personal baseline caught it in three. We wrote down what we expected before we ran it, and the code that produced the table is in the repository.
>
> And for the moment in the challenge video, a crewmate collapsing, there is an emergency mode. One question per screen, big buttons, every answer logged with its time. [The compression method comes from the published guideline for CPR in microgravity, and the screen says plainly that CPR has never been performed on a person in space.]
>
> Just as important is what ARGUS refuses to do. It does not diagnose. It gives no medication advice. It never shows green for a reading it could not check. Every medical number has a source, or is labelled a demo parameter.
>
> This is a weekend prototype on simulated data, not a medical device. But the same idea, a tool that explains, adjusts and admits what it does not know, is what a remote clinic on Earth needs too.
>
> On the way to Mars, the doctor is minutes away. ARGUS is for that gap.

## Slides (7)

Few words per slide. The demo carries the detail.

| # | Title | On the slide |
|---|---|---|
| 1 | ARGUS | The one line. Team SpaceRangers. The challenge name. |
| 2 | The gap | "Astronauts are not doctors." Communication delay to Mars: 3 to 23 minutes (Hinkelbein et al. 2020). |
| 3 | What it does | One screenshot of the dashboard. Six indicators, four statuses, a reason for each. |
| 4 | It knows it is in space | Temperature screenshot on Earth and on Mars transit, side by side. "The range moves. The critical limit never does." |
| 5 | We tested it | The results table, three rows. "Simulated. Expectations written before the run." |
| 6 | When it goes wrong | Emergency step screenshot. "One step per screen. Sourced, or labelled demo copy." |
| 7 | What it refuses to do | No diagnosis. No medication advice. No green without a check. Not a medical device. The URL and the repository. |

Screenshots: take them from the live site after pressing "Load demo profile", so every slide shows the same data.

## Project page text

Draft sections. Check the field names against this year's submission form.

**High-level summary**

ARGUS is a browser app that helps astronauts assess their own health when Earth is too far away to ask. The astronaut logs six indicators and gets a plain-language status for each, with the reasons and a guidance card. Reference ranges adjust for the space environment and mission day, a personal baseline flags sustained changes, and an emergency mode walks the crew through a collapse one step at a time. It runs entirely on the device, with no server. We tested the alert rules on a simulated fever and publish the results, including their limits.

**How it addresses the challenge**

- Assess their own health: six indicators, four statuses (within range, needs review, critical, unknown), always as a word, a symbol and a colour.
- Astronauts are not doctors: each card explains how to measure, why it matters, what spaceflight does, what you can do and when to escalate.
- Guidance in an emergency: the chest-pain collapse from the challenge video, as yes/no steps with a log.
- Different environments: Earth, space station and Mars transit, each with its own signal delay; the temperature range adjusts in flight.
- Routine prompts: a check-in due banner on the dashboard.
- Charts and colour coding: a trend chart per indicator with the reference range and personal baseline as bands.

**How we built it**

React and TypeScript on Next.js, hosted on Vercel. All logic is in plain functions with 73 automated tests. Medical numbers live in data files, each with a source or a "demo parameter" label, never in the code. `npm run evaluate` regenerates the alert results from a fixed scenario and seed.

**Results**

Paste the table from `results/fever.md` and its "Limits" section.

**Space agency data and resources**

Take the list from `plan/SOURCES.md`. Name the three that carry the design: NASA Human Research Program (hazards and risks), Stahn et al. 2017 (core temperature in flight), Hinkelbein et al. 2020 (CPR in microgravity).

**Limits**

All data is simulated. The alert test is one scenario with parameters we chose; it is a software test, not clinical validation. Several ranges are demo parameters. Only temperature adjusts for the environment. The emergency steps are labelled "Demo copy" unless a team member has opened the source. ARGUS is not a medical device.

**Use of AI**

Take this from `plan/AI_USE.md`. It must list every tool the team used and what for.

## Questions judges may ask

| Question | Answer |
|---|---|
| Is this medically validated? | No. It is a prototype on simulated data. The screens and the results file say so. |
| Why no AI model predicting illness? | Data from a few dozen astronauts is too little to train on, and a crew alone needs a reason for every alert. We detect changes from each astronaut's own baseline and explain them. |
| Did you tune the test until you won? | No. The scenario and expected outcomes were committed before the evaluation script existed; the git history shows the order. |
| Why does the baseline catch the fever sooner? | It is the astronaut's own usual band. Three readings in a row outside it turn amber, before the reading reaches the adjusted limit. |
| Why trust station data for Mars? | Transit is weightless, like the station, so it is the closest published evidence. We label it, we never extend the shift past what was measured, and the critical limit never moves. |
| Why no database? | The crew cannot depend on a link to Earth. Data stays on board, in the browser. Only one file touches storage, so it can be swapped later. |
| What about the CPR instructions? | The method follows the published microgravity guideline. That guideline gives no rate or depth of its own, so we show none. The screen says CPR has never been performed on a person in space. |
| What would you do next? | More scenarios in the alert test, a blood pressure adjustment from the published data, Moon and Mars surface, and a report the astronaut can choose to send to the ground. |

## Before submitting

- [ ] Video length, slide limit and judging criteria confirmed with the organizers
- [ ] Every claim in the pitch can be shown on the live site
- [ ] Video link plays without signing in
- [ ] Repository is public; the README shows the live URL
- [ ] `plan/SOURCES.md` and `plan/AI_USE.md` are complete
- [ ] The build is tagged and the commit is recorded
