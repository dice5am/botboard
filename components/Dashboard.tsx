'use client';
import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, LabelList } from 'recharts';
import {
  data, T, botColor, actColor, shortBot, fmt, round1, ACTIVITIES, ACT_HEAD, MON, snapLabel, resetLabel,
  BOTS30, weekSeries, weekBots, weekDays, monthSeries, monthDays, spikeDay, activityMix, rangeLabel, dayLabel,
} from '../lib';

const W = data.weekly;
const used = W.limitUsedPct, grok = W.grokBotUsedPct;
const other = round1(used - grok), left = round1(100 - used);
const th = left < 5 ? 'var(--crit)' : left < 20 ? 'var(--warn)' : 'var(--left)';

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
  return (
    <div className={`cd${past ? ' past' : ''}`} aria-live="off" tabIndex={0} aria-label="Time until reset">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={past ? T.muted : T.grok} strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v4h-4" /></svg>
      {past ? 'reset' : fmtLeft(resetMs - now)}
    </div>
  );
}

function HeroLimit() {
  return (
    <section className="card hero" aria-label="Weekly limit">
      <div className="lbl"><i>01</i>Left this week<span className="r">shared limit</span></div>
      <div className="hero-top">
        <div><div className="big" style={{ color: th }}>{left}<small>%</small></div><div className="big-sub"><span className="num">{used}%</span> used</div></div>
        <div className="reset"><CountdownChip /><span>{resetLabel(W.resetsAt)}</span></div>
      </div>
      <div className="cap" style={{ ['--th' as string]: th }}>
        <div className="cap-bar" role="img" aria-label={`Grok Bot ${grok}%, other apps ${other}%, left ${left}%`}>
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

function Tip({ active, payload, label, keys, color, nameOf }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const rows = (keys as string[]).filter(k => (row[k] ?? 0) > 0).reverse();
  return (
    <div className="tip">
      <div className="tip-h">{dayLabel(label)}{row.total != null ? <> · <b style={{ color: T.text }}>{fmt(row.total)}%</b></> : null}</div>
      {rows.length === 0 ? <div className="tip-r">—</div> : rows.map(k => (
        <div key={k} className="tip-r"><i className="sw" style={{ background: color(k) }} /><span>{nameOf(k)}</span><b>{fmt(row[k])}</b></div>
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

function WeekByBot({ ready }: { ready: boolean }) {
  const [ref, w] = useWidth();
  const barSize = Math.max(4, Math.min(40, (w / Math.max(1, weekSeries.length)) * 0.56));

  const aria = 'This week by day: ' + weekSeries.filter(r => r.total != null).map(r => `${dayLabel(r.day)} ${fmt(r.total as number)}%`).join(', ');
  return (
    <section className="card week">
      <div className="lbl"><i>02</i>Bots · week<span className="r">{rangeLabel(weekDays)}</span></div>
      <div ref={ref} className="chart chart-week" role="img" aria-label={aria}>
        {ready && <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekSeries} margin={{ top: 22, right: 0, left: 0, bottom: 0 }} barCategoryGap="44%">
            <XAxis dataKey="day" axisLine={false} tickLine={false} interval={0} height={36} tick={<WeekTick />} />
            <ReferenceLine y={0} stroke={T.border} />
            <Tooltip cursor={{ fill: 'rgba(46,230,255,.05)' }} content={<Tip keys={weekBots} color={botColor} nameOf={shortBot} />} />
            {weekBots.map(b => (
              <Bar key={b} dataKey={b} stackId="w" fill={botColor(b)} barSize={barSize} isAnimationActive={false} shape={segShape(b, weekBots)}>
              </Bar>
            ))}
            <Bar dataKey={() => 0} stackId="w" barSize={barSize} isAnimationActive={false} legendType="none" fill="transparent">
              <LabelList content={(p: any) => {
                const row = weekSeries[p.index]; if (!row) return null;
                const cx = p.x + p.width / 2;
                if (row.total == null) return <rect x={cx - 6} y={p.y - 2} width={12} height={2} rx={1} fill={T.dim} />;
                return <text x={cx} y={p.y - 7} textAnchor="middle" fontSize={12} fontWeight={600} fill={T.text}>{fmt(row.total)}</text>;
              }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>}
      </div>
      <div className="legend">{weekBots.map(b => <span key={b}><i className="sw" style={{ background: botColor(b) }} />{shortBot(b)}</span>)}</div>
    </section>
  );
}

function BotRank30d() {
  const max = Math.max(0, ...BOTS30.map(b => b.total)) || 1;
  return (
    <section className="card bots">
      <div className="lbl"><i>02</i>Bots · 30d<span className="r">{rangeLabel(monthDays)}</span></div>
      <div className="rank">
        {BOTS30.map(b => (
          <div className="rk" key={b.bot}>
            <div className="n"><i className="sw" style={{ background: botColor(b.bot) }} /><em>{b.bot}</em></div>
            <b>{fmt(b.total)}%</b>
            <div className="t"><div style={{ width: `${(b.total / max) * 100}%`, background: botColor(b.bot) }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MonthTick({ x, y, payload, index }: any) {
  if (index % 7 !== 0) return null;
  return <text x={index === 0 ? x - 4 : x} y={y + 10} textAnchor={index === 0 ? 'start' : 'middle'} {...tickBase}>{dayLabel(payload.value)}</text>;
}

function Where({ ready }: { ready: boolean }) {
  const mixTotal = activityMix.reduce((s, a) => s + a.value, 0) || 1;
  const keys = ACTIVITIES.map(a => `v:${a}`);
  const [ref, w] = useWidth();
  const barSize = Math.max(3, (w / Math.max(1, monthSeries.length)) * 0.62);
  const sp = spikeDay;
  const spikeIdx = sp ? monthSeries.findIndex(r => r.day === sp.day) : -1;
  return (
    <section className="card where">
      <div className="lbl"><i>03</i>Where · 30d<span className="r">≈ share</span></div>
      <div className="mix" role="img" aria-label={'Activity mix: ' + activityMix.map(a => `${a.name} ≈${Math.round(a.value)}`).join(', ')}>
        {activityMix.filter(a => a.value > 0).map(a => <div key={a.name} style={{ flex: a.value, background: actColor(a.name) }}>{(a.value / mixTotal) * 100 >= 20 ? `≈${Math.round(a.value)}` : ''}</div>)}
      </div>
      <div className="legend">{activityMix.map(a => <span key={a.name}><i className="sw" style={{ background: actColor(a.name) }} />{a.name} <b>≈{a.value > 0 && a.value < 1 ? '<1' : Math.round(a.value)}</b></span>)}</div>
      <div className="sub">Daily<span className="r">{rangeLabel(monthDays)}</span></div>
      <div ref={ref} className="chart chart-month" role="img" aria-label={sp ? `Last 30 days by day; peak ${fmt(sp.total)}% on ${dayLabel(sp.day)}` : 'Last 30 days by day'}>
        {ready && <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthSeries} margin={{ top: 22, right: 0, left: 0, bottom: 0 }} barCategoryGap="38%">
            <XAxis dataKey="day" axisLine={false} tickLine={false} interval={0} height={20} tick={<MonthTick />} />
            <ReferenceLine y={0} stroke={T.border} />
            <Tooltip cursor={{ fill: 'rgba(46,230,255,.05)' }} content={<Tip keys={ACTIVITIES} color={actColor} nameOf={(k: string) => k} />} />
            {ACTIVITIES.map((a, i) => (
              <Bar key={a} dataKey={keys[i]} name={a} stackId="m" barSize={barSize} fill={actColor(a)} isAnimationActive={false}>
                {i === ACTIVITIES.length - 1 && sp && <LabelList content={(p: any) => {
                  if (p.index !== spikeIdx) return null;
                  return <text x={p.x + p.width + 6} y={p.y + 10} fontSize={12} fontWeight={600} fill={T.text}>{fmt(sp.total)}% <tspan fill={T.muted} fontWeight={400}>{dayLabel(sp.day)}</tspan></text>;
                }} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>}
      </div>
    </section>
  );
}

function BotActivityMatrix() {
  const max = Math.max(0, ...BOTS30.flatMap(b => Object.values(b.activity))) || 1;
  const routines = (data.last30.byRoutine ?? []).filter(r => r.routine !== 'Not from a routine');
  return (
    <section className="card matrix">
      <div className="lbl"><i>03</i>Bot × activity<span className="r">30d</span></div>
      <table className="mx">
        <thead><tr><th />{ACTIVITIES.map(a => <th key={a}>{ACT_HEAD[a] ?? a}</th>)}</tr></thead>
        <tbody>{BOTS30.map(b => (
          <tr key={b.bot}>
            <td className="rn"><i className="sw" style={{ background: botColor(b.bot) }} />{shortBot(b.bot)}</td>
            {ACTIVITIES.map(a => {
              const v = b.activity[a];
              if (!v) return <td key={a} className="z">·</td>;
              const al = 0.10 + 0.75 * Math.sqrt(v / max);
              return <td key={a} className={al > 0.55 ? 'hot' : ''} style={{ background: `rgba(var(--heat-rgb),${al.toFixed(2)})` }}>{fmt(v)}</td>;
            })}
          </tr>
        ))}</tbody>
      </table>
      {routines.length > 0 && <div className="rt"><span>Routines:</span>{routines.map(r => <span key={r.routine}>{r.routine} <b>{fmt(r.share)}%</b>{r.status ? ` · ${r.status}` : ''}</span>)}</div>}
    </section>
  );
}

export default function Dashboard() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <main>
      <div className="top">
        <div className="brand">botboard<b>.</b></div>
        {data.plan && <span className="chip">{data.plan.toUpperCase()}</span>}
        <div className="sp" />
        <span className="chip">{snapLabel(data.snapshotAt)}</span>
      </div>
      <div className="grid">
        <HeroLimit />
        <WeekByBot ready={ready} />
        <BotRank30d />
        <Where ready={ready} />
        <BotActivityMatrix />
      </div>
      <footer>% = share of Grok Bot usage · &lt;1 = under 1%</footer>
    </main>
  );
}
