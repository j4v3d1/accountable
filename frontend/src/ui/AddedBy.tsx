import { formatTimestampDate } from "../lib/format";
import "./ui.css";

/** Who added a record and who last changed it, as every record carries them (R56). */
export interface AddedByFields {
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * "Added by Maya Torres on Nov 3, 2026", and "Last changed by..." once someone has
 * changed it since (R57). Sample records show "Sample data" (concern 18).
 */
export function AddedBy({ record }: { record: AddedByFields }) {
  const changed = record.updated_at !== record.created_at;
  return (
    <div className="added-by">
      <p>
        Added by <span className="added-by-name">{record.created_by_name}</span> on{" "}
        {formatTimestampDate(record.created_at)}
      </p>
      {changed && (
        <p>
          Last changed by <span className="added-by-name">{record.updated_by_name}</span> on{" "}
          {formatTimestampDate(record.updated_at)}
        </p>
      )}
    </div>
  );
}
