import { Check } from "lucide-react";
import { useId } from "react";
import { Link } from "react-router";
import { formatShortDate } from "../../lib/format";
import { useMarkDone } from "../activities/queries";
import type { Activity } from "../activities/types";
import type { Dashboard } from "./types";

export function RecordLink({ activity }: { activity: Activity }) {
  if (activity.deal_id) return <Link to={`/deals/${activity.deal_id}`}>{activity.deal_name}</Link>;
  if (activity.contact_id) return <Link to={`/contacts/${activity.contact_id}`}>{activity.contact_name}</Link>;
  return null;
}

function Group({ title, items, overdue }: { title: string; items: Activity[]; overdue?: boolean }) {
  const id = useId();
  const markDone = useMarkDone();
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className={overdue ? "group-title overdue" : "group-title"} id={id}>
        {title}
      </h3>
      <ul className="follow-ups" aria-labelledby={id}>
        {items.map((activity) => (
          <li key={activity.id} className={overdue ? "follow-up-item overdue" : "follow-up-item"}>
            <button
              type="button"
              className="tick"
              aria-label={`Mark done: ${activity.description}`}
              title="Mark done"
              disabled={markDone.isPending && markDone.variables === activity.id}
              onClick={() => markDone.mutate(activity.id)}
            >
              <Check size={12} aria-hidden="true" />
            </button>
            <div className="follow-up-body">
              <p className="follow-up-text">{activity.description}</p>
              <p className="follow-up-on">
                <RecordLink activity={activity} />
              </p>
            </div>
            <span className="due mono">
              {overdue
                ? `Overdue · ${formatShortDate(activity.follow_up_date!)}`
                : formatShortDate(activity.follow_up_date!)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Follow-ups not yet done, in three groups, each oldest first (R36). */
export function FollowUps({ followUps }: { followUps: Dashboard["follow_ups"] }) {
  const total = followUps.overdue.length + followUps.this_week.length + followUps.later.length;
  return (
    <section aria-labelledby="follow-ups-title">
      <h2 className="section-title side-title" id="follow-ups-title">
        Follow-ups <span className="count">{total}</span>
      </h2>
      {total === 0 ? (
        <p className="muted side-empty">No follow-ups due. Log an activity with a follow-up date to see it here.</p>
      ) : (
        <>
          <Group title="Overdue" items={followUps.overdue} overdue />
          <Group title="This week" items={followUps.this_week} />
          <Group title="Later" items={followUps.later} />
        </>
      )}
    </section>
  );
}
