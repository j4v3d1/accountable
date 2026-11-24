import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { money, moneyShort, todayIso } from "../../lib/format";
import { stageColor } from "../deals/StageChip";
import type { Deal, Stage, StageKey } from "../deals/types";
import { boardTotals, columnTotals, findCard, moveCard, toColumns, type Columns } from "./board";
import { DealCardBody, SortableDealCard } from "./DealCard";
import { PipelineStrip } from "./PipelineStrip";
import { useMoveDeal } from "./queries";
import "./pipeline.css";

const COLUMN_PREFIX = "column:";
const columnId = (stage: StageKey) => `${COLUMN_PREFIX}${stage}`;
const isColumn = (id: UniqueIdentifier) => String(id).startsWith(COLUMN_PREFIX);

const instructions = {
  draggable:
    "To move a deal, press Space to pick it up, use the arrow keys to move it, then press Space to drop it, or Escape to cancel. Press Enter to open the deal.",
};

/**
 * Left and right arrows move a picked-up card to the next column, measured from
 * the columns themselves. dnd-kit's default picks any droppable whose left edge is
 * right of the dragged card, and the tilted card's box starts a few pixels left of
 * its own column, so the default kept it in the same column. Up and down move
 * between cards as usual.
 */
function boardKeyboardCoordinates(stageKeys: StageKey[]): KeyboardCoordinateGetter {
  return (event, args) => {
    if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return sortableKeyboardCoordinates(event, args);
    event.preventDefault();
    const { active, collisionRect, droppableRects } = args.context;
    if (!active || !collisionRect) return undefined;
    const rects = stageKeys.map((key) => droppableRects.get(columnId(key)));
    const centre = collisionRect.left + collisionRect.width / 2;
    const current = rects.findIndex((rect) => rect && centre >= rect.left && centre <= rect.left + rect.width);
    const next = rects[current + (event.code === "ArrowRight" ? 1 : -1)];
    if (current === -1 || !next) return undefined;
    const lowest = next.top + Math.max(next.height - collisionRect.height, 0);
    return { x: next.left, y: Math.min(Math.max(collisionRect.top, next.top), lowest) };
  };
}

interface Origin {
  columns: Columns;
  stage: StageKey;
  index: number;
}

interface Props {
  deals: Deal[];
  stages: Stage[];
  onAdd: (stage: StageKey) => void;
}

/**
 * The pipeline (R20 to R27). While a card is dragged, and until the server answers,
 * the board shows its own copy of the columns, so every total changes at once (R24).
 * On success the server's board replaces it; on failure the copy is dropped, which
 * puts the card back.
 */
export function Board({ deals, stages, onAdd }: Props) {
  const navigate = useNavigate();
  const move = useMoveDeal();
  const serverColumns = useMemo(() => toColumns(deals, stages), [deals, stages]);
  const [local, setLocal] = useState<Columns | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const lastDragEnd = useRef(0);
  const columns = local ?? serverColumns;
  const today = todayIso();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates(stages.map((stage) => stage.key)),
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const stageOf = (id: UniqueIdentifier): StageKey | null =>
    isColumn(id) ? (String(id).slice(COLUMN_PREFIX.length) as StageKey) : (findCard(columns, Number(id))?.stage ?? null);

  // Over a column that has cards, aim at the nearest card, so a drop lands between cards.
  const collisionDetection: CollisionDetection = (args) => {
    const pointer = pointerWithin(args);
    const hits = pointer.length > 0 ? pointer : rectIntersection(args);
    const overId = getFirstCollision(hits, "id");
    if (overId == null) return [];
    if (isColumn(overId)) {
      const ids = new Set(columns[stageOf(overId)!].map((deal) => deal.id));
      const cards = args.droppableContainers.filter((c) => ids.has(Number(c.id)));
      if (cards.length > 0) return closestCenter({ ...args, droppableContainers: cards });
    }
    return [{ id: overId }];
  };

  function onDragStart({ active }: DragStartEvent) {
    const from = findCard(columns, Number(active.id));
    if (!from) return;
    setOrigin({ columns, ...from });
    setActiveId(Number(active.id));
  }

  // Moving into another column: show the card there straight away, with its new figures.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !origin) return;
    const from = stageOf(active.id);
    const to = stageOf(over.id);
    if (!from || !to || from === to) return;
    const target = columns[to];
    let index = target.length;
    if (!isColumn(over.id)) {
      const overIndex = target.findIndex((deal) => deal.id === Number(over.id));
      const translated = active.rect.current.translated;
      const below = translated && translated.top > over.rect.top + over.rect.height / 2;
      index = overIndex + (below ? 1 : 0);
    }
    setLocal(moveCard(origin.columns, Number(active.id), to, index, stages, today));
  }

  function finish() {
    setOrigin(null);
    setActiveId(null);
    lastDragEnd.current = Date.now();
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const start = origin;
    finish();
    if (!start || !over) {
      setLocal(null);
      return;
    }
    const id = Number(active.id);
    const stage = stageOf(active.id)!;
    const current = columns[stage];
    let index = current.findIndex((deal) => deal.id === id);
    if (!isColumn(over.id)) {
      const overIndex = current.findIndex((deal) => deal.id === Number(over.id));
      if (overIndex !== -1) index = overIndex;
    }
    if (stage === start.stage && index === start.index) {
      setLocal(null);
      return;
    }
    setLocal(moveCard(start.columns, id, stage, index, stages, today));
    move.mutate({ id, stage, index }, { onSettled: () => setLocal(null) });
  }

  function onDragCancel() {
    finish();
    setLocal(null);
  }

  function openDeal(deal: Deal) {
    if (Date.now() - lastDragEnd.current < 250) return;
    navigate(`/deals/${deal.id}`);
  }

  const totals = boardTotals(columns, stages);
  const openStages = stages.filter((stage) => stage.open);
  const active = activeId === null ? null : (Object.values(columns).flat().find((deal) => deal.id === activeId) ?? null);
  const activeStage = active ? stages.find((s) => s.key === active.stage) : undefined;
  const movedAway = origin && active && active.stage !== origin.stage;

  return (
    <>
      <section className="panel board-summary" aria-label="Pipeline summary">
        <div className="summary-stat">
          <p className="summary-label">Open value (USD)</p>
          <p className="summary-value mono" data-testid="summary-value">
            {money(totals.value)}
          </p>
        </div>
        <div className="summary-stat">
          <p className="summary-label">Expected revenue (USD)</p>
          <p className="summary-value mono" data-testid="summary-expected">
            {money(totals.expected)}
          </p>
        </div>
        <div className="summary-stat">
          <p className="summary-label">Past close date</p>
          <p className={totals.late > 0 ? "summary-value mono warn" : "summary-value mono"} data-testid="summary-late">
            {totals.late} {totals.late === 1 ? "deal" : "deals"}
          </p>
        </div>
        <PipelineStrip
          segments={openStages.map((stage) => ({ key: stage.key, label: stage.label, ...columnTotals(columns[stage.key]) }))}
        />
      </section>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        accessibility={{ screenReaderInstructions: instructions }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="board">
          {stages.map((stage) => (
            <Column
              key={stage.key}
              stage={stage}
              deals={columns[stage.key]}
              openValue={totals.value}
              onAdd={onAdd}
              onOpen={openDeal}
              landingId={movedAway ? activeId : null}
              gap={movedAway && origin.stage === stage.key ? { index: origin.index, to: activeStage?.label ?? "" } : null}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {active ? (
            <div className={active.stage === "closed_won" || active.stage === "lost" ? "deal-card dragging done" : "deal-card dragging"}>
              <DealCardBody deal={active} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

interface ColumnProps {
  stage: Stage;
  deals: Deal[];
  openValue: number;
  onAdd: (stage: StageKey) => void;
  onOpen: (deal: Deal) => void;
  landingId: number | null;
  /** Where the dragged card came from, when it has moved to another column. */
  gap: { index: number; to: string } | null;
}

function Column({ stage, deals, openValue, onAdd, onOpen, landingId, gap }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: columnId(stage.key) });
  const totals = columnTotals(deals);
  const share = openValue > 0 ? (totals.value / openValue) * 100 : 0;
  const slot = (
    <div className="card-gap" aria-hidden="true">
      Moving to {gap?.to}
    </div>
  );

  return (
    <section className={stage.open ? "column" : "column closed"} aria-label={`${stage.label} column`}>
      <header className="column-head">
        <div className="column-row">
          <h2 className="column-name">
            <i style={{ background: stageColor(stage.key) }} aria-hidden="true" />
            {stage.label}
          </h2>
          <span className="column-count mono" aria-label={`${totals.count} deals`}>
            {totals.count}
          </span>
        </div>
        <p className="column-value mono">{moneyShort(totals.value)}</p>
        <p className="column-sub">{stage.open ? `Expected ${moneyShort(totals.expected)}` : "All time"}</p>
        {stage.open && (
          <div className="column-share" aria-hidden="true">
            <span style={{ width: `${share}%`, background: stageColor(stage.key) }} />
          </div>
        )}
      </header>
      <SortableContext id={stage.key} items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="column-cards">
          {deals.map((deal, index) => (
            <Fragment key={deal.id}>
              {gap && gap.index === index && slot}
              <SortableDealCard deal={deal} closed={!stage.open} landing={deal.id === landingId} onOpen={onOpen} />
            </Fragment>
          ))}
          {gap && gap.index >= deals.length && slot}
        </div>
      </SortableContext>
      <button type="button" className="add-deal" aria-label={`Add deal to ${stage.label}`} onClick={() => onAdd(stage.key)}>
        <Plus size={15} aria-hidden="true" />
        Add deal
      </button>
    </section>
  );
}
