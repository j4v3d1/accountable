import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LateBadge, ProbabilityDots } from "./StageChip";

describe("LateBadge", () => {
  it("says Late, with the missed close date when it's given (R16)", () => {
    const { rerender } = render(<LateBadge closeDate="2026-11-10" />);
    expect(screen.getByText("Late · Nov 10")).toBeInTheDocument();

    rerender(<LateBadge />);
    expect(screen.getByText("Late")).toBeInTheDocument();
  });
});

describe("ProbabilityDots", () => {
  it("fills one dot for every 20% of probability", () => {
    const { container } = render(<ProbabilityDots probability={60} />);

    expect(screen.getByRole("img", { name: "60% probability" })).toBeInTheDocument();
    expect(container.querySelectorAll(".on")).toHaveLength(3);
  });
});
