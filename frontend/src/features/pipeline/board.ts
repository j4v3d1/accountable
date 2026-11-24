/**
 * The pipeline board's local copy of the deals, and the instant totals while a
 * card is dragged (R24). Pure functions: a move returns a new board and leaves
 * the old one as it was, so a rollback just puts the old one back.
 */
import type { Deal, Stage, StageKey } from "../deals/types";

export type Columns = Record<StageKey, Deal[]>;

export function toColumns(deals: Deal[], stages: Stage[]): Columns {
  const columns = Object.fromEntries(stages.map((stage) => [stage.key, [] as Deal[]])) as Columns;
  for (const deal of [...deals].sort((a, b) => a.position - b.position)) {
    columns[deal.stage]?.push(deal);
  }
  return columns;
}

export function findCard(columns: Columns, dealId: number): { stage: StageKey; index: number } | null {
  for (const [stage, deals] of Object.entries(columns) as [StageKey, Deal[]][]) {
    const index = deals.findIndex((deal) => deal.id === dealId);
    if (index !== -1) return { stage, index };
  }
  return null;
}

/** What the server will do to a deal that changes stage (R14, R15, R16), shown before it answers. */
function withStage(deal: Deal, stage: Stage, today: string): Deal {
  const closeDate = stage.open ? deal.close_date : today;
  return {
    ...deal,
    stage: stage.key,
    probability: stage.probability,
    expected_value: (deal.value * stage.probability) / 100,
    close_date: closeDate,
    late: stage.open && closeDate < today,
  };
}

/** Put a card at `index` in `stage`'s column, the index counted in the final order. */
export function moveCard(columns: Columns, dealId: number, stage: StageKey, index: number, stages: Stage[], today: string): Columns {
  const from = findCard(columns, dealId);
  if (!from) return columns;
  const card = columns[from.stage][from.index];
  const moved = from.stage === stage ? card : withStage(card, stages.find((s) => s.key === stage)!, today);
  const next = { ...columns, [from.stage]: columns[from.stage].filter((deal) => deal.id !== dealId) };
  const target = [...next[stage]];
  target.splice(Math.min(index, target.length), 0, moved);
  next[stage] = target;
  return next;
}

export function columnTotals(deals: Deal[]) {
  return {
    count: deals.length,
    value: deals.reduce((sum, deal) => sum + deal.value, 0),
    expected: deals.reduce((sum, deal) => sum + deal.expected_value, 0),
  };
}

/** Totals over open deals only, as the intent says, and the number that are late (R21). */
export function boardTotals(columns: Columns, stages: Stage[]) {
  const open = stages.filter((stage) => stage.open).flatMap((stage) => columns[stage.key]);
  return { ...columnTotals(open), late: open.filter((deal) => deal.late).length };
}
