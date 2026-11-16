# Sources

Every medical number and instruction in the app traces back to a row here, or carries a demo label. Add a row when you open a source, before you use a number from it. This file becomes the sources list on the project page.

Sources support background and engineering choices. They do not medically validate the app.

| Source | Used for | Opened by | Date |
| --- | --- | --- | --- |
| Challenge page and video: Create Health Monitoring Software for Astronauts on Space Missions (NASA Space Apps 2026) | Scope; reason emergency mode exists | Maazin | 15 Nov 2026 |
| NASA Human Research Program: 5 Hazards of Human Spaceflight | Card section "what spaceflight does" | Ihsan | 14 Nov 2026 |
| NASA Human Research Program: Risks of Human Spaceflight (https://www.nasa.gov/hrp/risks/) | Card section "what spaceflight does" | Maazin | 15 Nov 2026 |
| NASA Human Research Roadmap: Risk of Orthostatic Intolerance | Fluid and electrolyte countermeasure guidance | Ihsan | 14 Nov 2026 |
| Stahn et al. 2017, Increased core body temperature in astronauts during long-duration space missions, Scientific Reports. doi:10.1038/s41598-017-15560-w | Temperature adjustment (`+1.01 °C` over `75` days) and card | Ihsan / Angad | 14 Nov 2026 |
| Norsk et al. 2015, Fluid shifts, vasodilatation and ambulatory blood pressure reduction during long duration spaceflight, Journal of Physiology. doi:10.1113/jphysiol.2014.284869 | Blood pressure adjustment (`-8 mmHg` systolic, `-9 mmHg` diastolic measured on flight days 85–192 in 8 male ISS astronauts; modeled over `85` days) and card | Ihsan / Angad / Maazin | 15 Nov 2026 |
| Hinkelbein et al. 2020, CPR during spaceflight: a guideline for CPR in microgravity, Scand J Trauma Resusc Emerg Med. doi:10.1186/s13049-020-00793-y (open access) | Emergency cardiac-arrest branch: compression methods (Evetts-Russomano for immediate BLS, Reverse-Bear-Hug fallback, Handstand on CMRS for ALS; recommendations 2 and 3) and defibrillator isolation (recommendation 10). The paper gives no compression rate, depth or ratio of its own and refers to Earth-based AHA/ERC guidelines | Maazin | 15 Nov 2026 |
| Institute of Medicine 2001, Safe Passage: Astronaut Care for Exploration Missions, chapters 1 and 6 | Background on autonomous crew health care and longitudinal baseline monitoring during deep-space exploration | Maazin | 15 Nov 2026 |
| American Heart Association: [All About Heart Rate (Pulse)](https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse) | Resting heart rate range (`60–100 bpm` in `indicators.json`) and measurement method. Not a universal emergency threshold | Ihsan / Angad | 14 Nov 2026 |
| American Heart Association: Target Heart Rates Chart | Reviewed and excluded for resting heart rate (covers exercise zones only; resting range uses All About Heart Rate above) | Angad / Maazin | 15 Nov 2026 |
| American Heart Association: [Understanding Blood Pressure Readings](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings) | Blood pressure upper reference limits (`< 120 / < 80 mmHg`, stored as `119 / 79 mmHg`), measurement method, and hypertensive crisis critical limits (`> 180 / > 120 mmHg` in `indicators.json`) | Ihsan / Angad | 14 Nov 2026 |
| NIDDK: Continuous Glucose Monitoring | Glucose measurement context | Ihsan | 14 Nov 2026 |
| NIDDK: [Blood Glucose Tests / Diabetes Tests & Diagnosis](https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis) | Fingerstick glucometer testing and normal fasting (`<= 99 mg/dL`) and 2-hour post-load (`< 140 mg/dL`, stored as `139 mg/dL`) glucose ranges in `indicators.json` and `cards.json` | Ihsan / Maazin | 15 Nov 2026 |
| American Diabetes Association (ADA): Standards of Care in Diabetes — Glycemic Goals and Hypoglycemia | Level 1 hypoglycaemia alert value (`< 70 mg/dL`, lower fasting bound) and Level 2 clinically significant hypoglycaemia critical threshold (`< 54 mg/dL` in `indicators.json` and `cards.json`) | Maazin | 15 Nov 2026 |
| MedlinePlus: Temperature measurement | Adult resting body temperature context and measurement | Ihsan | 14 Nov 2026 |
| CDC: [About Sleep](https://www.cdc.gov/sleep/about/index.html) | Sleep range (at least `7 hours` per 24 hours for adults aged 18–60 in `indicators.json`) and measurement. Not an emergency threshold | Ihsan / Angad | 14 Nov 2026 |
| NASA Human Research Program: Risk of Adverse Health Outcomes from Altered Nutrition | Glucose metabolism and nutrition context in microgravity | Ihsan | 14 Nov 2026 |
| NASA Human Research Program: Risk of Performance Decrements from Sleep Loss | Sleep loss and circadian disruption context | Ihsan | 14 Nov 2026 |
| NASA Human Research Program: Risk of Adverse Behavioral Conditions and Psychiatric Disorders | Psychological adaptation during confinement | Ihsan | 14 Nov 2026 |

## Demo parameters

Values we chose ourselves because no source gives them. Each is labelled `"demo parameter"` in the app.

| Parameter | Value | Where |
| --- | --- | --- |
| Simulated one-way signal delay, station | `1 s` | `src/data/environments.json` |
| Simulated one-way signal delay, Mars transit | `720 s (12 min)` | `src/data/environments.json` |
| Simulated demo astronaut: resting heart rate, 30 days | `66 ± 3 bpm` | `scripts/profiles/demo.json` |
| Simulated demo astronaut: body temperature, 30 days (amber on the Earth range, green after the Mars transit adjustment; checked by `tests/seed.test.ts`) | `37.4 ± 0.1 °C` | `scripts/profiles/demo.json` |
| Simulated demo astronaut: fasting blood glucose, 30 days | `92 ± 6 mg/dL` | `scripts/profiles/demo.json` |
| Simulated demo astronaut: sleep duration, 30 days | `7.6 ± 0.4 h` | `scripts/profiles/demo.json` |
| Simulated demo astronaut: mood self-rating, 30 days | `4 ± 1 (whole number, 1 to 5)` | `scripts/profiles/demo.json` |
| Simulated demo astronaut: resting blood pressure, 30 days | `110 ± 5 / 70 ± 4 mmHg` | `scripts/profiles/demo.json` |
| Earth resting body temperature reference range (illustrative interval for Earth-amber / Mars-green comparison) | `36.0–37.2 °C` | `src/data/indicators.json` |
| Resting blood pressure lower reference bounds (AHA defines upper normal `< 120 / < 80 mmHg`; lower bounds are demo parameters shifted in flight by Norsk 2015) | `90 mmHg` systolic, `60 mmHg` diastolic | `src/data/indicators.json` |
| Resting heart rate personal-baseline floor (smallest deviation that counts) | `10 bpm` | `src/data/indicators.json` |
| Body temperature personal-baseline floor (smallest deviation that counts) | `0.3 °C` | `src/data/indicators.json` |
| Blood pressure personal-baseline floors (smallest deviation that counts) | `6 mmHg` systolic, `5 mmHg` diastolic | `src/data/indicators.json` |
| Personal baseline window and outlier filter parameters | `5` min readings, `10` max readings, `14-day` window, `3 × MAD` spread, `3` consecutive deviations | `src/lib/baseline.ts`, `src/lib/status.ts` |
| Stale reading cutoff (readings older than this return `"unknown"`) | `48 hours` | `src/lib/status.ts` |
| Critical low heart rate escalation threshold | `40 bpm` | `src/data/indicators.json`, `src/data/cards.json` |
| Fever critical escalation threshold | `38.5 °C` | `src/data/indicators.json`, `src/data/cards.json` |
| High blood glucose critical escalation threshold | `250 mg/dL` | `src/data/indicators.json`, `src/data/cards.json` |
| Mood ratings flagged for review | `1 or 2` on the `1 to 5` scale | `src/data/indicators.json` |
| Short sleep escalation threshold | Less than `4 hours` on two or more consecutive duty cycles | `src/data/cards.json` |
| Feel vs. data mismatch cut-offs | Self-rating `4–5` with any amber/red status, or self-rating `1–2` with all green statuses | `src/lib/feelVsData.ts` |
| Check-in due reminder threshold and combined sleep/mood review rule | `24 hours` since last check-in; short sleep + low mood on the same day | `src/lib/checkInDue.ts` |
| Typo-catching input validation bounds (not medical limits) | `heartRate: 20–250 bpm`, `systolic: 40–300 mmHg`, `diastolic: 20–200 mmHg`, `bloodGlucose: 20–600 mg/dL`, `bodyTemperature: 25–45 °C`, `sleepDuration: 0–24 h`, `mood: 1–5 integer` | `src/lib/validate.ts` |
| Fever scenario: base `37.4 ± 0.1 °C` for 30 healthy days, then a rise of `0.15 °C` per day for 10 days, Mars transit days 173 to 212 | see file | `scripts/scenarios/fever.json` |
| Other alert scenarios: single odd reading, sudden spike, sleep debt, falling mood | see files | `scripts/scenarios/typo.json`, `spike.json`, `sleepDebt.json`, `moodDrop.json` |
| Fever sensitivity grid: noise `0.05, 0.1, 0.2, 0.3 °C` × rise `0.05, 0.1, 0.15, 0.2, 0.3 °C` per day, 100 seeds each | see file | `scripts/scenarios/sensitivity.json` |

## Clinical sanity check

ARGUS is an engineering prototype on simulated data, not a medical device. All reference intervals, spaceflight adjustments (Stahn et al. 2017; Norsk et al. 2015), and microgravity CPR steps (Hinkelbein et al. 2020) are traced in the table above so a clinician, flight surgeon, or medical student can audit every threshold and demo parameter in under 30 minutes.
