import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeResponse, mockApi, renderApp, requests } from "../../test/renderApp";
import type { Deal, Stage, StageKey } from "../deals/types";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "qualified", label: "Qualified", probability: 20, open: true },
  { key: "showing", label: "Showing", probability: 40, open: true },
  { key: "closed_won", label: "Closed (Won)", probability: 100, open: false },
];

function deal(id: number, name: string, stage: StageKey, position: number, value: number): Deal {
  const probability = stages.find((s) => s.key === stage)!.probability;
  return {
    id,
    name,
    contact_id: null,
    contact_name: null,
    organization_id: null,
    organization_name: null,
    stage,
    value,
    probability,
    expected_value: (value * probability) / 100,
    close_date: "2027-03-01",
    position,
    notes: null,
    late: false,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };
}

const board: Deal[] = [
  deal(1, "Birch Lane", "new_lead", 0, 100000),
  deal(2, "Cedar Court", "new_lead", 1, 200000),
  deal(3, "Harbor Point", "qualified", 0, 400000),
];

// jsdom does no layout, so dnd-kit would see every column and card at 0,0 with no size.
// Lay the board out as a browser would: columns side by side, cards stacked in them.
const COLUMN_WIDTH = 300;
const CARDS_TOP = 200;
const CARD_HEIGHT = 110;

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  };
}

function columnIndex(element: Element) {
  const column = element.closest("section.column");
  return column ? Array.from(document.querySelectorAll("section.column")).indexOf(column) : -1;
}

function cardRect(card: Element) {
  const slot = Array.from(card.parentElement!.children).indexOf(card);
  return rect(columnIndex(card) * COLUMN_WIDTH + 10, CARDS_TOP + slot * CARD_HEIGHT, 260, 100);
}

function layout(this: HTMLElement): DOMRect {
  if (this.classList.contains("column-cards")) {
    return rect(columnIndex(this) * COLUMN_WIDTH, CARDS_TOP, 280, 800);
  }
  if (this.classList.contains("deal-card") && this.closest("section.column")) return cardRect(this);
  // The card shown while dragging starts where the picked-up card is.
  if (this.classList.contains("dragging")) {
    const name = this.querySelector(".card-name")?.textContent;
    const card = Array.from(document.querySelectorAll("section.column .deal-card")).find(
      (c) => c.querySelector(".card-name")?.textContent === name,
    );
    if (card) return cardRect(card);
  }
  return rect(0, 0, 0, 0);
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(layout);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function column(label: string) {
  return screen.getByRole("region", { name: `${label} column` });
}

function cardNames(label: string) {
  return within(column(label))
    .queryAllByRole("button", { name: /^(?!Add deal)/ })
    .map((card) => card.querySelector(".card-name")!.textContent);
}

async function pickUp(name: string) {
  const user = userEvent.setup();
  const card = await screen.findByRole("button", { name: new RegExp(name) });
  card.focus();
  await user.keyboard("[Space]");
  return user;
}

describe("Moving a card with the keyboard", () => {
  it("moves it to the next column, updating the totals at once, and saves the move", async () => {
    let current = board;
    mockApi({
      "GET /deals": () => current,
      "GET /stages": stages,
      "POST /deals/1/move": () => {
        current = [
          deal(2, "Cedar Court", "new_lead", 0, 200000),
          deal(1, "Birch Lane", "qualified", 0, 100000),
          deal(3, "Harbor Point", "qualified", 1, 400000),
        ];
        return current;
      },
    });
    renderApp("/pipeline");

    const user = await pickUp("Birch Lane");
    await user.keyboard("[ArrowRight]");

    expect(cardNames("Qualified")).toContain("Birch Lane");
    expect(within(column("New Lead")).getByText("Moving to Qualified")).toBeInTheDocument();
    expect(within(column("Qualified")).getByLabelText("2 deals")).toBeInTheDocument();
    expect(screen.getByTestId("summary-expected")).toHaveTextContent("$120,000");

    await user.keyboard("[Space]");

    await waitFor(() =>
      expect(requests).toContainEqual({
        method: "POST",
        path: "/deals/1/move",
        body: { stage: "qualified", index: expect.any(Number) },
      }),
    );
    await waitFor(() => expect(cardNames("Qualified")).toEqual(["Birch Lane", "Harbor Point"]));
    expect(cardNames("New Lead")).toEqual(["Cedar Court"]);
    expect(screen.queryByText(/Moving to/)).not.toBeInTheDocument();
  });

  it("puts the card back, and says why, when the server refuses the move", async () => {
    mockApi({
      "GET /deals": board,
      "GET /stages": stages,
      "POST /deals/1/move": new FakeResponse(404, { detail: "Deal not found" }),
    });
    renderApp("/pipeline");

    const user = await pickUp("Birch Lane");
    await user.keyboard("[ArrowRight]");
    expect(cardNames("Qualified")).toContain("Birch Lane");
    await user.keyboard("[Space]");

    expect(await screen.findByText("Deal not found")).toBeInTheDocument();
    await waitFor(() => expect(cardNames("New Lead")).toEqual(["Birch Lane", "Cedar Court"]));
    expect(cardNames("Qualified")).toEqual(["Harbor Point"]);
  });

  it("moves back to the previous column with the left arrow, and into a closed column", async () => {
    mockApi({ "GET /deals": board, "GET /stages": stages });
    renderApp("/pipeline");

    const user = await pickUp("Harbor Point");
    await user.keyboard("[ArrowLeft]");
    expect(cardNames("New Lead")).toContain("Harbor Point");
    expect(cardNames("Qualified")).toEqual([]);

    await user.keyboard("[ArrowRight][ArrowRight][ArrowRight]");
    expect(cardNames("Closed (Won)")).toEqual(["Harbor Point"]);
    expect(screen.getByTestId("summary-value")).toHaveTextContent("$300,000");
    await user.keyboard("{Escape}");
  });

  it("goes nowhere past the last column", async () => {
    mockApi({ "GET /deals": [deal(5, "Oak Street", "closed_won", 0, 300000)], "GET /stages": stages });
    renderApp("/pipeline");

    const user = await pickUp("Oak Street");
    await user.keyboard("[ArrowRight]");

    expect(cardNames("Closed (Won)")).toEqual(["Oak Street"]);
    await user.keyboard("{Escape}");
  });

  it("drops a card into an empty column", async () => {
    mockApi({ "GET /deals": board, "GET /stages": stages, "POST /deals/1/move": board });
    renderApp("/pipeline");

    const user = await pickUp("Birch Lane");
    await user.keyboard("[ArrowRight][ArrowRight]");
    expect(cardNames("Showing")).toEqual(["Birch Lane"]);
    await user.keyboard("[Space]");

    await waitFor(() =>
      expect(requests).toContainEqual({ method: "POST", path: "/deals/1/move", body: { stage: "showing", index: 0 } }),
    );
  });

  it("puts the card back when the move is cancelled with Escape", async () => {
    mockApi({ "GET /deals": board, "GET /stages": stages });
    renderApp("/pipeline");

    const user = await pickUp("Birch Lane");
    await user.keyboard("[ArrowRight]");
    expect(cardNames("Qualified")).toContain("Birch Lane");
    await user.keyboard("{Escape}");

    expect(cardNames("New Lead")).toEqual(["Birch Lane", "Cedar Court"]);
    expect(cardNames("Qualified")).toEqual(["Harbor Point"]);
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("saves nothing when the card is dropped where it started", async () => {
    mockApi({ "GET /deals": board, "GET /stages": stages });
    renderApp("/pipeline");

    const user = await pickUp("Birch Lane");
    await user.keyboard("[Space]");

    expect(cardNames("New Lead")).toEqual(["Birch Lane", "Cedar Court"]);
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("reorders a column with the down arrow", async () => {
    mockApi({
      "GET /deals": board,
      "GET /stages": stages,
      "POST /deals/1/move": [
        deal(2, "Cedar Court", "new_lead", 0, 200000),
        deal(1, "Birch Lane", "new_lead", 1, 100000),
        deal(3, "Harbor Point", "qualified", 0, 400000),
      ],
    });
    renderApp("/pipeline");

    const user = await pickUp("Birch Lane");
    await user.keyboard("[ArrowDown]");
    await user.keyboard("[Space]");

    await waitFor(() =>
      expect(requests).toContainEqual({ method: "POST", path: "/deals/1/move", body: { stage: "new_lead", index: 1 } }),
    );
  });
});

/** Press on a card, drag it through the given points, and let go at the last one. */
async function drag(name: string, points: { x: number; y: number }[]) {
  const card = await screen.findByRole("button", { name: new RegExp(name) });
  const box = card.getBoundingClientRect();
  fireEvent.mouseDown(card, { button: 0, clientX: box.left + 20, clientY: box.top + 20 });
  for (const { x, y } of points) fireEvent.mouseMove(document, { clientX: x, clientY: y });
  const last = points[points.length - 1];
  fireEvent.mouseUp(document, { clientX: last.x, clientY: last.y });
  return card;
}

describe("Dragging a card with the mouse", () => {
  it("drops it between the cards of another column, and saves the move", async () => {
    mockApi({
      "GET /deals": board,
      "GET /stages": stages,
      "POST /deals/3/move": board,
    });
    renderApp("/pipeline");

    // Harbor Point, from Qualified to just below Birch Lane, the first card in New Lead.
    await drag("Harbor Point", [
      { x: 340, y: 230 },
      { x: 150, y: 290 },
      { x: 150, y: 295 },
    ]);

    await waitFor(() =>
      expect(requests).toContainEqual({
        method: "POST",
        path: "/deals/3/move",
        body: { stage: "new_lead", index: expect.any(Number) },
      }),
    );
  });

  it("doesn't open the deal when the drag ends on it", async () => {
    mockApi({ "GET /deals": board, "GET /stages": stages, "POST /deals/3/move": board });
    renderApp("/pipeline");

    await drag("Harbor Point", [
      { x: 340, y: 230 },
      { x: 150, y: 290 },
    ]);
    expect(requests.some((r) => r.path === "/deals/3/move")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Harbor Point/ }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole("heading", { level: 1, name: "Pipeline" })).toBeInTheDocument();
    expect(requests.some((r) => r.path === "/deals/3")).toBe(false);
  });

  it("puts the card back when it's dropped off the board", async () => {
    mockApi({ "GET /deals": board, "GET /stages": stages });
    renderApp("/pipeline");

    await drag("Birch Lane", [
      { x: 40, y: 260 },
      { x: 5000, y: 5000 },
    ]);

    expect(cardNames("New Lead")).toEqual(["Birch Lane", "Cedar Court"]);
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });
});
