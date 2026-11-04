# botboard — design spec v2

Mock: `design/mock.html` (built from `mock.template.html` + `tokens.css` + `../data/usage.json` via `node design/build.mjs`) → `mock-mobile.png` (390w, also `mock-mobile@2x.png`) and `mock-desktop.png` (1440w).
Every number on the page comes from `data/usage.json` or is derived from it (derivations are listed in §6).

---

## 1. Goals: three questions, in this order

| # | Question | Answer on the page | Source |
|---|---|---|---|
| 01 | How much is left this week, and when does it reset? | **15.9%** big (amber, because it's under 20%), countdown chip **19h 33m** (counts down live), reset at **Thu 1:58 PM ET**, plus a capacity bar: Grok Bot 34.5 / other apps 49.6 / left 15.9 | `weekly.limitUsedPct`, `grokBotUsedPct`, `resetsAt`, `snapshotAt` |
| 02 | How much did my bots use? | Week: stacked columns per day, split by bot. 30d: ranked bars by bot | `weekly.byDayBot[]`, `last30.byBotActivity[].total` |
| 03 | Where and why did it go? | 30d activity mix bar (≈66 group chats), daily 30d columns with the **70% · Oct 10** spike called out, and a bot × activity heat matrix | `last30.byBotActivity[].activity`, `last30.byDayActivity[]`, `last30.byRoutine[]` |

Principles: dark, futuristic, clean, one page, almost no words, mobile-first (390). Numbers go in Geist Mono. Accent cyan means **Grok Bot**. Amber means **running low**. Nothing else gets to glow.

---

## 2. Palette & tokens

The full block is in `design/tokens.css`, ready to paste. Contrast is measured against `--surface #0C1118`.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--bg` | `#06090E` | page; add the radial `--bg-glow` at the top only | — |
| `--surface` | `#0C1118` | cards | — |
| `--surface-2` | `#121924` | tracks, empty matrix cells, chips, toggle | — |
| `--border` | `#1C2531` | 1px card border, chart baseline | — |
| `--text` | `#EAF2FB` | values, bot names | 16.8 |
| `--text-muted` | `#8D9AAE` | labels, ticks, legends | 6.6 |
| `--text-dim` | `#5F6B7D` | **non-text only**: empty-day stubs, `·` zero cells, month sub-ticks | 3.5 |
| `--grok` (accent) | `#2EE6FF` | Grok Bot's share of the weekly limit, section numerals, focus ring | 12.5 |
| `--other` | `#506483` | other apps' share of the weekly limit | 3.2 |
| `--left` | `#DCE7F3` | left segment outline + number when left ≥ 20% | — |
| `--left-fill` | `#141C27` | left segment hatched fill | — |
| `--warn` | `#FFB547` | replaces `--left` when left < 20% **(current state: 15.9%)** | 10.8 |
| `--crit` | `#FF5D5D` | replaces `--left` when left < 5% | — |

**Bot map** (stable and keyed by exact name; anything not in the map falls back to `--bot-unknown #7A8699`):

| Bot | Token | Hex |
|---|---|---|
| Retired bots & group chats | `--bot-retired` | `#66707F` (desaturated grey) |
| Chief of Staff | `--bot-chief-of-staff` | `#4D8DFF` |
| Head of Engineering | `--bot-head-of-engineering` | `#9D7BFF` |
| App Builder | `--bot-app-builder` | `#2FD9A0` |
| Data Engineer | `--bot-data-engineer` | `#FF7AB6` |
| Fleet Architect | `--bot-fleet-architect` | `#C6E26A` |

Bot hues deliberately avoid cyan and amber, so they can't be mistaken for "Grok Bot vs other apps" or for the warning colour.

**Activity map:** one cyan-family ramp. All of it is Grok Bot usage, so it stays in the accent's family. These colours are never used for bots.

| Activity | Token | Hex |
|---|---|---|
| Group chats | `--act-group-chats` | `#2EE6FF` |
| Bot-to-bot | `--act-bot-to-bot` | `#1E93AD` |
| Chats with you | `--act-chats-with-you` | `#E6FAFF` |
| Routines | `--act-routines` | `#6F8794` |

**Heat matrix:** a cell's background is `rgba(var(--heat-rgb), α)` with `α = 0.10 + 0.75·√(v / max cell)`. When α > 0.55, the text switches to `#06090E` at weight 600.

---

## 3. Type scale

- **Sans:** `Geist` → `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`. Load it with `next/font/google` (`Geist`, `Geist_Mono`).
- **Mono:** `Geist Mono` → `ui-monospace, SF Mono, Menlo, Consolas`. Use it for **every number**, with `font-variant-numeric: tabular-nums`.

| Role | Size / line-height / weight | Notes |
|---|---|---|
| Hero number | 64/0.9/600 mobile · 88 desktop | mono, letter-spacing −0.04em; the `%` is 0.42em |
| Stat value | 20/1.1/500 | capacity legend values |
| Countdown chip | 16/1/600 | mono |
| Body / bot names | 13/1.4/400 | sans |
| Section label | 11/1.2/500 | uppercase, tracking .14em, `--text-muted`; numeral `01/02/03` in `--grok` mono |
| Bar value label | 12/1.2/500–600 | mono |
| Micro (legend, ticks, footer) | 11 | **minimum 11px**; month sub-tick is 9.5px `--text-dim` (decorative) |

---

## 4. Spacing & sizing

- 4px base grid: `4 8 12 16 20 24 32 40`.
- Page padding 16 (desktop 32). Card padding 16 (desktop 24). Grid gap 12 (desktop 20). Max width 1200.
- Card: radius 16, 1px `--border`, flat `--surface` (no gradient, no shadow). Bars: radius 4; capacity and mix bars radius 6; chips are pills.
- Touch targets ≥ 44px: the countdown chip, header chips (tap area), matrix rows (32px cell + 3px spacing, with a 44px row hit area), and the tooltip trigger area per column.
- Chart heights:

| Chart | Mobile | Desktop |
|---|---|---|
| Capacity bar | 20 | 24 |
| Week columns | 168 | 220 |
| 30d daily columns | 128 | 180 |
| Rank bar | 10 | 10 |
| Activity mix bar | 28 | 28 |

---

## 5. Components

| Component | Purpose | Props → usage.json | States |
|---|---|---|---|
| `Header` | Wordmark, plan, snapshot time | `plan` → "PREMIUM" chip; `snapshotAt` → "Nov 4, 6:25 PM ET" chip | Hide the plan chip if `plan` is missing |
| `HeroLimit` | Q1 | `limitUsedPct`, `grokBotUsedPct`, `resetsAt`; derived `other = used − grok`, `left = 100 − used` | left ≥20 `--left`; <20 `--warn` (current); <5 `--crit`; past reset → chip reads "reset", greyed |
| `CountdownChip` | Live time until reset | `resetsAt` | Show "Xh YYm" (plus "Nd" when ≥ 24h); before hydration, render it from `snapshotAt` so SSR isn't empty; no seconds (avoids jitter) |
| `CapacityBar` | Grok / other / left in one bar | the three values above; segments sized with `flex: value` | Grok segment glows; left segment is hatched and outlined in the threshold colour; 3-col legend underneath with big mono values |
| `WeekByBot` | Q2 week | `weekly.byDayBot[]` → 7 slots built from the `weekly.window` dates (Oct 29 → Nov 4) | Days missing from the data render a 12×2 `--text-dim` stub with no number (not "0"); total above each column; legend lists only bots present this week |
| `BotRank30d` | Q2 30d | `last30.byBotActivity[]` → `bot`, `total` | Bar width = total / max; `0.5 + lt1` → label "<1%" and a 4px min-width bar |
| `ActivityMix` | Q3 overall | Derived: Σ `byBotActivity[].activity[a]` | Inline "≈NN" label only if the segment is ≥ 20%; otherwise the value goes in the legend |
| `Daily30d` | Q3 over time | `last30.byDayActivity[]` → 31 slots Oct 5 → Nov 4 | Stacked by activity; min 2px for tiny days; the max day is annotated "70% Oct 10"; empty days show nothing |
| `BotActivityMatrix` | Q3 why, per bot | `byBotActivity[].activity` (rows ordered by total) | Value in cell; absent → `·` in `--text-dim`; 0.5 → "<1" |
| `RoutineLine` | Q3 footnote | `last30.byRoutine[]` minus "Not from a routine" | "unitedstats build watch **1%** · paused", "Built-in check-ins **<1%**" |
| `Tooltip` (charts) | Exact values on tap | Bar's payload | Surface `#0C1118` at 96%, 1px `--border-strong`, radius 10, padding 8×10, mono values, swatch and name per row, hide zero rows; tap anywhere to dismiss |

**`<1` rule (global):** any value stored as `0.5` (with `lt1:true` where present) is printed as `<1` (`<1%` in rank lists). Never print "0.5".

---

## 6. Layout

### Mobile (390), top → bottom
1. Header, 44px tall: `botboard.` · PREMIUM chip · spacer · snapshot chip.
2. **01 Left this week** (label right: "shared limit"): big 15.9% on the left, with "84.1% used" under it; countdown chip on the right, with "Thu 1:58 PM ET" under it. Capacity bar below, then the 3-col legend.
3. **02 Bots · week** (right: "Oct 29 – Nov 4"): stacked columns, then the legend (2 rows; "Retired bots & group chats" is shortened to "Retired & group" in the legend and matrix only).
4. **02 Bots · 30d** (right: "Oct 5 – Nov 4"): 6 ranked rows.
5. **03 Where · 30d** (right: "≈ share"): mix bar, then 2×2 legend with values, then sub-label "Daily", then the daily columns.
6. **03 Bot × activity** (right: "30d"): matrix, then the routine line.
7. Footer (1 line): "% = share of Grok Bot usage · <1 = under 1%".

### Desktop (≥1024): 12-col grid, max 1200
- Row 1: **Hero** full width (span 12), laid out as 3 columns: big number | capacity bar + legend (flex 1) | countdown chip + reset time.
- Row 2: **Week** span 7 · **Bots 30d** span 5.
- Row 3: **Where 30d** (mix + daily) span 7 · **Bot × activity** span 5.
- Between 640 and 1023: single column, but use the desktop chart heights.

---

## 7. Chart type per metric (Recharts 2.15)

Global rules: no `CartesianGrid`, no Y axis (values sit on the bars), X axis with `axisLine={false}`, `tickLine={false}`, ticks 11px mono `--text-muted`, a 1px `--border` baseline via `ReferenceLine y={0}`, `isAnimationActive={false}` (or one 400ms ease-out on mount), and cursor `{ fill: 'rgba(46,230,255,.05)' }`.

| Metric | Chart | Recharts | Styling |
|---|---|---|---|
| Weekly limit split | Single stacked capacity bar | **Plain divs/SVG, not Recharts** | 3 flex segments, 2px gaps; Grok `box-shadow 0 0 16px --grok-glow`; left uses `repeating-linear-gradient(135deg, --left-fill 0 4px, #1b2532 4px 6px)` + `inset 0 0 0 1.5px` threshold colour |
| Week by day × bot | Stacked columns, 7 slots | `BarChart` + one `<Bar stackId="w">` per bot, `maxBarSize={40}`, `barCategoryGap="44%"` | Stack order bottom → top follows `byBotActivity` order (Retired at the bottom); radius `[4,4,0,0]` on the top segment only (use a custom `shape` or put the radius on the last present key per row); 1px separator via `stroke="var(--surface)" strokeWidth={1}`; `LabelList` total above (12px mono 600 `--text`); X tick = day-of-month, plus month sub-tick under 29 and 1 |
| 30d by bot | Ranked horizontal bars | **Plain divs** (a better fit than Recharts at this size) | Row: swatch + name … value; 10px bar on a `--surface-2` track |
| 30d activity mix | 100% stacked bar | Plain divs | Inline "≈66", "≈27"; legend has all 4 values |
| 30d by day × activity | Stacked columns, 31 slots | `BarChart`, `<Bar stackId="m">` per activity, `barCategoryGap="38%"` | Ticks on Oct 5/12/19/26, Nov 2 (first tick `textAnchor="start"`); spike annotation via `ReferenceDot`/custom label on the max-total day, to the right of the bar top: "**70%** Oct 10" |
| Bot × activity | Heat matrix | CSS grid / table (no Recharts) | See the heat formula in §2 |

Tooltip: custom `content` component as in §5. Don't use the Recharts `Legend`; use the custom chip legend.

---

## 8. Copy budget (the only words on the page)

`botboard.` · `PREMIUM` · snapshot time · `01 Left this week` · `shared limit` · `used` · `Grok Bot` · `Other apps` · `Left` · reset weekday/time + `ET` · `02 Bots · week` · `02 Bots · 30d` · `03 Where · 30d` · `≈ share` · `Daily` · `03 Bot × activity` · column heads `Group` `B↔B` `You` `Rout.` · bot names · activity names · `Routines:` + routine names + `paused` · footer line. Nothing else: no sentences, no explanations.

---

## 9. Accessibility

- Text contrast ≥ 4.5:1: `--text` 16.8, `--text-muted` 6.6. `--text-dim` (3.5) is **never used for text that carries meaning**. Graphical segments are ≥ 3:1 (other apps 3.2, retired 3.8).
- Never colour alone:
  - Every chart has its values printed (labels on bars and the matrix, values in the legends).
  - The "left" segment is hatched as well as coloured.
  - Low state = amber **plus** the number.
  - Legend order matches stack order.
- SVG charts get `role="img"` and an `aria-label` summary (for example "This week by day: Oct 29 23%, Oct 30 58%, Nov 4 19%").
- The hero is a `<section aria-label="Weekly limit">`. The countdown has `aria-live="off"`; its text is updated each minute (not per second).
- `prefers-reduced-motion`: no glow pulse, no mount animation. Visible focus ring: 2px `--grok`, 2px offset.
- Tap targets ≥ 44px; matrix and rank rows are at least 32px tall, with padding up to 44.

---

## 10. Implementation notes for App Builder

- **Files likely touched:**
  - `app/globals.css`: replace `:root` with `design/tokens.css` and restyle the classes.
  - `app/layout.tsx`: add `next/font/google` Geist + Geist_Mono and set `--font-sans`/`--font-mono`.
  - `lib.ts`: update `BOT_COLORS`/`ACT_COLORS` to read the token values (or `var(--bot-…)` strings); `fmt` 0.5 → "<1"; keep `weekSeries`, `monthSeries`, `activityMix`.
  - `components/Dashboard.tsx`: split it into the components in §5. Replace `Gauge` with `CapacityBar` and the 4-box countdown with `CountdownChip` (h/m only). Drop `CartesianGrid`/`YAxis`. Add `BotActivityMatrix`. Move the routine list to a single footnote line.
- **No schema changes.** Read `data/usage.json` as is.
- **Derived values (the only computed numbers):**
  - other = 84.1 − 34.5 = 49.6; left = 15.9.
  - Countdown = `resetsAt − now` (19h 33m at snapshot time).
  - Activity mix = Σ per-bot activity: Group 65.5 → ≈66, Bot-to-bot 26.5 → ≈27, Chats with you 7.5 → ≈8, Routines 3. This sums to ≈104 because each "<1" is stored as 0.5, which is why the labels carry `≈`.
  - Spike = the max of `byDayActivity.total`.
- The week series must fill all 7 days of the window. Days absent from `byDayBot` (Oct 31–Nov 3) show the empty stub, not a "0" label.
- Threshold logic: `left < 20 → warn`, `left < 5 → crit`, applied to the big number, the left legend value, and the left segment outline.
- Don't hardcode bot names into the chart order. Order comes from `byBotActivity` (desc total), then any week-only bots; unknown bots fall back to `--bot-unknown`.

## 11. What the data can't support (not designed)

- **Week by day by activity:** the week only has the bot split. **30d by day by bot:** 30d by-day only has the activity split. So there's no Week/30d toggle on one chart; the page shows two honest views side by side.
- **Earlier weeks' % of limit**, **token counts**, **usage by project/model**, **Cursor/Cloud Agent usage**: all listed in `notAvailable`.
- **Converting weekly by-day shares into % of the weekly limit** would be a derivation the data doesn't state, so the week columns stay as shares of Grok Bot's week (23/58/19).
- **Activity totals disagree slightly between sources:** Σ by bot gives ≈66/27/8/3, Σ by day gives ≈67/29/9/6, both because of `<1` rounding. Use the by-bot sum (as now). `byRoutine` (1 + <1 + 99) is a third view of routines; it's shown only as the footnote line.
