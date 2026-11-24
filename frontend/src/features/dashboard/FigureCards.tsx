import { money } from "../../lib/format";
import { stageColor } from "../deals/StageChip";
import type { Dashboard } from "./types";
import { plural, winRateNote } from "./wording";

/** The thin strip of open value by stage, small. */
function MiniStrip({ stages }: { stages: Dashboard["open_pipeline"]["stages"] }) {
  const shown = stages.filter((stage) => stage.value > 0);
  return (
    <div className="mini-strip" aria-hidden="true">
      {shown.length === 0 ? (
        <span style={{ flexGrow: 1, background: "var(--soft)" }} />
      ) : (
        shown.map((stage) => <span key={stage.key} style={{ flexGrow: stage.value, background: stageColor(stage.key) }} />)
      )}
    </div>
  );
}

/** A ring showing expected revenue as a share of open value; 0% when nothing is open (R33). */
function Ring({ share }: { share: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(Math.max(share, 0), 100) / 100) * circumference;
  return (
    <svg className="ring" width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r={radius} fill="none" stroke="var(--soft)" strokeWidth="6" />
      <circle
        cx="30"
        cy="30"
        r={radius}
        fill="none"
        stroke="var(--marigold)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform="rotate(-90 30 30)"
      />
      <text x="30" y="34" textAnchor="middle" fontSize="12" fontWeight="600" fontFamily="var(--font-mono)" fill="var(--ink)">
        {Math.round(share)}%
      </text>
    </svg>
  );
}

/** A small six-month chart of deals won, this month in Sea Green. */
function MiniBars({ months }: { months: Dashboard["revenue"]["months"] }) {
  const most = Math.max(1, ...months.map((m) => m.won_count));
  return (
    <svg className="mini-bars" width="100" height="40" viewBox="0 0 100 40" aria-hidden="true">
      {months.map((month, index) => {
        const height = Math.max(4, (month.won_count / most) * 36);
        return (
          <rect
            key={month.month}
            x={index * 17}
            y={40 - height}
            width="12"
            height={height}
            rx="4"
            fill={index === months.length - 1 ? "var(--sea-green)" : "#C1F5E7"}
          />
        );
      })}
    </svg>
  );
}

/** Open pipeline, expected revenue and deals won this month (R33). */
export function FigureCards({ data }: { data: Dashboard }) {
  const { open_pipeline: pipeline, deals_won: won, revenue } = data;
  return (
    <div className="figure-cards">
      <section className="panel figure-card" aria-label="Open pipeline (USD)">
        <div>
          <p className="figure-label">Open pipeline (USD)</p>
          <p className="figure-value mono">{money(pipeline.value)}</p>
          <p className="figure-note">{plural(pipeline.count, "open deal", "open deals")}</p>
        </div>
        <MiniStrip stages={pipeline.stages} />
      </section>
      <section className="panel figure-card" aria-label="Expected revenue (USD)">
        <div>
          <p className="figure-label">Expected revenue (USD)</p>
          <p className="figure-value mono">{money(pipeline.expected)}</p>
          <p className="figure-note">Value times probability</p>
        </div>
        <Ring share={pipeline.expected_share} />
      </section>
      <section className="panel figure-card" aria-label="Deals won this month">
        <div>
          <p className="figure-label">Deals won this month</p>
          <p className="figure-value mono">{won.this_month}</p>
          <p className="figure-note">
            {won.last_month} in {revenue.last_month_label} · {winRateNote(won.win_rate)}
          </p>
        </div>
        <MiniBars months={revenue.months} />
      </section>
    </div>
  );
}
