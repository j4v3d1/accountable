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

/** A count above a won bar or below a lost one, worked out from the bar's own edges. */
function countLabel(below: boolean) {
  function CountLabel({ x = 0, y = 0, width = 0, height = 0, value }: LabelProps) {
    const count = Math.abs(Number(value));
    if (!count) return null;
    const top = Math.min(Number(y), Number(y) + Number(height));
    const bottom = Math.max(Number(y), Number(y) + Number(height));
    return (
      <text
        x={Number(x) + Number(width) / 2}
        y={below ? bottom + 14 : top - 6}
        textAnchor="middle"
        fontSize={11}
        fontFamily="var(--font-mono)"
        fill="#073B4C"
      >
        {count}
      </text>
    );
  }
  return CountLabel;
}

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
          <BarChart data={data} stackOffset="sign" margin={{ top: 18, right: 4, bottom: 0, left: 4 }} barSize={26}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#3E6370", fontSize: 11.5 }} />
            <YAxis hide domain={[-most - 0.6, most + 0.6]} />
            <ReferenceLine y={0} stroke="#CDD8DB" />
            <Bar dataKey="won" stackId="deals" fill="#06D6A0" radius={[5, 5, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="won" content={WonLabel} />
            </Bar>
            <Bar dataKey="lost" stackId="deals" fill="#F78C6B" radius={[5, 5, 0, 0]} isAnimationActive={false}>
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
