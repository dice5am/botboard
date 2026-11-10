import raw from './data/usage.json';

// Loose types so nightly rewrites (new bots/days/activities, missing optional fields) still compile.
type Num = Record<string, number>;
export type Usage = {
  snapshotAt: string; plan?: string;
  weekly: { limitUsedPct: number; grokBotUsedPct: number; resetsAt: string; window?: string; byDayBot: { day: string; total: number; bots: Num }[] };
  last30: { window?: string; byBotActivity: { bot: string; total: number; activity: Num; lt1?: boolean }[];
    byDayActivity: { day: string; total: number; activity: Num }[]; byRoutine?: { routine: string; share: number; status?: string; lt1?: boolean }[] };
};
export const data = raw as unknown as Usage;

export type Win = '7d' | '30d';

// Hex mirrors of design/tokens.css (SVG fill attributes can't read CSS vars).
export const T = { grok: '#2EE6FF', text: '#EAF2FB', muted: '#8D9AAE', dim: '#5F6B7D', border: '#1C2531', surface: '#0C1118', unknown: '#7A8699' };
const BOT_HEX: Record<string, string> = {
  // Matches each bot's avatar colour in the Grok Bot app.
  'Retired bots & group chats': '#3E4552',
  'Chief of Staff': '#FFFFFF',
  'Head of Engineering': '#1084FE',
  'App Builder': '#9159FE',
  'Data Engineer': '#FF309B',
  'Fleet Architect': '#8A8A8A',
  'Designer': '#FF9800',
  'Equity Pulse': '#00C972',
};
export const botColor = (b: string) => BOT_HEX[b] ?? T.unknown;
export const shortBot = (b: string) => (b === 'Retired bots & group chats' ? 'Retired & group' : b);

const KNOWN_ACTS = ['Group chats', 'Bot-to-bot', 'Chats with you', 'Routines'];
const ACT_HEX: Record<string, string> = { 'Group chats': '#2EE6FF', 'Bot-to-bot': '#1E93AD', 'Chats with you': '#E6FAFF', 'Routines': '#6F8794' };
export const actColor = (a: string) => ACT_HEX[a] ?? T.unknown;
export const ACT_HEAD: Record<string, string> = { 'Group chats': 'Group', 'Bot-to-bot': 'B↔B', 'Chats with you': 'You', 'Routines': 'Rout.' };

const seenActs = [...data.last30.byBotActivity.flatMap(b => Object.keys(b.activity)), ...data.last30.byDayActivity.flatMap(d => Object.keys(d.activity))];
export const ACTIVITIES = [...KNOWN_ACTS.filter(a => seenActs.includes(a)), ...seenActs.filter((a, i) => !KNOWN_ACTS.includes(a) && seenActs.indexOf(a) === i)];

/** 0.5 is the stored stand-in for "<1". Derived (approx) values skip that rule and are prefixed ≈. */
export const isLt1 = (v: number) => v === 0.5;
export const fmt = (v: number | undefined | null, approx = false) => {
  if (v == null) return '—';
  if (!approx && isLt1(v)) return '<1';
  const n = String(+v.toFixed(1));
  return approx ? `≈${n}` : n;
};
export const fmtPct = (v: number | undefined | null, approx = false) => {
  const s = fmt(v, approx);
  return s === '—' ? s : `${s}%`;
};
export const round1 = (v: number) => Math.round(v * 10) / 10;

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TZ = 'America/Toronto';
export const snapLabel = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET';
export const resetLabel = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' ET';

const etYmd = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ });
/** Whole ET calendar days from `now` to weekly.resetsAt (Thu 1:58 PM ET this cycle). */
export const daysUntilReset = (now: number) => {
  const a = etYmd(now), b = etYmd(new Date(data.weekly.resetsAt).getTime());
  const ms = Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z');
  return Math.max(0, Math.round(ms / 86400000));
};
export const resetsInLabel = (now: number) => {
  const d = daysUntilReset(now);
  if (d <= 0) return null;
  return d === 1 ? 'resets in 1 day' : `resets in ${d} days`;
};

/** Parse "Oct 29 - Nov 4 (UTC)" → ISO day list; fall back to the min/max days present in the series. */
function windowDays(win: string | undefined, present: string[], refYear: number): string[] {
  let start: string | undefined, end: string | undefined;
  const m = win?.match(/([A-Z][a-z]{2})\s+(\d{1,2})\s*[-–]\s*([A-Z][a-z]{2})\s+(\d{1,2})/);
  if (m) {
    const sm = MON.indexOf(m[1]), em = MON.indexOf(m[3]);
    if (sm >= 0 && em >= 0) {
      const sy = sm > em ? refYear - 1 : refYear;
      start = `${sy}-${String(sm + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
      end = `${refYear}-${String(em + 1).padStart(2, '0')}-${m[4].padStart(2, '0')}`;
    }
  }
  if (!start || !end) { const s = [...present].sort(); start = s[0]; end = s[s.length - 1]; }
  if (!start || !end) return [];
  const out: string[] = []; const d = new Date(start + 'T00:00:00Z'); const e = new Date(end + 'T00:00:00Z');
  while (d <= e && out.length < 400) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  for (const p of present) if (!out.includes(p)) out.push(p);
  return out.sort();
}
const refYear = +data.snapshotAt.slice(0, 4);
export const dayLabel = (iso: string) => `${MON[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`;
export const rangeLabel = (days: string[]) => (days.length ? `${dayLabel(days[0])} – ${dayLabel(days[days.length - 1])}` : '');

// Bot order: byBotActivity order (desc total), then week-only bots.
const b30 = [...data.last30.byBotActivity].sort((a, b) => b.total - a.total);
export const BOTS30 = b30;
const weekOnly = data.weekly.byDayBot.flatMap(d => Object.keys(d.bots)).filter(b => !b30.some(x => x.bot === b));
export const BOT_ORDER = [...b30.map(b => b.bot), ...weekOnly.filter((b, i) => weekOnly.indexOf(b) === i)];

// 7d = the current weekly period (weekly.window), which starts at resetsAt − 7 days.
export const weekDays = windowDays(data.weekly.window, data.weekly.byDayBot.map(d => d.day), refYear);
export type WeekRow = { day: string; total: number | null; [bot: string]: number | string | null };
export const weekSeries: WeekRow[] = weekDays.map(day => {
  const r = data.weekly.byDayBot.find(x => x.day === day);
  const row: WeekRow = { day, total: r ? r.total : null };
  BOT_ORDER.forEach(b => { row[b] = r?.bots[b] ?? 0; });
  return row;
});
export const weekBots = BOT_ORDER.filter(b => data.weekly.byDayBot.some(r => (r.bots[b] ?? 0) > 0));
export const weekBotRanks = BOT_ORDER
  .map(bot => ({ bot, total: data.weekly.byDayBot.reduce((s, d) => s + (d.bots[bot] ?? 0), 0) }))
  .filter(b => b.total > 0)
  .sort((a, b) => b.total - a.total);

export const monthDays = windowDays(data.last30.window, data.last30.byDayActivity.map(d => d.day), refYear);
export const monthMax = Math.max(0, ...data.last30.byDayActivity.map(d => d.total));

type DayAct = { day: string; total: number; activity: Num };
function activitySeries(days: string[], rows: DayAct[], renormalize: boolean) {
  const byDay = new Map(rows.map(r => [r.day, r]));
  const present = days.map(d => byDay.get(d)).filter((r): r is DayAct => !!r);
  const totSum = present.reduce((s, r) => s + r.total, 0);
  const scale = renormalize && totSum > 0 ? 100 / totSum : 1;
  const totals = present.map(r => r.total * scale);
  const max = Math.max(0, ...totals);
  const series = days.map(day => {
    const r = byDay.get(day);
    const row: Record<string, number | string | null> = { day, total: r ? r.total * scale : null };
    const sum = r ? ACTIVITIES.reduce((s, a) => s + (r.activity[a] ?? 0), 0) : 0;
    const minTotal = max * 0.03;
    const drawTotal = r ? Math.max(r.total * scale, minTotal) : 0;
    ACTIVITIES.forEach(a => {
      const v = r ? (r.activity[a] ?? 0) * scale : 0;
      row[a] = v;
      row[`v:${a}`] = sum > 0 ? ((r!.activity[a] ?? 0) / sum) * drawTotal : 0;
    });
    return row;
  });
  const spike = present.reduce<DayAct | null>((m, r) => (!m || r.total > m.total ? r : m), null);
  const spikeTotal = spike ? spike.total * scale : null;
  return { derived: renormalize, max, series, spike, spikeTotal };
}

/** Each activity gets a raw value (for tooltip) and a draw value `v:<act>`; tiny days are scaled up to a min visible height. */
export const monthSeries = activitySeries(monthDays, data.last30.byDayActivity, false);
export const weekActivity = activitySeries(weekDays, data.last30.byDayActivity, true);
export const spikeDay = monthSeries.spike;
export const weekSpikeDay = weekActivity.spike;

// Derived: 7d mix = Σ of the renormalized week activity series (same scale as the daily bars; marked ≈).
export const weekActivityMix = ACTIVITIES.map(a => ({
  name: a,
  value: weekActivity.series.reduce((s, r) => s + (Number(r[a]) || 0), 0),
}));

// Derived: overall activity mix = Σ byBotActivity[].activity[a] (no overall field in the data).
export const activityMix = ACTIVITIES.map(a => ({ name: a, value: data.last30.byBotActivity.reduce((s, b) => s + (b.activity[a] ?? 0), 0) }));
