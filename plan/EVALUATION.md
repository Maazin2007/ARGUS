# Alert test: protocol and results

This document describes how ARGUS's alert test is designed, what we predicted before running it, what came out, and what the test cannot show. It is the one place to read before quoting a number from `results/`.

> This is a software test of the status rules on simulated data. It is not clinical validation, and every scenario value is a demo parameter chosen by the team.

## 1. The question

When an astronaut's readings are checked in flight, do space-adjusted ranges and a personal baseline give **fewer false alerts** and **earlier warnings** than plain Earth ranges, without delaying the critical alert?

## 2. What is tested

The test calls the same `getStatus` function the dashboard uses (`src/lib/status.ts`), with the same rules (`src/data/indicators.json`). Nothing is copied or re-implemented for the test. The three methods differ only in what `getStatus` is given:

| Method | Environment passed in | Earlier readings passed in | What it represents |
|---|---|---|---|
| Earth range only | `earth` | none | A monitor that uses ground reference ranges in flight |
| Adjusted range | the scenario's environment (Mars transit) | none | Ranges shifted for spaceflight and mission day |
| Adjusted range and baseline | the scenario's environment | every earlier reading in the scenario | ARGUS as built |

Code: `statusFor` in `scripts/scenario.ts`.

How `getStatus` decides (summary of `plan/FLOW.md`, Flow 2): red if the value crosses the fixed critical limit; amber if it is outside the (adjusted) reference range; amber if it and the two readings before it are outside the personal baseline; green otherwise. The critical limit never moves.

For body temperature in Mars transit, every scenario day is past the 75-day ramp, so the adjusted upper limit is 37.2 + 1.01 = 38.21 °C (Stahn et al. 2017, see `plan/SOURCES.md`). The critical limit is 38.5 °C (demo parameter). The personal baseline is the median of the last 10 ordinary readings from the past 14 days, ± the larger of 0.3 °C (demo parameter) or three times the median absolute deviation, and needs at least 5 readings.

## 3. How the data is made

Each scenario is a JSON file in `scripts/scenarios/`. `generateScenarioReadings` in `scripts/scenario.ts` turns it into one reading per day:

```
value on a day = base + shift for that day + noise, rounded to the file's decimals
noise          = a draw spread evenly between -noise and +noise (scripts/random.ts)
```

- The random numbers come from mulberry32, a seeded generator, so the same seed always gives the same readings. `Math.random()` is never used.
- The **frozen seed** is the `seed` in the file. The **many-seed run** uses that seed and the 99 after it (100 runs per scenario, 500 in total over five scenarios).
- Every reading is dated so that it is fresh when checked ("now" is the reading's own time), so nothing turns unknown for being stale.
- The shift depends on the pattern:
  - `ramp`: from the onset day, the value moves by `risePerDay` each day. Day 0 already carries one step.
  - `step`: on the onset day, the value jumps by `stepSize` and stays there.
  - `glitch`: one reading `stepSize` away on one day; nothing is wrong, so there is no onset.

| Scenario | File | Indicator | Days | Healthy base ± noise | Problem |
|---|---|---|---|---|---|
| Slow-onset fever | `fever.json` | body temperature | 30 healthy + 10 | 37.4 ± 0.1 °C | +0.15 °C a day from mission day 203 |
| Single odd reading | `typo.json` | body temperature | 40 healthy | 37.4 ± 0.1 °C | one reading +0.5 °C on mission day 200 |
| Sudden spike | `spike.json` | body temperature | 30 healthy + 3 | 37.4 ± 0.1 °C | +1.6 °C from mission day 203 |
| Creeping sleep debt | `sleepDebt.json` | sleep | 30 healthy + 10 | 7.6 ± 0.2 h | −0.15 h a night from mission day 203 |
| Falling mood | `moodDrop.json` | mood (1–5) | 30 healthy + 10 | 4 ± 0.4 | −0.25 a day from mission day 203 |

## 4. What is measured

Days are counted from the onset day, which is day 0.

| Measure | Meaning |
|---|---|
| First amber | The first problem-period day the method said amber. "none" if it never did. |
| First red | The first problem-period day the method said red. |
| Missed | Problem-period readings the method left green. |
| False amber / false red | Healthy-period readings the method flagged. In the single-odd-reading scenario every day is healthy, so every flag is false. |
| Many-seed mean / worst | Over the 100 seeds: the average, and the worst case (the latest first alert, or the largest count). For first amber and first red, the mean counts only the seeds where that status appeared; the seeds where it never did are reported separately as "none in N of 100". |

## 5. Pre-registration: what was committed when

A prediction is only convincing if it was written down before the result was known. Git timestamps are the evidence. We list every step, including the ones that are weaker than we would like.

| When (CST, 2026) | Commit | What it contains | What it proves |
|---|---|---|---|
| 15 Nov 01:18 | `d2e484c` | Temperature adjustment moves only the upper limit | A bug fix found on the dashboard (36.8 °C was flagged low in flight), made before the test existed |
| 15 Nov 01:22 | `10e27ba` | `fever.json` with its four expectations; temperature baseline floor set to 0.3 °C | The fever scenario and expectations existed before `scripts/evaluate.ts` |
| 15 Nov 01:23 | `81983c1` | `scripts/evaluate.ts` and the first fever results | The results came after the expectations |
| 15 Nov 03:41 | `5497197` | Four more scenarios, their expectations, the 100-seed run, and their results, all in one commit | Nothing about order: expectations and results arrived together |
| 15 Nov 21:32 | `6c665d2` | `sensitivity.json`: the sensitivity grid and seven predictions | The sensitivity predictions existed before the sensitivity code (section 8) |

What we can and cannot claim:

- **Fever: pre-registered.** The scenario and its expectations were committed before the evaluation code existed, and the fever results have not changed since `81983c1` (check with `git diff 81983c1 HEAD -- results/fever.json`).
- **The baseline floor was set in the same commit that froze the fever scenario.** Before that commit the floor was empty, and the baseline could not be used for temperature. Git shows the floor came before the results, but it cannot show the value was not chosen with the expected result in mind. Treat 0.3 °C as a team choice, not a derived number. Section 8 tests how much the result depends on the noise it is compared against.
- **Odd reading, spike, sleep debt, mood: not pre-registered.** Their expectations were written before the first run, but were committed together with the results, so git cannot show the order. We report them as expectations, not as pre-registered predictions.
- **Sensitivity test: pre-registered.** See section 8.

## 6. Results

Full tables: [results/summary.md](../results/summary.md) (all scenarios) and [results/fever.md](../results/fever.md) (fever, with the status of every reading).

| Scenario | Method | First amber | First red | Missed | False alerts | 100 seeds: first amber mean / worst | 100 seeds: false alerts mean / worst |
|---|---|---|---|---|---|---|---|
| Slow-onset fever | Earth range only | 0 | 7 | 0 | 30 | 0 / 0 | 30 / 30 |
| Slow-onset fever | Adjusted range | 5 | 7 | 5 | 0 | 5.3 / 6 | 0 / 0 |
| Slow-onset fever | Adjusted range and baseline | 3 | 7 | 3 | 0 | 3.84 / 5 | 0 / 0 |
| Single odd reading | Earth range only | none | none | 0 | 40 | none | 40 / 40 |
| Single odd reading | Adjusted range | none | none | 0 | 0 | none | 0 / 0 |
| Single odd reading | Adjusted range and baseline | none | none | 0 | 0 | none | 0 / 0 |
| Sudden spike | all three | none | 0 | 0 | 30 (Earth), 0 (others) | none | 30 / 30 (Earth), 0 / 0 (others) |
| Creeping sleep debt | all three | 5 | none | 5 | 0 | 3.78 / 5 | 0 / 0 |
| Falling mood | all three | 5 | none | 5 | 0 | 5.27 / 7 | 0 / 0 |

First red on the fever is 7.27 / 8 (mean / worst) for all three methods.

### Expected vs. observed

| Scenario | Expectation (from the scenario file) | Observed | Met? |
|---|---|---|---|
| Fever | Earth range: amber on most healthy days | 30 of 30, every seed | Yes |
| Fever | Adjusted range: no false alerts; first amber about 5 days after onset | 0 false; day 5 (mean 5.3) | Yes |
| Fever | Baseline: no false alerts; first amber earlier than adjusted range | 0 false; day 3 (mean 3.84, worst 5 vs. 6) | Yes |
| Fever | Same red day for all three | day 7 for all (mean 7.27) | Yes |
| Odd reading | Earth range: amber on most days | 40 of 40 | Yes |
| Odd reading | Adjusted range and baseline: no false alerts; no red | 0 in every seed | Yes |
| Spike | Red on day 0 for all; nothing missed; Earth false amber only | as expected | Yes |
| Sleep debt | Same for all three; first amber about 4 days after onset; no red; no false alerts | same for all; day 5 on the frozen seed, mean 3.78 | Partly: the frozen seed was one day later than expected |
| Mood | Same for all three; first amber 5 to 6 days after onset; no red; no false alerts | same for all; day 5, mean 5.27, worst 7 | Yes on the frozen seed; the worst seed was later than expected |

### What the results mean

- **Adjusted ranges remove the false alerts, if the in-flight rise is real.** The healthy base of 37.4 °C sits above the Earth upper limit of 37.2 °C by construction, because spaceflight raises core temperature (Stahn et al. 2017). So the 30 Earth false alerts are a consequence of that assumption, not a discovery. What the test does show is that the adjusted range and the baseline remove them **without** delaying the red alert.
- **The baseline buys earlier warning.** On the fever it warns about two days before the adjusted range alone, while ignoring a single odd reading in every seed.
- **The fixed critical limit works as designed.** No method changes the red day.
- **Sleep and mood do not compare the methods.** They have no spaceflight adjustment and no baseline in our rules, so all three methods are the same function call. They only check that the reference ranges fire. Only three of the five scenarios (fever, odd reading, spike) test the comparison.

## 7. Limits of this test

- **Simulated data only.** No real astronaut data was used. The healthy base, noise and fever shape are team choices.
- **Simple noise.** Each day's noise is independent and spread evenly. Real sensors drift, have outliers and correlated error.
- **Perfect compliance.** One reading every day, no missed days, no duplicates. In the app, missed days make readings stale (unknown).
- **One indicator at a time.** Combined checks (such as sleep with mood) are not tested here.
- **100 seeds vary only the noise draw.** They show the frozen-seed table was not luck. They do not vary the noise size, the fever speed or the base. Section 8 covers the first two.
- **Mean first alert is over the seeds where the alert fired.** If a method rarely fires, its mean can look good. The "none in N of 100" count must be read beside it.
- **Seeds are consecutive** (the frozen seed and the 99 after it), not drawn at random.

## 8. Sensitivity test (pre-registered)

The 100-seed run repeats one setting. This test asks whether the fever result holds when the setting changes.

- **Design:** `scripts/scenarios/sensitivity.json`. The fever scenario is rerun with noise of 0.05, 0.1, 0.2 and 0.3 °C and a rise of 0.05, 0.1, 0.15, 0.2 and 0.3 °C a day. That makes 20 grid points with 100 seeds each, 2,000 runs. Everything else is as in `fever.json`.
- **Pre-registration:** the grid and seven predictions (P1 to P7) were committed in `6c665d2`, before any sensitivity code existed. They will not be changed after seeing the results.
- **Results:** added in the commit after this one, with each prediction marked as met or not met.

## 9. How the results are protected

- `tests/evaluate.test.ts` reruns every scenario and fails if the committed results in `results/` no longer match the current status engine. Changing a rule without rerunning the evaluation breaks CI.
- `results/*.md` and `results/*.json` are generated. They must never be edited by hand.

## 10. How to reproduce

```
npm install
npm run evaluate     # rewrites results/fever.*, results/summary.*
npm test             # checks the committed results match
git status           # no changes means you got the same numbers we did
```

## 11. Rules for changing the test

1. A new scenario or prediction is committed on its own, before the code or results that answer it.
2. Never change a scenario, a prediction or a rule after seeing results without writing it in section 5 of this file.
3. A prediction that fails stays in the table, marked "No".
4. Quote numbers only from `results/`, and always with "simulated" and "not clinical validation".
