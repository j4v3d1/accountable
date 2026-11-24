import { ArrowDown, ArrowUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis } from "recharts";
import { money, moneyShort } from "../../lib/format";
import type { Dashboard } from "./types";
import { revenueChange } from "./wording";

// The chart follows mockup D's drawing: two faint guide lines, a line from each
// point down to the axis, and the current month as a larger solid dot.
// The panel stays Midnight in both modes, so its colors are the fixed ones (concern 13).
const SEA_GREEN = "var(--sea-green)";
const SEA_MIST = "var(--sea-mist)";
const MIDNIGHT = "var(--midnight)";
const LABEL = "var(--rail-text)";
const WHITE = "var(--white)";
const CHART_HEIGHT = 198;
const MARGIN = { top: 30, right: 40, bottom: 0, left: 40 };
const X_AXIS_HEIGHT = 28;
const PLOT_BOTTOM = CHART_HEIGHT - MARGIN.bottom - X_AXIS_HEIGHT;
const PLOT_HEIGHT = PLOT_BOTTOM - MARGIN.top;
const GUIDE_LINES = [MARGIN.top + PLOT_HEIGHT / 3, MARGIN.top + (2 * PLOT_HEIGHT) / 3];

interface PointProps {
  cx?: number;
  cy?: number;
  index?: number;
}

/** Revenue won this month, the change from last month, and a line chart of the six months (R32). */
export function RevenuePanel({ revenue, monthName }: { revenue: Dashboard["revenue"]; monthName: string }) {
  const change = revenueChange(revenue.change_percent, revenue.last_month_label);
  const Arrow = change.direction === "down" ? ArrowDown : change.direction === "up" ? ArrowUp : null;
  const current = revenue.months[revenue.months.length - 1]?.label;
  const lastIndex = revenue.months.length - 1;

  function Point({ cx = 0, cy = 0, index = 0 }: PointProps) {
    const isCurrent = index === lastIndex;
    return (
      <g key={`point-${index}`}>
        <line
          x1={cx}
          x2={cx}
          y1={cy + 6}
          y2={PLOT_BOTTOM}
          stroke={SEA_MIST}
          strokeOpacity={isCurrent ? 0.3 : 0.08}
          strokeDasharray={isCurrent ? "3 3" : undefined}
        />
        <circle
          cx={cx}
          cy={cy}
          r={isCurrent ? 6 : 3.5}
          fill={isCurrent ? SEA_GREEN : MIDNIGHT}
          stroke={SEA_GREEN}
          strokeWidth={2.5}
        />
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={11}
          fontWeight={isCurrent ? 600 : 400}
          fill={isCurrent ? WHITE : LABEL}
        >
          {moneyShort(revenue.months[index]?.won_value ?? 0)}
        </text>
      </g>
    );
  }

  return (
    <section className="revenue-panel" aria-label="Revenue won">
      <div className="revenue-top">
        <div>
          <p className="revenue-label">Revenue won in {monthName} (USD)</p>
          <p className="revenue-big mono" data-testid="revenue-this-month">
            {money(revenue.this_month)}
          </p>
          <p className={`delta delta-${change.direction}`}>
            {Arrow && <Arrow size={13} aria-hidden="true" />}
            {change.text}
          </p>
        </div>
        <dl className="revenue-stats">
          <div>
            <dt>Last 6 months</dt>
            <dd className="mono">{moneyShort(revenue.six_month_total)}</dd>
          </div>
          <div>
            <dt>Best month</dt>
            {revenue.best_month ? (
              <dd className="mono">{`${revenue.best_month.label} · ${moneyShort(revenue.best_month.value)}`}</dd>
            ) : (
              <dd>None yet</dd>
            )}
          </div>
        </dl>
      </div>
      <div
        className="revenue-chart"
        role="img"
        aria-label={`Revenue won per month: ${revenue.months.map((m) => `${m.label} ${moneyShort(m.won_value)}`).join(", ")}`}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart data={revenue.months} margin={MARGIN}>
            <CartesianGrid vertical={false} horizontalPoints={GUIDE_LINES} stroke={SEA_MIST} strokeOpacity={0.12} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              height={X_AXIS_HEIGHT}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={Number(y) + 14}
                  textAnchor="middle"
                  fontSize={12}
                  fill={payload.value === current ? WHITE : LABEL}
                  fontWeight={payload.value === current ? 600 : 400}
                >
                  {payload.value}
                </text>
              )}
            />
            <Area
              type="monotone"
              dataKey="won_value"
              stroke={SEA_GREEN}
              strokeWidth={3}
              strokeLinecap="round"
              fill={SEA_GREEN}
              fillOpacity={0.1}
              dot={Point}
              activeDot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
