'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, LabelList } from 'recharts';
import {
  data, T, botColor, actColor, shortBot, fmtPct, round1, ACTIVITIES, ACT_HEAD, MON, snapLabel, resetLabel, resetsInLabel,
  BOTS30, weekSeries, weekBots, weekDays, weekBotRanks, weekActivity, weekActivityMix, monthSeries, monthDays,
  activityMix, rangeLabel, dayLabel, type Win,
} from '../lib';

const W = data.weekly;
const used = W.limitUsedPct, grok = W.grokBotUsedPct;
const other = round1(used - grok), left = round1(100 - used);
const th = left < 5 ? 'var(--crit)' : left < 20 ? 'var(--warn)' : 'var(--left)';

const Y_WEEK = "% of Grok Bot usage this week";
const Y_MONTH = "% of Grok Bot usage, last 30 days";
const Y_LIMIT = "% of the weekly shared limit";

function Head({ n, title, meta, children }: { n: string; title: string; meta?: string; children: ReactNode }) {
  return (
    <div className="head">
      <div className="lbl"><i>{n}</i>{title}{meta ? <span className="r">{meta}</span> : null}</div>
      <p className="desc">{children}</p>
    </div>
  );
}

function Axis({ y, x = 'Day' }: { y: string; x?: string }) {
  return <div className="axis" aria-hidden><span>{y}</span><span>{x}</span></div>;
}

function fmtLeft(ms: number) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(mins / 1440), h = Math.floor(mins / 60) % 24, m = mins % 60;
  return `${d ? d + 'd ' : ''}${d ? h : Math.floor(mins / 60)}h ${String(m).padStart(2, '0')}m`;
}

function CountdownChip() {
  const resetMs = new Date(W.resetsAt).getTime();
  const [now, setNow] = useState(() => new Date(data.snapshotAt).getTime());
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(t); }, []);
  const past = now >= resetMs;
  const inLabel = past ? null : resetsInLabel(now);
  return (
    <div className="reset">
      <div className={`cd${past ? ' past' : ''}`} aria-live="off" tabIndex={0} aria-label="Time until reset">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={past ? T.muted : T.grok} strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v4h-4" /></svg>
        {past ? 'reset' : fmtLeft(resetMs - now)}
      </div>
      {inLabel && <span>{inLabel}</span>}
      <span>{resetLabel(W.resetsAt)}</span>
    </div>
  );
}

function WindowToggle({ win, setWin }: { win: Win; setWin: (w: Win) => void }) {
  return (
    <div className="win" role="group" aria-label="Time window">
      {(['7d', '30d'] as const).map(w => (
        <button key={w} type="button" aria-pressed={win === w} onClick={() => setWin(w)}>{w}</button>
      ))}
    </div>
  );
}

function HeroLimit() {
  return (
    <section className="card hero" aria-label="Weekly limit">
      <Head n="01" title="Left this week" meta="shared limit">
        Percent of the weekly shared limit that is used, and when the limit resets.
      </Head>
      <div className="hero-top">
        <div>
          <div className="big" style={{ color: th }}>{left}<small>%</small></div>
          <div className="big-sub"><span className="num">{used}%</span> of limit used</div>
        </div>
        <CountdownChip />
      </div>
      <div className="cap" style={{ ['--th' as string]: th }}>
        <Axis y={Y_LIMIT} x="" />
        <div className="cap-bar" role="img" aria-label={`Grok Bot ${grok}%, other apps ${other}%, left ${left}% of the weekly shared limit`}>
          <div className="seg-grok" style={{ flex: grok }} /><div className="seg-other" style={{ flex: other }} /><div className="seg-left" style={{ flex: left }} />
        </div>
        <div className="cap-leg">
          <div><span><i className="sw" style={{ background: 'var(--grok)' }} />Grok Bot</span><b style={{ color: 'var(--grok)' }}>{grok}%</b></div>
          <div><span><i className="sw" style={{ background: 'var(--other)' }} />Other apps</span><b>{other}%</b></div>
          <div><span><i className="sw sw-left" />Left</span><b style={{ color: th }}>{left}%</b></div>
        </div>
      </div>
    </section>
  );
}

function Tip({ active, payload, label, keys, color, nameOf, approx }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const rows = (keys as string[]).filter(k => (row[k] ?? 0) > 0).reverse();
  return (
    <div className="tip">
      <div className="tip-h">{dayLabel(label)}{row.total != null ? <> · <b style={{ color: T.text }}>{fmtPct(row.total, approx)}</b></> : null}</div>
      {rows.length === 0 ? <div className="tip-r">—</div> : rows.map(k => (
        <div key={k} className="tip-r"><i className="sw" style={{ background: color(k) }} /><span>{nameOf(k)}</span><b>{fmtPct(row[k], approx)}</b></div>
      ))}
    </div>
  );
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null); const [w, setW] = useState(0);
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect(); }, []);
  return [ref, w] as const;
}

const tickBase = { fontSize: 11, fill: T.muted };

function WeekTick({ x, y, payload, index }: any) {
  const iso: string = payload.value; const d = +iso.slice(8);
  const sub = index === 0 || d === 1;
  return (<g>
    <text x={x} y={y + 10} textAnchor="middle" {...tickBase}>{d}</text>
    {sub && <text x={x} y={y + 24} textAnchor="middle" fontSize={9.5} fill={T.dim}>{MON[+iso.slice(5, 7) - 1].toUpperCase()}</text>}
  </g>);
}

function MonthTick({ x, y, payload, index }: any) {
  if (index % 7 !== 0) return null;
  return <text x={index === 0 ? x - 4 : x} y={y + 10} textAnchor={index === 0 ? 'start' : 'middle'} {...tickBase}>{dayLabel(payload.value)}</text>;
}

// Stacked segment: round only the top-most present segment; leave a 1px surface gap between segments.
const segShape = (key: string, keys: string[]) => (p: any) => {
  const { x, y, width, height, payload, fill } = p;
  if (!height || height <= 0) return <g />;
  const idx = keys.indexOf(key);
  const isTop = !keys.slice(idx + 1).some(k => (payload[k] ?? 0) > 0);
  const h = Math.max(0, height - (idx > 0 ? 1 : 0));
  if (!isTop) return <rect x={x} y={y} width={width} height={h} fill={fill} />;
  const r = Math.min(4, width / 2, h);
  return <path d={`M${x},${y + h} V${y + r} q0,-${r} ${r},-${r} h${width - 2 * r} q${r},0 ${r},${r} V${y + h} Z`} fill={fill} />;
};

function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

function WeekByBot({ ready, win }: { ready: boolean; win: Win }) {
  const [ref, w] = useWidth();
  const barSize = Math.max(4, Math.min(40, (w / Math.max(1, weekSeries.length)) * 0.56));
  const aria = 'This week by day: ' + weekSeries.filter(r => r.total != null).map(r => `${dayLabel(r.day)} ${fmtPct(r.total as number)}`).join(', ');
  return (
    <section className="card week">
      <Head n="02" title={`Bots · daily · ${win}`} meta={win === '7d' ? rangeLabel(weekDays) : rangeLabel(monthDays)}>
        {win === '7d'
          ? "Each day's share of Grok Bot usage this week, split by bot."
          : "Each day's share of Grok Bot usage over the last 30 days, split by bot."}
      </Head>
      {win === '30d' ? (
        <Empty>No daily-by-bot split in the 30-day snapshot</Empty>
      ) : (
        <>
          <Axis y={Y_WEEK} />
          <div ref={ref} className="chart chart-week" role="img" aria-label={aria}>
            {ready && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekSeries} margin={{ top: 22, right: 0, left: 0, bottom: 0 }} barCategoryGap="44%">
                <XAxis dataKey="day" axisLine={false} tickLine={false} interval={0} height={36} tick={<WeekTick />} />
                <ReferenceLine y={0} stroke={T.border} />
                <Tooltip cursor={{ fill: 'rgba(46,230,255,.05)' }} content={<Tip keys={weekBots} color={botColor} nameOf={shortBot} />} />
                {weekBots.map(b => (
                  <Bar key={b} dataKey={b} stackId="w" fill={botColor(b)} barSize={barSize} isAnimationActive={false} shape={segShape(b, weekBots)} />
                ))}
                <Bar dataKey={() => 0} stackId="w" barSize={barSize} isAnimationActive={false} legendType="none" fill="transparent">
                  <LabelList content={(p: any) => {
                    const row = weekSeries[p.index]; if (!row) return null;
                    const cx = p.x + p.width / 2;
                    if (row.total == null) return <rect x={cx - 6} y={p.y - 2} width={12} height={2} rx={1} fill={T.dim} />;
                    return <text x={cx} y={p.y - 7} textAnchor="middle" fontSize={12} fontWeight={600} fill={T.text}>{fmtPct(row.total)}</text>;
                  }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <div className="legend">{weekBots.map(b => <span key={b}><i className="sw" style={{ background: botColor(b) }} />{shortBot(b)}</span>)}</div>
        </>
      )}
    </section>
  );
}

function BotRank({ win }: { win: Win }) {
  const is7 = win === '7d';
  const rows = is7 ? weekBotRanks : BOTS30;
  const days = is7 ? weekDays : monthDays;
  const max = Math.max(0, ...rows.map(b => b.total)) || 1;
  return (
    <section className="card bots">
      <Head n="02" title={`Bots · ${win}`} meta={rangeLabel(days)}>
        {is7 ? "Each bot's share of Grok Bot usage this week." : "Each bot's share of Grok Bot usage over the last 30 days."}
      </Head>
      <Axis y={is7 ? Y_WEEK : Y_MONTH} x="Bot" />
      <div className="rank">
        {rows.map(b => (
          <div className="rk" key={b.bot}>
            <div className="n"><i className="sw" style={{ background: botColor(b.bot) }} /><em>{b.bot}</em></div>
            <b>{fmtPct(b.total)}</b>
            <div className="t"><div style={{ width: `${(b.total / max) * 100}%`, background: botColor(b.bot) }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Where({ ready, win }: { ready: boolean; win: Win }) {
  const is7 = win === '7d';
  const mix = is7 ? weekActivityMix : activityMix;
  const pack = is7 ? weekActivity : monthSeries;
  const days = is7 ? weekDays : monthDays;
  const yUnit = is7 ? Y_WEEK : Y_MONTH;
  const mixTotal = mix.reduce((s, a) => s + a.value, 0) || 1;
  const keys = ACTIVITIES.map(a => `v:${a}`);
  const [ref, w] = useWidth();
  const barSize = Math.max(3, (w / Math.max(1, pack.series.length)) * (is7 ? 0.56 : 0.62));
  const sp = pack.spike;
  const spikeIdx = sp ? pack.series.findIndex(r => r.day === sp.day) : -1;
  const spikeLabel = pack.spikeTotal != null && sp ? fmtPct(pack.spikeTotal, pack.derived) : null;
  const mixLabel = (v: number) => `≈${v > 0 && v < 1 && !is7 ? '<1' : Math.round(v)}%`;
  return (
    <section className="card where">
      <Head n="03" title={`Where · ${win}`} meta="≈ share">
        {is7
          ? "Grok Bot usage this week, split by activity. Daily bars are ≈, taken from the 30-day daily series."
          : "Grok Bot usage over the last 30 days, split by activity."}
      </Head>
      <Axis y={yUnit} x="Activity" />
      <div className="mix" role="img" aria-label={'Activity mix: ' + mix.map(a => `${a.name} ≈${Math.round(a.value)}%`).join(', ')}>
        {mix.filter(a => a.value > 0).map(a => <div key={a.name} style={{ flex: a.value, background: actColor(a.name) }}>{(a.value / mixTotal) * 100 >= 20 ? `≈${Math.round(a.value)}%` : ''}</div>)}
      </div>
      <div className="legend">{mix.filter(a => a.value > 0).map(a => <span key={a.name}><i className="sw" style={{ background: actColor(a.name) }} />{a.name} <b>{mixLabel(a.value)}</b></span>)}</div>
      <div className="sub">Daily · {win}<span className="r">{rangeLabel(days)}</span></div>
      <Axis y={yUnit} />
      <div ref={ref} className={`chart ${is7 ? 'chart-week' : 'chart-month'}`} role="img" aria-label={sp ? `${is7 ? 'This week' : 'Last 30 days'} by day; peak ${spikeLabel} on ${dayLabel(sp.day)}` : is7 ? 'This week by day' : 'Last 30 days by day'}>
        {ready && <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pack.series} margin={{ top: 22, right: 0, left: 0, bottom: 0 }} barCategoryGap={is7 ? '44%' : '38%'}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} interval={0} height={is7 ? 36 : 20} tick={is7 ? <WeekTick /> : <MonthTick />} />
            <ReferenceLine y={0} stroke={T.border} />
            <Tooltip cursor={{ fill: 'rgba(46,230,255,.05)' }} content={<Tip keys={ACTIVITIES} color={actColor} nameOf={(k: string) => k} approx={pack.derived} />} />
            {ACTIVITIES.map((a, i) => (
              <Bar key={a} dataKey={keys[i]} name={a} stackId="m" barSize={barSize} fill={actColor(a)} isAnimationActive={false}>
                {i === ACTIVITIES.length - 1 && <LabelList content={(p: any) => {
                  const row = pack.series[p.index];
                  if (!row) return null;
                  const cx = p.x + p.width / 2;
                  if (is7 && row.total == null) return <rect x={cx - 6} y={p.y - 2} width={12} height={2} rx={1} fill={T.dim} />;
                  if (sp && spikeLabel && p.index === spikeIdx) {
                    const last = p.index >= pack.series.length - 2;
                    if (last) return <text x={cx} y={p.y - 7} textAnchor="middle" fontSize={12} fontWeight={600} fill={T.text}>{spikeLabel}</text>;
                    return <text x={p.x + p.width + 6} y={p.y + 10} fontSize={12} fontWeight={600} fill={T.text}>{spikeLabel} <tspan fill={T.muted} fontWeight={400}>{dayLabel(sp.day)}</tspan></text>;
                  }
                  return null;
                }} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>}
      </div>
    </section>
  );
}

function BotActivityMatrix({ win }: { win: Win }) {
  const max = Math.max(0, ...BOTS30.flatMap(b => Object.values(b.activity))) || 1;
  const routines = (data.last30.byRoutine ?? []).filter(r => r.routine !== 'Not from a routine');
  const days = win === '7d' ? weekDays : monthDays;
  return (
    <section className="card matrix">
      <Head n="03" title={`Bot × activity · ${win}`} meta={rangeLabel(days)}>
        {win === '7d'
          ? "Each bot's Grok Bot usage this week, split by activity."
          : "Each bot's Grok Bot usage over the last 30 days, split by activity."}
      </Head>
      {win === '7d' ? (
        <Empty>No bot × activity split in this week</Empty>
      ) : (
        <>
          <Axis y={Y_MONTH} x="Activity" />
          <table className="mx">
            <thead><tr><th />{ACTIVITIES.map(a => <th key={a}>{ACT_HEAD[a] ?? a}</th>)}</tr></thead>
            <tbody>{BOTS30.map(b => (
              <tr key={b.bot}>
                <td className="rn"><i className="sw" style={{ background: botColor(b.bot) }} />{shortBot(b.bot)}</td>
                {ACTIVITIES.map(a => {
                  const v = b.activity[a];
                  if (!v) return <td key={a} className="z">·</td>;
                  const al = 0.10 + 0.75 * Math.sqrt(v / max);
                  return <td key={a} className={al > 0.55 ? 'hot' : ''} style={{ background: `rgba(var(--heat-rgb),${al.toFixed(2)})` }}>{fmtPct(v)}</td>;
                })}
              </tr>
            ))}</tbody>
          </table>
          {routines.length > 0 && <div className="rt"><span>Routines:</span>{routines.map(r => <span key={r.routine}>{r.routine} <b>{fmtPct(r.share)}</b>{r.status ? ` · ${r.status}` : ''}</span>)}</div>}
        </>
      )}
    </section>
  );
}

export default function Dashboard() {
  const [ready, setReady] = useState(false);
  const [win, setWin] = useState<Win>('7d');
  useEffect(() => setReady(true), []);
  return (
    <main>
      <div className="top">
        <div className="brand">botboard<b>.</b></div>
        {data.plan && <span className="chip">{data.plan.toUpperCase()}</span>}
        <div className="sp" />
        <span className="chip">{snapLabel(data.snapshotAt)}</span>
      </div>
      <div className="top-win">
        <WindowToggle win={win} setWin={setWin} />
        <span className="win-meta">{win === '7d' ? rangeLabel(weekDays) : rangeLabel(monthDays)}</span>
      </div>
      <div className="grid">
        <HeroLimit />
        <WeekByBot ready={ready} win={win} />
        <BotRank win={win} />
        <Where ready={ready} win={win} />
        <BotActivityMatrix win={win} />
      </div>
      <footer>Limit figures: % of the weekly shared limit. Other figures: share of Grok Bot usage. &lt;1 = under 1%.</footer>
    </main>
  );
}
