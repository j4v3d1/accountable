import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AddedBy } from "./AddedBy";

const added = {
  created_by_name: "Maya Torres",
  updated_by_name: "Maya Torres",
  created_at: "2026-11-03T15:00:00Z",
  updated_at: "2026-11-03T15:00:00Z",
};

describe("AddedBy", () => {
  it("says who added the record and when", () => {
    render(<AddedBy record={added} />);

    expect(screen.getByText(/^Added by/)).toHaveTextContent("Added by Maya Torres on Nov 3, 2026");
    expect(screen.queryByText(/Last changed by/)).not.toBeInTheDocument();
  });

  it("says who last changed it once someone has", () => {
    render(<AddedBy record={{ ...added, updated_by_name: "Sam Okafor", updated_at: "2026-11-20T16:30:00Z" }} />);

    expect(screen.getByText(/^Added by/)).toHaveTextContent("Added by Maya Torres on Nov 3, 2026");
    expect(screen.getByText(/^Last changed by/)).toHaveTextContent("Last changed by Sam Okafor on Nov 20, 2026");
  });

  it("counts a change by the same person", () => {
    render(<AddedBy record={{ ...added, updated_at: "2026-11-04T15:00:00Z" }} />);

    expect(screen.getByText(/^Last changed by/)).toHaveTextContent("Last changed by Maya Torres on Nov 4, 2026");
  });

  it("credits sample records to Sample data", () => {
    render(<AddedBy record={{ ...added, created_by_name: "Sample data", updated_by_name: "Sample data" }} />);

    expect(screen.getByText(/^Added by/)).toHaveTextContent("Added by Sample data on Nov 3, 2026");
  });
});
