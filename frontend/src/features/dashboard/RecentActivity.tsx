import { formatWhen } from "../../lib/format";
import { ActivityIcon } from "../activities/ActivityIcon";
import type { Activity } from "../activities/types";
import { RecordLink } from "./FollowUps";

/** The latest 10 activities of every kind, stage changes included (R37). */
export function RecentActivity({ activities }: { activities: Activity[] }) {
  return (
    <section aria-labelledby="recent-title">
      <h2 className="section-title side-title" id="recent-title">
        Recent activity
      </h2>
      {activities.length === 0 ? (
        <p className="muted side-empty">No activity yet. Log a call, email or note on a contact or deal.</p>
      ) : (
        <ol className="timeline">
          {activities.map((activity) => (
            <li key={activity.id} className="timeline-item">
              <ActivityIcon type={activity.type} />
              <div className="timeline-body">
                <p className="timeline-text">{activity.description}</p>
                <p className="timeline-meta">
                  <RecordLink activity={activity} />
                  <span aria-hidden="true">·</span>
                  <time dateTime={activity.occurred_at}>{formatWhen(activity.occurred_at)}</time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
