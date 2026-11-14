# Design ideas for the frontend team

Suggestions, not requirements, except the section marked "Rules". The user is an astronaut who is not a doctor, may be tired or frightened, and has nobody to ask for 20 minutes. Design for that person.

## The feel

- **Calm mission console.** Dark background, a few strong colours, lots of space. Dark suits a spacecraft cabin and makes status colours stand out.
- **Colour means status and nothing else.** If green, amber and red are also used for decoration, they stop carrying meaning. Use one neutral accent (a blue or teal) for buttons and links.
- **Plain words.** "Above the usual range" beats "elevated". Every number shows its unit.
- **No fake sci-fi clutter.** No scan lines, no random hex codes, no spinning globes. Judges notice a clear screen more than a busy one.

## Rules (these come from the plan)

- Status is always a word, an icon and a colour together. About 1 in 12 men cannot tell red from green.
- Four statuses, never three. "Unknown" is grey with a question mark, and looks different from green.
- Never write "healthy", "safe" or "normal". Green says "No checks fired".
- Simulated data always carries a "Simulated" tag. Adjusted ranges carry "Adjusted for environment".
- Red is only for the critical limit. Do not use red for errors in forms or for delete buttons.

## Colour tokens

Define these once in `src/app/globals.css` and use them everywhere, so a colour change is one edit. Pick the exact shades yourselves and check that text on them is readable.

| Token | Use |
|---|---|
| `--status-green`, `--status-amber`, `--status-red`, `--status-unknown` | Status badges, chart markers, body figure regions |
| `--surface`, `--surface-raised` | Page background, cards |
| `--text`, `--text-muted` | Main text, labels |
| `--accent` | Buttons, links, focus rings |
| `--emergency` | The emergency button and emergency screens only |

## Screen by screen

### Dashboard
- A header strip that is always visible: mission day, environment, and the emergency button. The environment is a switch, because changing it is the best moment in the demo.
- Body figure on the left, list of the six indicators on the right. On a phone, list first.
- The figure is a way to navigate, not an anatomy lesson. Heart rate and blood pressure sit on the chest and arm, temperature on the forehead; sleep, mood and glucose have no organ, so give them icons beside the figure. The list must do everything the figure does.
- Each row: icon, name, latest value with unit, status badge, how long ago.
- Empty state for a new user: "No readings yet. Start your first check-in." with one button.

### Check-in
- One indicator per step, with a progress line ("3 of 6"). It feels shorter than one long form and leaves room for "how to measure" help beside each input.
- Large inputs with the unit shown inside the field. Number keypad on phones (`inputMode="decimal"`).
- Context as two or three large buttons (Resting / Exercise / Not sure), not a dropdown.
- The "how do you feel" rating as five faces or five large numbered buttons.
- Errors appear under the field in plain words, in the accent colour, not red.
- Allow skipping a reading. A skipped reading shows as "Unknown" later, which is honest.

### Results
- Six badges at the top, then the reasons as short sentences.
- The feel vs. data message in a neutral box. It must not look like a warning or an accusation.
- If anything is red, the escalation card comes first, above everything else.

### Indicator
- Chart at the top: readings as dots joined by a line, the reference range as a pale band, the baseline as a second, narrower band. Mark amber and red points with their status colour and a different shape.
- When there are fewer than 5 readings, say so on the chart: "Baseline available after 5 readings (you have 3)."
- The five card sections as an accordion with "How to measure" open by default. Show each source as a small link under its section.

### Emergency
- Reachable in one press from every screen. Consider a full-width bar on phones.
- One question per screen, in very large type. Two buttons, YES and NO, each at least a thumb wide, far enough apart that they cannot be pressed by mistake.
- No scrolling on a step. If the text does not fit, split the step.
- For compressions, a large pulsing circle at the published rate with a count. Add sound only if it can be muted.
- A "Back one step" button, and the step label ("Published" or "Demo copy") small at the bottom.
- High contrast, no animation except the pulse.

### Escalation card
- Three parts, in this order: what to do now, who to notify, and the simulated one-way signal delay.
- Show the delay as a plain sentence: "A message takes about 12 minutes to reach Earth (simulated)." Never suggest waiting for a reply before acting.

## Smaller things worth doing

- **Tabular numbers** for readings (`font-variant-numeric: tabular-nums`) so digits line up.
- **Keyboard and focus.** Every clickable thing is a real `<button>` or `<a>`, with a visible focus ring. The body figure regions need labels a screen reader can read.
- **Reduced motion.** Respect the system setting; turn off the pulse animation and show the count instead.
- **Touch targets** at least 44 px, more in emergency mode.
- **Loading and empty states** for every screen. Storage loads a moment after the page, so the first paint has no data.
- **Points and streaks**, if you reach them, reward completing a check-in, never good values. Nobody should be nudged to type a nicer number.

## For the demo

Design the 30-second path first and make it flawless before anything else:

1. Dashboard on Mars transit, mission day 212, all six statuses visible.
2. Open body temperature. Switch the environment to Earth and back, and watch the reference band and the status change.
3. Press the emergency button and walk three steps.

Record a backup video of this path once it works.
