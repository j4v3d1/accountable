import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { formatShortDate, money, percent } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { LateBadge, ProbabilityDots } from "../deals/StageChip";
import type { Deal } from "../deals/types";
import "./pipeline.css";

/** A deal on the board (R20): who it's with, the value, the probability and the close date. */
export function DealCardBody({ deal, closed }: { deal: Deal; closed: boolean }) {
  const who = [deal.contact_name, deal.organization_name].filter(Boolean).join(" · ");
  return (
    <>
      <div className="card-top">
        <Avatar contactName={deal.contact_name} organizationName={deal.organization_name} size={28} />
        <div className="card-title">
          <p className="card-name">{deal.name}</p>
          {who && <p className="card-who">{who}</p>}
        </div>
      </div>
      <div className="card-row">
        <span className="card-value mono">{money(deal.value)}</span>
        {!closed && <ProbabilityDots probability={deal.probability} />}
      </div>
      <div className="card-row">
        {deal.late ? (
          <LateBadge closeDate={deal.close_date} />
        ) : (
          <span className="card-date mono">
            <Calendar size={12} aria-hidden="true" />
            {formatShortDate(deal.close_date)}
          </span>
        )}
        {!closed && <span className="card-prob mono">{percent(deal.probability)}</span>}
      </div>
    </>
  );
}

interface Props {
  deal: Deal;
  closed: boolean;
  /** The card has just been dragged somewhere else, so this node is the gap where it will land. */
  landing: boolean;
  onOpen: (deal: Deal) => void;
}

export function SortableDealCard({ deal, closed, landing, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  function open(event: MouseEvent) {
    if (event.defaultPrevented) return;
    onOpen(deal);
  }

  function openWithEnter(event: KeyboardEvent) {
    if (event.key === "Enter") onOpen(deal);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={["deal-card", closed && "done", isDragging && (landing ? "landing" : "slot")].filter(Boolean).join(" ")}
      {...attributes}
      {...listeners}
      onClick={open}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event);
        openWithEnter(event);
      }}
    >
      <DealCardBody deal={deal} closed={closed} />
    </div>
  );
}
