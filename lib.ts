import raw from './data/usage.json';
export const data = raw;
export const ACCENT = '#22e5ff';
export const BOT_COLORS: Record<string, string> = {
  'Retired bots & group chats': '#5b6b82',
  'Chief of Staff': '#4f8cff',
  'Head of Engineering': '#8b7cf6',
  'App Builder': '#3ddc97',
  'Data Engineer': '#f2b65a',
  'Fleet Architect': '#e8749a',
};
export const ACTIVITIES = ['Group chats', 'Bot-to-bot', 'Chats with you', 'Routines'] as const;
export const ACT_COLORS: Record<string, string> = {
  'Group chats': '#22e5ff', 'Bot-to-bot': '#8b7cf6', 'Chats with you': '#3ddc97', 'Routines': '#f2b65a',
};
export const botColor = (b: string) => BOT_COLORS[b] ?? '#7a8699';
export const fmt = (v: number | undefined) => v == null ? '–' : v === 0.5 ? '<1%' : `${v}%`;
export const BOTS = data.last30.byBotActivity.map(b => b.bot);
const weekBots = data.weekly.byDayBot.flatMap(d => Object.keys(d.bots));
export const ALL_BOTS = [...BOTS, ...weekBots.filter(b => !BOTS.includes(b))].filter((b, i, a) => a.indexOf(b) === i);

function days(from: string, to: string) {
  const out: string[] = []; const d = new Date(from + 'T00:00:00Z'); const e = new Date(to + 'T00:00:00Z');
  while (d <= e) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}
const lbl = (iso: string) => { const [, m, d] = iso.split('-'); return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m]} ${+d}`; };
// Windows from data: "Oct 29 - Nov 4 (UTC)" and "Oct 5 - Nov 4 (UTC)"; missing days filled as 0.
export const weekSeries = days('2026-10-29', '2026-11-04').map(day => {
  const r = data.weekly.byDayBot.find(x => x.day === day);
  const row: Record<string, number | string> = { day, label: lbl(day), total: r?.total ?? 0 };
  ALL_BOTS.forEach(b => { row[b] = (r?.bots as Record<string, number> | undefined)?.[b] ?? 0; });
  return row;
});
export const monthSeries = days('2026-10-05', '2026-11-04').map(day => {
  const r = data.last30.byDayActivity.find(x => x.day === day);
  const row: Record<string, number | string> = { day, label: lbl(day), total: r?.total ?? 0 };
  ACTIVITIES.forEach(a => { row[a] = (r?.activity as Record<string, number> | undefined)?.[a] ?? 0; });
  return row;
});
// Overall activity mix: derived by summing last30.byBotActivity (no overall field in data).
export const activityMix = ACTIVITIES.map(a => ({
  name: a,
  value: data.last30.byBotActivity.reduce((s, b) => s + ((b.activity as Record<string, number>)[a] ?? 0), 0),
}));
