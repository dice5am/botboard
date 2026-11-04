'use client';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { data, ACCENT, ACTIVITIES, ACT_COLORS, ALL_BOTS, botColor, fmt, weekSeries, monthSeries, activityMix } from '../lib';

const W = data.weekly;

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = now == null ? 0 : Math.max(0, new Date(to).getTime() - now);
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const parts = [[Math.floor(s / 86400), 'd'], [Math.floor(s / 3600) % 24, 'h'], [Math.floor(s / 60) % 60, 'm'], [s % 60, 's']] as const;
  return (
    <div className="countdown mono">
      {parts.map(([v, u]) => <span key={u}><b>{now == null ? '--' : p(v)}</b><i>{u}</i></span>)}
    </div>
  );
}

function Gauge() {
  const r = 80, c = 2 * Math.PI * r, arc = 0.75; // 270° arc
  const L = c * arc;
  const used = (W.limitUsedPct / 100) * L, grok = (W.grokBotUsedPct / 100) * L;
  const common = { cx: 100, cy: 100, r, fill: 'none', strokeLinecap: 'round' as const, transform: 'rotate(135 100 100)' };
  return (
    <svg viewBox="0 0 200 175" className="gauge" role="img" aria-label={`Weekly limit ${W.limitUsedPct}% used`}>
      <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      <circle {...common} stroke="#141b24" strokeWidth={14} strokeDasharray={`${L} ${c}`} />
      <circle {...common} stroke="#1d5f6b" strokeWidth={14} strokeDasharray={`${used} ${c}`} />
      <circle {...common} stroke={ACCENT} strokeWidth={14} strokeDasharray={`${grok} ${c}`} filter="url(#glow)" />
      <text x="100" y="98" textAnchor="middle" className="g-big">{W.limitUsedPct}<tspan className="g-pct">%</tspan></text>
      <text x="100" y="118" textAnchor="middle" className="g-lbl">WEEKLY LIMIT</text>
    </svg>
  );
}

const axis = { stroke: '#4a5566', fontSize: 10, fontFamily: 'var(--mono)', tickLine: false, axisLine: false };

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => p.value > 0);
  return (
    <div className="tip">
      <div className="tip-h">{label}</div>
      {rows.length === 0 ? <div className="tip-r"><span>—</span></div> : rows.slice().reverse().map((p: any) => (
        <div key={p.dataKey} className="tip-r"><i style={{ background: p.fill }} /><span>{p.dataKey}</span><b>{fmt(p.value)}</b></div>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <div className="legend">{items.map(i => <span key={i.name}><i style={{ background: i.color }} />{i.name}</span>)}</div>;
}

function Card({ title, meta, children, className = '' }: { title: string; meta?: string; children: React.ReactNode; className?: string }) {
  return <section className={`card ${className}`}><header><h2>{title}</h2>{meta && <span className="meta mono">{meta}</span>}</header>{children}</section>;
}

function Segmented({ parts, height = 10 }: { parts: { name: string; value: number; color: string }[]; height?: number }) {
  const sum = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="seg" style={{ height }}>
      {parts.filter(p => p.value > 0).map(p => <div key={p.name} title={`${p.name} ${fmt(p.value)}`} style={{ flex: p.value / sum, background: p.color }} />)}
    </div>
  );
}

export default function Dashboard() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const weekBots = ALL_BOTS.filter(b => weekSeries.some(r => (r[b] as number) > 0));
  const spike = monthSeries.reduce((m, r) => ((r.total as number) > (m.total as number) ? r : m));
  const max30 = Math.max(...data.last30.byBotActivity.map(b => b.total));
  const routines = data.last30.byRoutine;
  const snap = new Date(data.snapshotAt).toLocaleString('en-US', { timeZone: 'America/Toronto', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const reset = new Date(W.resetsAt).toLocaleString('en-US', { timeZone: 'America/Toronto', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <main>
      <div className="top">
        <div className="brand mono">botboard<span>.</span></div>
        {data.plan && <div className="plan mono">{data.plan}</div>}
      </div>

      <div className="grid">
        <Card title="Week" meta={W.window} className="hero">
          <div className="hero-in">
            <Gauge />
            <div className="hero-side">
              <div className="stat"><i style={{ background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} /><span>Grok Bot</span><b className="mono">{W.grokBotUsedPct}%</b></div>
              <div className="stat"><i style={{ background: '#1d5f6b' }} /><span>Other apps</span><b className="mono">{(W.limitUsedPct - W.grokBotUsedPct).toFixed(1)}%</b></div>
              <div className="stat"><i style={{ background: '#141b24', border: '1px solid #2a3442' }} /><span>Left</span><b className="mono">{(100 - W.limitUsedPct).toFixed(1)}%</b></div>
              <div className="reset"><span>Resets</span><em className="mono">{reset} ET</em></div>
              <Countdown to={W.resetsAt} />
            </div>
          </div>
        </Card>

        <Card title="This week · by bot" meta="Oct 29 – Nov 4" className="week">
          <div className="chart h220">
            {ready && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekSeries} margin={{ top: 8, right: 4, left: -22, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="#1a222d" strokeDasharray="2 4" />
                <XAxis dataKey="label" {...axis} interval={0} tickFormatter={(v: string) => v.split(' ')[1]} />
                <YAxis {...axis} tickFormatter={v => `${v}`} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(34,229,255,0.05)' }} />
                {weekBots.map((b, i) => <Bar key={b} dataKey={b} stackId="a" fill={botColor(b)} isAnimationActive={false} radius={i === weekBots.length - 1 ? [3, 3, 0, 0] : 0} />)}
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <Legend items={weekBots.map(b => ({ name: b, color: botColor(b) }))} />
        </Card>

        <Card title="30 days · by activity" meta="Oct 5 – Nov 4" className="month">
          <div className="chart h240">
            {ready && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthSeries} margin={{ top: 22, right: 4, left: -22, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid vertical={false} stroke="#1a222d" strokeDasharray="2 4" />
                <XAxis dataKey="label" {...axis} interval={6} />
                <YAxis {...axis} domain={[0, 80]} ticks={[0, 20, 40, 60, 80]} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(34,229,255,0.05)' }} />
                {ACTIVITIES.map(a => <Bar key={a} dataKey={a} stackId="a" fill={ACT_COLORS[a]} isAnimationActive={false} />)}
                <ReferenceDot x={spike.label as string} y={spike.total as number} r={0} label={{ value: `${spike.total}%`, position: 'top', fill: ACCENT, fontSize: 10, fontFamily: 'var(--mono)' }} />
              </BarChart>
            </ResponsiveContainer>}
          </div>
          <Legend items={ACTIVITIES.map(a => ({ name: a, color: ACT_COLORS[a] }))} />
        </Card>

        <Card title="30 days · by bot" className="bots">
          <div className="rank">
            {data.last30.byBotActivity.map(b => (
              <div key={b.bot} className="rank-row">
                <div className="rank-h"><span><i style={{ background: botColor(b.bot) }} />{b.bot}</span><b className="mono">{fmt(b.total)}</b></div>
                <div className="rank-track">
                  <div style={{ width: `${Math.max(2, (b.total / max30) * 100)}%` }}>
                    <Segmented parts={ACTIVITIES.map(a => ({ name: a, value: (b.activity as Record<string, number>)[a] ?? 0, color: ACT_COLORS[a] }))} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Activity mix" className="mix">
          <Segmented height={14} parts={activityMix.map(a => ({ ...a, color: ACT_COLORS[a.name] }))} />
          <div className="mix-list">
            {activityMix.map(a => <div key={a.name}><i style={{ background: ACT_COLORS[a.name] }} /><span>{a.name}</span><b className="mono">~{Math.round(a.value)}%</b></div>)}
          </div>
          <h3>Routines</h3>
          <div className="routines">
            {routines.map(r => (
              <div key={r.routine} className="rt">
                <span>{r.routine}{'status' in r && r.status ? <em> · {r.status}</em> : null}</span>
                <div className="rt-bar"><div style={{ width: `${Math.max(1.5, r.share)}%`, background: r.routine === 'Not from a routine' ? '#2f3b4c' : ACT_COLORS.Routines }} /></div>
                <b className="mono">{fmt(r.share)}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <footer className="mono">
        <span>Snapshot {snap} ET</span>
        <span>Values are shares of Grok Bot usage</span>
        <span>&lt;1% shown as &lt;1% · mix ≈ summed from per-bot</span>
        <span>Token counts and per-project splits not available</span>
      </footer>
    </main>
  );
}
