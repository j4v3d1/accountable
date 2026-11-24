import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Stage } from "./types";
import { DealForm } from "./DealForm";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "qualified", label: "Qualified", probability: 20, open: true },
  { key: "showing", label: "Showing", probability: 40, open: true },
  { key: "offer", label: "Offer", probability: 60, open: true },
  { key: "under_contract", label: "Under Contract", probability: 90, open: true },
  { key: "closed_won", label: "Closed (Won)", probability: 100, open: false },
  { key: "lost", label: "Lost", probability: 0, open: false },
];

function renderForm(props: Partial<Parameters<typeof DealForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <DealForm stages={stages} contacts={[]} organizations={[]} onSubmit={onSubmit} onCancel={() => {}} {...props} />,
  );
  return onSubmit;
}

describe("DealForm", () => {
  it("needs a name, a value and a close date", async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Enter a name");
    expect(screen.getByLabelText("Value (USD)")).toHaveAccessibleDescription("Enter a whole dollar amount, 0 or more");
    expect(screen.getByLabelText("Close date")).toHaveAccessibleDescription("Choose a close date");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses values that aren't whole dollars and probabilities over 100", async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();

    await user.type(screen.getByLabelText("Value (USD)"), "-5");
    await user.clear(screen.getByLabelText("Probability (%)"));
    await user.type(screen.getByLabelText("Probability (%)"), "120");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Value (USD)")).toHaveAccessibleDescription("Enter a whole dollar amount, 0 or more");
    expect(screen.getByLabelText("Probability (%)")).toHaveAccessibleDescription("Enter a whole number from 0 to 100");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("starts at New Lead with its probability, or at the stage it's given", () => {
    renderForm({ defaultStage: "offer" });

    expect(screen.getByLabelText("Stage")).toHaveValue("offer");
    expect(screen.getByLabelText("Probability (%)")).toHaveValue(60);
  });

  it("fills in a stage's usual probability when the stage is chosen", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByLabelText("Probability (%)")).toHaveValue(10);

    await user.selectOptions(screen.getByLabelText("Stage"), "showing");

    expect(screen.getByLabelText("Probability (%)")).toHaveValue(40);
  });

  it("keeps a typed probability until the stage changes again", async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();

    await user.type(screen.getByLabelText("Name"), "142 Maple Ave purchase");
    await user.selectOptions(screen.getByLabelText("Stage"), "offer");
    await user.clear(screen.getByLabelText("Probability (%)"));
    await user.type(screen.getByLabelText("Probability (%)"), "65");
    await user.type(screen.getByLabelText("Value (USD)"), "585000");
    await user.type(screen.getByLabelText("Close date"), "2026-12-30");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "142 Maple Ave purchase",
      contact_id: null,
      organization_id: null,
      stage: "offer",
      value: 585000,
      probability: 65,
      close_date: "2026-12-30",
      notes: null,
    });

    await user.selectOptions(screen.getByLabelText("Stage"), "under_contract");
    expect(screen.getByLabelText("Probability (%)")).toHaveValue(90);
  });
});
