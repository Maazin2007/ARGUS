# Sources

Every medical number and instruction in the app traces back to a row here, or carries a demo label. Add a row when you open a source, before you use a number from it. This file becomes the sources list on the project page.

Sources support background and engineering choices. They do not medically validate the app.

| Source | Used for | Opened by | Date |
|---|---|---|---|
| Challenge page and video: Create Health Monitoring Software for Astronauts on Space Missions (NASA Space Apps 2026) | Scope; reason emergency mode exists | | |
| NASA Human Research Program: 5 Hazards of Human Spaceflight | Card section "what spaceflight does" | Ihsan | 14 Nov 2026 |
| NASA Human Research Program: Risks of Human Spaceflight | Card section "what spaceflight does" | | |
| NASA Human Research Roadmap: Risk of Orthostatic Intolerance | Fluid and electrolyte countermeasure guidance | Ihsan | 14 Nov 2026 |
| Stahn et al. 2017, Increased core body temperature in astronauts during long-duration space missions, Scientific Reports. doi:10.1038/s41598-017-15560-w | Temperature adjustment and card | Ihsan / Angad | 14 Nov 2026 |
| Norsk et al. 2015, Fluid shifts, vasodilatation and ambulatory blood pressure reduction during long duration spaceflight, Journal of Physiology. doi:10.1113/jphysiol.2014.284869 | Blood pressure adjustment and card | Ihsan / Angad | 14 Nov 2026 |
| Hinkelbein et al. 2020, CPR during spaceflight: a guideline for CPR in microgravity, Scand J Trauma Resusc Emerg Med | Emergency cardiac-arrest branch | | |
| Institute of Medicine 2001, Safe Passage: Astronaut Care for Exploration Missions, chapter 6 | Background | | |
| American Heart Association: All About Heart Rate (Pulse) | Resting heart rate range and measurement method | Ihsan | 14 Nov 2026 |
| American Heart Association: Target Heart Rates Chart | Exercise zones only. Weak source for a resting range: use a page that states a resting range directly, or mark it a demo parameter | | |
| American Heart Association: Understanding Blood Pressure Readings | Blood pressure range, measurement and hypertensive crisis | Ihsan | 14 Nov 2026 |
| NIDDK: Blood Glucose Tests | Fingerstick glucometer testing and target ranges | Ihsan | 14 Nov 2026 |
| MedlinePlus: Temperature measurement | Temperature range, how to measure | Ihsan | 14 Nov 2026 |
| CDC: About Sleep | Sleep range and measurement | Ihsan | 14 Nov 2026 |
| NASA Human Research Program: Risk of Adverse Health Outcomes from Altered Nutrition | Glucose metabolism & nutrition context in microgravity | Ihsan | 14 Nov 2026 |
| NASA Human Research Program: Risk of Performance Decrements from Sleep Loss | Sleep loss and circadian disruption context | Ihsan | 14 Nov 2026 |
| NASA Human Research Program: Risk of Adverse Behavioral Conditions and Psychiatric Disorders | Psychological adaptation during confinement | Ihsan | 14 Nov 2026 |

An empty "Opened by" means nobody has checked the source yet, so no number from it may be used.

## Demo parameters

Values we chose ourselves because no source gives them. Each is labelled "demo parameter" in the app.

| Parameter | Value | Where |
|---|---|---|
| Simulated one-way signal delay, station | 1 s | `src/data/environments.json` |
| Simulated one-way signal delay, Mars transit | 720 s (12 min) | `src/data/environments.json` |
| Simulated demo astronaut: resting heart rate 62 ± 3 bpm, 30 days | 62 ± 3 bpm | `scripts/profiles/demo.json` |
| Simulated demo astronaut: body temperature 37.4 ± 0.1 °C, 30 days (re-check against the temperature rule once it lands) | 37.4 ± 0.1 °C | `scripts/profiles/demo.json` |
| Critical low heart rate escalation threshold | 40 bpm | `src/data/cards.json` |
| Fever escalation threshold | 38.5 °C | `src/data/cards.json` |
| Low glucose escalation threshold | 54 mg/dL | `src/data/cards.json` |
| High glucose escalation threshold | 250 mg/dL | `src/data/cards.json` |
| Short sleep escalation threshold | Less than 4 hours on two or more consecutive duty cycles | `src/data/cards.json` |

