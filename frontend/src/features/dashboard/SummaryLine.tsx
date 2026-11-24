import { money } from "../../lib/format";
import type { DashboardSummary } from "./types";
import { plural } from "./wording";

/** "18 open deals worth $10,151,500. 2 follow-ups are overdue and 3 deals are past their close date." (R31) */
export function SummaryLine({ summary }: { summary: DashboardSummary }) {
  const { open_deals, open_value, overdue_follow_ups, late_deals } = summary;
  if (open_deals === 0 && overdue_follow_ups === 0 && late_deals === 0) {
    return <p className="summary-line">No open deals yet. Add a deal to start the pipeline.</p>;
  }
  const overdue = overdue_follow_ups > 0 && (
    <>
      <b className="alert">{plural(overdue_follow_ups, "follow-up", "follow-ups")}</b> {overdue_follow_ups === 1 ? "is" : "are"}{" "}
      overdue
    </>
  );
  const late = late_deals > 0 && (
    <>
      <b className="alert">{plural(late_deals, "deal", "deals")}</b> {late_deals === 1 ? "is past its" : "are past their"} close
      date
    </>
  );
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
