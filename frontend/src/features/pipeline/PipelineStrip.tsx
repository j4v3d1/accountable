import { moneyShort } from "../../lib/format";
import { stageColor } from "../deals/StageChip";
import type { StageKey } from "../deals/types";
import "./pipeline.css";

export interface StripSegment {
  key: StageKey;
  label: string;
  value: number;
  count: number;
}

interface Props {
  segments: StripSegment[];
  /** "labels" puts each stage name under its part (pipeline summary); "legend" adds value and count (dashboard). */
  variant?: "labels" | "legend";
}

/** One bar split by open stage, each part as wide as its share of open value (R21, R35). */
export function PipelineStrip({ segments, variant = "labels" }: Props) {
  const shown = segments.filter((segment) => segment.value > 0);
  const total = shown.reduce((sum, segment) => sum + segment.value, 0);
  const description = segments.map((s) => `${s.label} ${moneyShort(s.value)}, ${s.count} deals`).join("; ");

  return (
    <div className="strip-wrap">
      <div className="strip" role="img" aria-label={`Open value by stage: ${description}`}>
        {total === 0 ? (
          <span className="strip-empty" />
        ) : (
          shown.map((segment) => (
            <span key={segment.key} style={{ flexGrow: segment.value, background: stageColor(segment.key) }} />
          ))
        )}
      </div>
      {variant === "labels" ? (
        <div className="strip-labels" aria-hidden="true">
          {shown.map((segment) => (
            <span key={segment.key} style={{ flexGrow: segment.value }}>
              {segment.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="strip-legend">
          {segments.map((segment) => (
            <div key={segment.key}>
              <i className="swatch" style={{ background: stageColor(segment.key) }} aria-hidden="true" />
              <span className="legend-label">{segment.label}</span>
              <span className="legend-value mono">{moneyShort(segment.value)}</span>
              <span className="legend-count muted">
                {segment.count} {segment.count === 1 ? "deal" : "deals"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
