import { ArrowDown, ArrowUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis } from "recharts";
import { money, moneyShort } from "../../lib/format";
import type { Dashboard } from "./types";
import { revenueChange } from "./wording";

const SEA_GREEN = "#06D6A0";
const SEA_MIST = "#CDD8DB";

/** Revenue won this month, the change from last month, and a line chart of the six months (R32). */
export function RevenuePanel({ revenue, monthName }: { revenue: Dashboard["revenue"]; monthName: string }) {
  const change = revenueChange(revenue.change_percent, revenue.last_month_label);
  const Arrow = change.direction === "down" ? ArrowDown : change.direction === "up" ? ArrowUp : null;
  const current = revenue.months[revenue.months.length - 1]?.label;

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
      <div className="revenue-chart" role="img" aria-label={`Revenue won per month: ${revenue.months.map((m) => `${m.label} ${moneyShort(m.won_value)}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={revenue.months} margin={{ top: 28, right: 28, bottom: 0, left: 28 }}>
            <CartesianGrid vertical horizontal={false} stroke="rgba(205, 216, 219, 0.12)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={Number(y) + 12}
                  textAnchor="middle"
                  fontSize={11.5}
                  fill={payload.value === current ? "#FFFFFF" : SEA_MIST}
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
              strokeWidth={2.5}
              fill="rgba(6, 214, 160, 0.16)"
              dot={{ r: 4, fill: "#073B4C", stroke: SEA_GREEN, strokeWidth: 2 }}
              activeDot={false}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="won_value"
                position="top"
                offset={10}
                formatter={(value) => moneyShort(Number(value))}
                style={{ fill: SEA_MIST, fontSize: 11, fontFamily: "var(--font-mono)" }}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
