import { money } from "../../lib/format";
import type { DashboardSummary } from "./types";
import { plural } from "./wording";

/** "2 follow-ups are overdue", or nothing when none are. */
function overdueClause(count: number) {
  return (
    count > 0 && (
      <>
        <b className="alert">{plural(count, "follow-up", "follow-ups")}</b> {count === 1 ? "is" : "are"} overdue
      </>
    )
  );
}

/** "3 deals are past their close date", or nothing when none are. */
function lateClause(count: number) {
  return (
    count > 0 && (
      <>
        <b className="alert">{plural(count, "deal", "deals")}</b> {count === 1 ? "is past its" : "are past their"} close
        date
      </>
    )
  );
}

/** "18 open deals worth $10,151,500. 2 follow-ups are overdue and 3 deals are past their close date." (R31) */
export function SummaryLine({ summary }: { summary: DashboardSummary }) {
  const { open_deals, open_value, overdue_follow_ups, late_deals } = summary;
  if (open_deals === 0 && overdue_follow_ups === 0 && late_deals === 0) {
    return <p className="summary-line">No open deals yet. Add a deal to start the pipeline.</p>;
  }
  const overdue = overdueClause(overdue_follow_ups);
  const late = lateClause(late_deals);
  return (
    <p className="summary-line">
      {open_deals > 0 && (
        <>
          <b>{plural(open_deals, "open deal", "open deals")}</b> worth <b>{money(open_value)}</b>.
        </>
      )}
      {(overdue || late) && open_deals > 0 && " "}
      {overdue}
      {overdue && late && " and "}
      {late}
      {(overdue || late) && "."}
    </p>
  );
}
