import { Bar, BarChart, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { Dashboard } from "./types";
import { winRateNote } from "./wording";

interface LabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: unknown;
}

interface BarProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  fill?: string;
}

// As in mockup D: bars rounded on every corner, stopping just short of the centre line.
const GAP = 2;
const BAR_RADIUS = 6;

/** A bar's top and bottom, whichever way Recharts measured it. */
function edges(y: number | string, height: number | string) {
  return {
    top: Math.min(Number(y), Number(y) + Number(height)),
    bottom: Math.max(Number(y), Number(y) + Number(height)),
  };
}

/** A won bar (above the line) or a lost one (below it), with the gap on the centre line's side. */
function roundedBar(below: boolean) {
  function RoundedBar({ x = 0, y = 0, width = 0, height = 0, fill }: BarProps) {
    const { top, bottom } = edges(y, height);
    const barHeight = bottom - top - GAP;
    if (barHeight <= 0) return <g />;
    return (
      <rect
        x={Number(x)}
        y={below ? top + GAP : top}
        width={Number(width)}
        height={barHeight}
        rx={BAR_RADIUS}
        fill={fill}
      />
    );
  }
  return RoundedBar;
}

/** A count above a won bar or below a lost one, worked out from the bar's own edges. */
function countLabel(below: boolean) {
  function CountLabel({ x = 0, y = 0, width = 0, height = 0, value }: LabelProps) {
    const count = Math.abs(Number(value));
    if (!count) return null;
    const { top, bottom } = edges(y, height);
    return (
      <text
        x={Number(x) + Number(width) / 2}
        y={below ? bottom + 14 : top - 6}
        textAnchor="middle"
        fontSize={11.5}
        fontWeight={600}
        fontFamily="var(--font-mono)"
        fill={below ? "#B24A2A" : "#073B4C"}
      >
        {count}
      </text>
    );
  }
  return CountLabel;
}

const WonBar = roundedBar(false);
const LostBar = roundedBar(true);
const WonLabel = countLabel(false);
const LostLabel = countLabel(true);

/** Deals won above the line and lost below it, for the six months (R34a). */
export function WonLostChart({ months, won }: { months: Dashboard["revenue"]["months"]; won: Dashboard["deals_won"] }) {
  const data = months.map((month) => ({ label: month.label, won: month.won_count, lost: -month.lost_count }));
  const most = Math.max(1, ...months.map((m) => Math.max(m.won_count, m.lost_count)));
  const summary = months.map((m) => `${m.label}: ${m.won_count} won, ${m.lost_count} lost`).join("; ");

  return (
    <section className="panel dash-box" aria-labelledby="won-lost-title">
      <div className="panel-head">
        <h2 className="section-title" id="won-lost-title">
          Won and lost
        </h2>
        <p className="legend" aria-hidden="true">
          <span>
            <i style={{ background: "var(--sea-green)" }} />
            Won
          </span>
          <span>
            <i style={{ background: "var(--coral)" }} />
            Lost
          </span>
        </p>
      </div>
      <div role="img" aria-label={`Deals won and lost per month. ${summary}`}>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={data} stackOffset="sign" margin={{ top: 18, right: 4, bottom: 0, left: 4 }} barSize={28}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#3E6370", fontSize: 12 }} />
            <YAxis hide domain={[-most - 0.6, most + 0.6]} />
            <ReferenceLine y={0} stroke="#CDD8DB" strokeWidth={1.5} />
            <Bar dataKey="won" stackId="deals" fill="#06D6A0" shape={WonBar} isAnimationActive={false}>
              <LabelList dataKey="won" content={WonLabel} />
            </Bar>
            <Bar dataKey="lost" stackId="deals" fill="#F78C6B" shape={LostBar} isAnimationActive={false}>
              <LabelList dataKey="lost" content={LostLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <dl className="won-lost-foot">
        <div>
          <dt>Won, 6 months</dt>
          <dd className="mono">{won.won_6m}</dd>
        </div>
        <div>
          <dt>Lost, 6 months</dt>
          <dd className="mono">{won.lost_6m}</dd>
        </div>
        <div>
          <dt>Win rate</dt>
          {won.win_rate === null ? (
            <dd>{winRateNote(null)}</dd>
          ) : (
            <dd className="mono">{winRateNote(won.win_rate).replace(" win rate", "")}</dd>
          )}
        </div>
      </dl>
    </section>
  );
}
