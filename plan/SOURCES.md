# Sources

Every medical number and instruction in the app traces back to a row here, or carries a demo label. Add a row when you open a source, before you use a number from it. This file becomes the sources list on the project page.

Sources support background and engineering choices. They do not medically validate the app.

| Source | Used for | Opened by | Date |
|---|---|---|---|
| Challenge page and video: Create Health Monitoring Software for Astronauts on Space Missions (NASA Space Apps 2026) | Scope; reason emergency mode exists | | |
| NASA Human Research Program: 5 Hazards of Human Spaceflight | Card section "what spaceflight does" | | |
| NASA Human Research Program: Risks of Human Spaceflight | Card section "what spaceflight does" | | |
| Stahn et al. 2017, Increased core body temperature in astronauts during long-duration space missions, Scientific Reports. doi:10.1038/s41598-017-15560-w | Temperature adjustment | | |
| Norsk et al. 2015, Fluid shifts, vasodilatation and ambulatory blood pressure reduction during long duration spaceflight, Journal of Physiology. doi:10.1113/jphysiol.2014.284869 | Blood pressure adjustment | | |
| Hinkelbein et al. 2020, CPR during spaceflight: a guideline for CPR in microgravity, Scand J Trauma Resusc Emerg Med | Emergency cardiac-arrest branch | | |
| Institute of Medicine 2001, Safe Passage: Astronaut Care for Exploration Missions, chapter 6 | Background | | |
| American Heart Association: Target Heart Rates Chart | Exercise zones only. Weak source for a resting range: use a page that states a resting range directly, or mark it a demo parameter | | |
| American Heart Association: Understanding Blood Pressure Readings | Blood pressure range | | |
| NIDDK: Continuous Glucose Monitoring | Glucose range | | |
| MedlinePlus: Temperature measurement | Temperature range, how to measure | | |
| CDC: About Sleep | Sleep range | | |

An empty "Opened by" means nobody has checked the source yet, so no number from it may be used.

## Demo parameters

Values we chose ourselves because no source gives them. Each is labelled "demo parameter" in the app.

| Parameter | Value | Where |
|---|---|---|
| Simulated one-way signal delay, station | 1 s | `src/data/environments.json` |
| Simulated one-way signal delay, Mars transit | 720 s (12 min) | `src/data/environments.json` |
