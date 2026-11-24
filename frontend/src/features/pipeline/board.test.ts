import { describe, expect, it } from "vitest";
import type { Deal, Stage, StageKey } from "../deals/types";
import { boardTotals, columnTotals, findCard, moveCard, toColumns } from "./board";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "qualified", label: "Qualified", probability: 20, open: true },
  { key: "showing", label: "Showing", probability: 40, open: true },
  { key: "offer", label: "Offer", probability: 60, open: true },
  { key: "under_contract", label: "Under Contract", probability: 90, open: true },
  { key: "closed_won", label: "Closed (Won)", probability: 100, open: false },
  { key: "lost", label: "Lost", probability: 0, open: false },
];
const TODAY = "2026-11-18";

let nextId = 1;
function deal(name: string, stage: StageKey, position: number, extra: Partial<Deal> = {}): Deal {
  const probability = extra.probability ?? stages.find((s) => s.key === stage)!.probability;
  const value = extra.value ?? 100000;
  return {
    id: nextId++,
    name,
    contact_id: null,
    contact_name: null,
    organization_id: null,
    organization_name: null,
    stage,
    value,
    probability,
    expected_value: (value * probability) / 100,
    close_date: "2027-01-01",
    position,
    notes: null,
    late: false,
    created_at: "",
    updated_at: "",
    ...extra,
  };
}

function names(columns: ReturnType<typeof toColumns>, stage: StageKey) {
  return columns[stage].map((d) => d.name);
}

function sampleBoard() {
  return toColumns(
    [
      deal("O2", "offer", 1, { value: 200000 }),
      deal("S1", "showing", 0, { value: 300000, probability: 45 }),
      deal("O1", "offer", 0, { value: 100000 }),
      deal("S2", "showing", 1, { value: 400000 }),
      deal("L1", "qualified", 0, { value: 500000, close_date: "2026-11-01", late: true }),
      deal("W1", "closed_won", 0, { value: 900000 }),
    ],
    stages,
  );
}

describe("toColumns", () => {
  it("groups deals by stage, in position order, with every stage present", () => {
    const columns = sampleBoard();

    expect(names(columns, "offer")).toEqual(["O1", "O2"]);
    expect(names(columns, "showing")).toEqual(["S1", "S2"]);
    expect(columns.under_contract).toEqual([]);
    expect(Object.keys(columns)).toEqual(stages.map((s) => s.key));
  });
});

describe("moveCard", () => {
  it("puts a card at the given index in another column", () => {
    const columns = sampleBoard();
    const moved = moveCard(columns, findId(columns, "S1"), "offer", 1, stages, TODAY);

    expect(names(moved, "offer")).toEqual(["O1", "S1", "O2"]);
    expect(names(moved, "showing")).toEqual(["S2"]);
  });

  it("reorders within a column, using the index in the final order", () => {
    const columns = toColumns(
      [deal("A", "offer", 0), deal("B", "offer", 1), deal("C", "offer", 2), deal("D", "offer", 3)],
      stages,
    );

    expect(names(moveCard(columns, findId(columns, "A"), "offer", 2, stages, TODAY), "offer")).toEqual([
      "B",
      "C",
      "A",
      "D",
    ]);
    expect(names(moveCard(columns, findId(columns, "D"), "offer", 1, stages, TODAY), "offer")).toEqual([
      "A",
      "D",
      "B",
      "C",
    ]);
  });

  it("moves a card into an empty column, and past the end puts it last", () => {
    const columns = sampleBoard();

    expect(
      names(moveCard(columns, findId(columns, "S2"), "under_contract", 0, stages, TODAY), "under_contract"),
    ).toEqual(["S2"]);
    expect(names(moveCard(columns, findId(columns, "S2"), "offer", 99, stages, TODAY), "offer")).toEqual([
      "O1",
      "O2",
      "S2",
    ]);
  });

  it("gives a card its new stage's probability and expected value, but keeps a hand-set one within its column", () => {
    const columns = sampleBoard();

    const across = moveCard(columns, findId(columns, "S1"), "offer", 0, stages, TODAY);
    expect(across.offer[0]).toMatchObject({ stage: "offer", probability: 60, expected_value: 180000 });

    const within = moveCard(columns, findId(columns, "S1"), "showing", 1, stages, TODAY);
    expect(within.showing[1]).toMatchObject({ stage: "showing", probability: 45 });
  });

  it("clears the late flag and sets the close date to today when a late deal is won", () => {
    const columns = sampleBoard();

    const won = moveCard(columns, findId(columns, "L1"), "closed_won", 0, stages, TODAY);

    expect(won.closed_won[0]).toMatchObject({ name: "L1", late: false, probability: 100, close_date: TODAY });
  });

  it("leaves the board it was given untouched, so a rollback restores it exactly", () => {
    const columns = sampleBoard();
    const before = structuredClone(columns);

    moveCard(columns, findId(columns, "S1"), "lost", 0, stages, TODAY);

    expect(columns).toEqual(before);
  });
});

describe("totals", () => {
  it("adds up each column's count, value and expected revenue", () => {
    expect(columnTotals(sampleBoard().showing)).toEqual({ count: 2, value: 700000, expected: 135000 + 160000 });
  });

  it("adds up the open deals on the board, and counts the late ones", () => {
    expect(boardTotals(sampleBoard(), stages)).toEqual({
      count: 5,
      value: 1500000,
      expected: 60000 + 120000 + 135000 + 160000 + 100000,
      late: 1,
    });
  });

  it("updates straight away when a card moves", () => {
    const columns = sampleBoard();

    const moved = moveCard(columns, findId(columns, "L1"), "closed_won", 0, stages, TODAY);

    expect(boardTotals(moved, stages)).toEqual({ count: 4, value: 1000000, expected: 475000, late: 0 });
    expect(columnTotals(moved.closed_won)).toEqual({ count: 2, value: 1400000, expected: 1400000 });
  });
});

function findId(columns: ReturnType<typeof toColumns>, name: string) {
  return Object.values(columns)
    .flat()
    .find((d) => d.name === name)!.id;
}

describe("findCard", () => {
  it("finds a card's column and index", () => {
    const columns = sampleBoard();

    expect(findCard(columns, findId(columns, "O2"))).toEqual({ stage: "offer", index: 1 });
    expect(findCard(columns, 999)).toBeNull();
  });
});
