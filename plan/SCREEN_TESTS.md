# Screen tests

Screens are tested by a teammate clicking through them (`CODING_STANDARDS.md`). Run this list before a pull request that touches a screen, and before the demo. Tick each box, then sign the table at the bottom.

**Setup:** `npm run dev`, open http://localhost:3000 in a private window (empty storage), screen at least 1280 px wide.

## 1. Dashboard (`/`)

- [ ] The page loads with data: the demo profile loads by itself into empty storage. No empty dashboard.
- [ ] All six indicators show a value, a status word and a status colour together. On the demo profile, statuses match what `tests/seed.test.ts` expects.
- [ ] "SIMULATED DATA" tag is visible.
- [ ] "Load demo profile" clears saved readings and reloads the demo profile.
- [ ] "Handover report" opens `/handover`.
- [ ] Keyboard: Tab to a row, press **Enter**, then go back and press **Space**. Both open that indicator.
- [ ] Hovering heart rate, temperature or blood pressure lights up the site on the 3D figure.
- [ ] Footer shows "ON-BOARD STORAGE · WORKS OFFLINE (0 EARTH LINK)".

## 2. Check-in (`/check-in`)

- [ ] Each step accepts a typed value; **Enter** logs it.
- [ ] Bad input is refused with a message: `1e2`, `0x10`, an empty box, a value outside the typo bounds, a mood of `3.5`.
- [ ] Skip works on every step except the self-rating.
- [ ] The results page shows each reading's status; Save goes back to the dashboard.
- [ ] Refresh the page: the saved reading is still there.
- [ ] **Baseline alert:** do three check-ins in a row with body temperature `37.9` (Forehead). The third shows body temperature amber, "outside the personal baseline".
- [ ] **Storage error:** in DevTools Console run `localStorage.setItem = () => { throw new Error() }`, then try to save a check-in. An amber banner explains it; the entries stay on screen; nothing crashes. Refresh to undo.

## 3. Device import (on `/check-in`)

- [ ] "Load sample sensor packet" imports 5 readings and lists them as "Device import".
- [ ] Pressing it again imports 0 and lists 5 rows as already stored.
- [ ] "Download sample CSV" downloads `argus-sample-device-packet.csv`.
- [ ] Edit that CSV (change a time, put `1e2` in one value), import it with "Import device file". Good rows import; the bad row is listed with its row number and reason.
- [ ] A `.json` file with `[{"timestamp":"2026-11-14T21:00:00Z","indicator":"heartRate","value":70}]` imports one reading.
- [ ] A broken file shows "not valid JSON or CSV", with no crash.

## 4. Indicator detail (`/indicator/heartRate`)

- [ ] Dropdown: opens on click; **arrow keys** move, **Enter** picks, **Escape** closes.
- [ ] Strip chart: Tab to it, **arrow keys** move the cursor, **Escape** clears it.
- [ ] Reference card shows the range with its source, or "demo parameter".
- [ ] Switching the environment in the header changes the adjusted range for temperature.

## 5. Emergency (`/emergency`)

- [ ] The red EMERGENCY button in the header opens it from every screen.
- [ ] **Y** and **N** keys answer; DONE / UNABLE on instruction steps.
- [ ] Path "unresponsive → not breathing" reaches the compressions step: it shows the weightlessness-only note and the elapsed time, and no compression rate, depth or ratio.
- [ ] Every step shows its label ("Published" or "Demo copy").
- [ ] "Back one step" works; the step log lists every answer with a UTC time.
- [ ] No medication or dosing advice anywhere.

## 6. Alert test (`/alerts`)

- [ ] The headline table lists all five scenarios × three methods, with the frozen-seed number and the 100-seed mean / worst under it.
- [ ] The numbers match `results/summary.md`.
- [ ] The scenario switcher changes the trace chart for Slow-onset fever, Single odd reading, Sudden spike, Creeping sleep debt and Falling mood.
- [ ] Sleep and mood traces show the lower limit line.

## 7. Handover report (`/handover`)

- [ ] Shows mission day, environment, and one-way and round-trip delay (Mars transit: 12 min / 24 min).
- [ ] The 7-day table has a value for each indicator on each demo day.
- [ ] After the three 37.9 °C check-ins from section 2, the amber results appear under "Alerts in this window", each with its reason and baseline. Unknown results (for example an exercise heart rate) are listed there too.
- [ ] Self-ratings list the check-ins; a "feel good" rating next to an amber result shows the feel-vs-data message.
- [ ] "Print / Save PDF" opens the print dialog; the preview shows only the report (no header, tabs or buttons).
- [ ] "Copy ground telemetry packet" copies JSON that starts with `"kind": "ARGUS handover packet (simulated data)"`.

## 8. Demo path (the pitch, in order)

- [ ] Private window → dashboard loads the demo profile.
- [ ] Switch environment Earth → Mars transit: temperature goes amber → green (adjusted range).
- [ ] Check-in with a temperature of 37.9, three times → amber baseline alert.
- [ ] Device import → "Load sample sensor packet".
- [ ] Handover report → Copy ground telemetry packet.
- [ ] Alert test → headline table, then the fever trace.
- [ ] Emergency → unresponsive → not breathing → compressions step.

## 9. Offline

- [ ] Load the app, then DevTools → Network → **Offline**. Every screen, check-in and import still works.
- [ ] Note: a full reload while offline only works if the app is served from the same machine (on board). That is the claim the footer makes.

## Sign-off

| Date | Tester | Sections passed | Problems found |
|---|---|---|---|
| | | | |
