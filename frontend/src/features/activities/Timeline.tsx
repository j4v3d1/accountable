import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { formatShortDate, formatWhen, todayIso } from "../../lib/format";
import { EmptyState } from "../../ui/States";
import { ActivityFormDialog, DeleteActivityDialog, type ActivityOwner } from "./ActivityDialogs";
import { ActivityIcon } from "./ActivityIcon";
import type { Activity } from "./types";
import "./activities.css";

const TYPE_LABELS = { note: "Note", call: "Call", email: "Email", stage_change: "Stage change" } as const;

export function FollowUpTag({ activity }: { activity: Activity }) {
  if (!activity.follow_up_date) return null;
  if (activity.done) {
    return (
      <span className="follow-up done">
        <Check size={12} aria-hidden="true" />
        Followed up {formatShortDate(activity.follow_up_date)}
      </span>
    );
  }
  const overdue = activity.follow_up_date < todayIso();
  return (
    <span className={overdue ? "follow-up overdue" : "follow-up"}>
      Follow up {formatShortDate(activity.follow_up_date)}
      {overdue ? " · Overdue" : ""}
    </span>
  );
}

interface Props {
  entries: Activity[];
  owner: ActivityOwner;
  /** On a contact's page, label entries that belong to one of their deals (concern 5). */
  showDealNames?: boolean;
}

/** A record's activities and stage changes, newest first, with "Log activity" (R12, R18, R29). */
export function Timeline({ entries, owner, showDealNames }: Props) {
  const headingId = useId();
  const [logging, setLogging] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);

  return (
    <section className="panel record-panel" aria-labelledby={headingId}>
      <div className="panel-head">
        <h2 className="section-title" id={headingId}>
          Timeline
        </h2>
        <button type="button" className="btn btn-primary btn-small" onClick={() => setLogging(true)}>
          <Plus size={15} aria-hidden="true" />
          Log activity
        </button>
      </div>
      {entries.length === 0 ? (
        <EmptyState message="No activities yet. Log one to start the timeline." />
      ) : (
        <ol className="timeline">
          {entries.map((activity) => (
            <li key={activity.id} className="timeline-item">
              <ActivityIcon type={activity.type} />
              <div className="timeline-body">
                <p className="timeline-text">
                  <span className="visually-hidden">{TYPE_LABELS[activity.type]}: </span>
                  {activity.description}
                </p>
                <p className="timeline-meta">
                  {showDealNames && activity.deal_id && (
                    <>
                      <Link to={`/deals/${activity.deal_id}`}>{activity.deal_name}</Link>
                      <span aria-hidden="true"> · </span>
                    </>
                  )}
                  <time dateTime={activity.occurred_at}>{formatWhen(activity.occurred_at)}</time>
                  <FollowUpTag activity={activity} />
                </p>
              </div>
              {activity.type !== "stage_change" && (
                <div className="row-actions timeline-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Edit activity"
                    title="Edit"
                    onClick={() => setEditing(activity)}
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label="Delete activity"
                    title="Delete"
                    onClick={() => setDeleting(activity)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {logging && <ActivityFormDialog open onOpenChange={setLogging} owner={owner} />}
      {editing && <ActivityFormDialog open onOpenChange={() => setEditing(null)} activity={editing} />}
      <DeleteActivityDialog target={deleting} onClose={() => setDeleting(null)} />
    </section>
  );
}
