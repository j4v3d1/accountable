import { CalendarX } from "lucide-react";
import { formatShortDate } from "../../lib/format";
import { useStages } from "./queries";
import type { StageKey } from "./types";
import "./deals.css";

export function stageColor(stage: StageKey) {
  return `var(--stage-${stage})`;
}

export function StageChip({ stage }: { stage: StageKey }) {
  const stages = useStages();
  const label = stages.data?.find((s) => s.key === stage)?.label ?? "";
  return (
    <span className="chip stage-chip" style={{ background: stageColor(stage) }}>
      {label}
    </span>
  );
}

/** "Late", or "Late · Nov 10" with the date (R16). */
export function LateBadge({ closeDate }: { closeDate?: string }) {
  return (
    <span className="chip late-badge">
      <CalendarX size={12} aria-hidden="true" />
      Late{closeDate ? ` · ${formatShortDate(closeDate)}` : ""}
    </span>
  );
}

/** A five-dot meter for the probability of close. */
export function ProbabilityDots({ probability }: { probability: number }) {
  const filled = Math.round(probability / 20);
  return (
    <span className="prob-dots" role="img" aria-label={`${probability}% probability`}>
      {[0, 1, 2, 3, 4].map((n) => (
        <span key={n} className={n < filled ? "on" : undefined} />
      ))}
    </span>
  );
}
