import { ArrowDown } from "lucide-react";
import { moneyShort, percent } from "../../lib/format";
import { stageColor } from "../deals/StageChip";
import type { Dashboard } from "./types";

/** How many deals, and how much value, reached each stage, with the share that moved on (R34). */
export function Funnel({ funnel }: { funnel: Dashboard["funnel"] }) {
  const most = Math.max(1, ...funnel.map((stage) => stage.count));
  return (
    <section className="panel dash-box" aria-labelledby="funnel-title">
      <div className="panel-head">
        <h2 className="section-title" id="funnel-title">
          Sales funnel
        </h2>
        <p className="panel-sub">Value reaching each stage (USD) · share moving on</p>
      </div>
      <ol className="funnel">
        {funnel.map((stage) => (
          <li key={stage.key} className="funnel-row">
            <span className="funnel-label">
              <i style={{ background: stageColor(stage.key) }} aria-hidden="true" />
              {stage.label}
            </span>
            <span className="funnel-track">
              <span
                className="funnel-bar mono"
                style={{ width: `${(stage.count / most) * 100}%`, background: stageColor(stage.key) }}
                aria-label={`${stage.count} deals`}
              >
                {stage.count}
              </span>
            </span>
            <span className="funnel-value mono">{moneyShort(stage.value)}</span>
            <span className="funnel-share mono">
              {stage.share_from_previous !== null && (
                <>
                  <ArrowDown size={11} aria-hidden="true" /> {percent(stage.share_from_previous)}
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
