import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { queryClient } from "../../api/client";
import { FakeResponse, mockApi, requests } from "../../test/renderApp";
import { ToastProvider } from "../../ui/Toast";
import type { Contact } from "../contacts/types";
import type { Deal } from "../deals/types";
import { LogActivityDialog } from "./LogActivityDialog";

const lucy: Contact = {
  id: 3,
  first_name: "Lucy",
  last_name: "Chen",
  name: "Lucy Chen",
  email: null,
  phone: null,
  job_title: null,
  organization_id: 7,
  organization_name: "Harbor Point Lending",
  status: "lead",
  last_activity_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const elmStreet: Deal = {
  id: 5,
  name: "12 Elm Street purchase",
  contact_id: 3,
  contact_name: "Lucy Chen",
  organization_id: null,
  organization_name: null,
  stage: "offer",
  value: 485000,
  probability: 60,
  expected_value: 291000,
  close_date: "2026-12-15",
  position: 0,
  notes: null,
  late: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderDialog(routes: Record<string, unknown> = {}) {
  mockApi({ "GET /contacts": [lucy], "GET /deals": [elmStreet], ...routes });
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ToastProvider>
          <LogActivityDialog open onOpenChange={onOpenChange} />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onOpenChange, dialog: within(screen.getByRole("dialog", { name: "Log activity" })) };
}

describe("logging an activity from the dashboard", () => {
  it("asks for a contact or deal before saving", async () => {
    const user = userEvent.setup();
    const { dialog, onOpenChange } = renderDialog();

    await user.type(dialog.getByLabelText("Description"), "Coffee meeting");
    await user.click(dialog.getByRole("button", { name: "Save" }));

    expect(dialog.getByText("Choose a contact or deal")).toBeInTheDocument();
    expect(requests.some((r) => r.method === "POST")).toBe(false);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("logs it on the chosen contact and closes", async () => {
    const user = userEvent.setup();
    const { dialog, onOpenChange } = renderDialog({
      "POST /activities": (body: unknown) => ({ id: 30, ...(body as object) }),
    });

    await user.click(dialog.getByRole("button", { name: "Save" }));
    await user.click(dialog.getByRole("button", { name: "Contact" }));
    await user.click(await screen.findByRole("option", { name: /Lucy Chen/ }));
    expect(dialog.queryByText("Choose a contact or deal")).not.toBeInTheDocument();
    await user.type(dialog.getByLabelText("Description"), "Coffee meeting");
    await user.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(requests.find((r) => r.method === "POST")?.body).toMatchObject({
      description: "Coffee meeting",
      contact_id: 3,
    });
    expect((await screen.findAllByText("Activity saved")).length).toBeGreaterThan(0);
  });

  it("logs it on the chosen deal", async () => {
    const user = userEvent.setup();
    const { dialog, onOpenChange } = renderDialog({
      "POST /activities": (body: unknown) => ({ id: 31, ...(body as object) }),
    });

    await user.click(dialog.getByRole("radio", { name: "A deal" }));
    await user.click(dialog.getByRole("button", { name: "Deal" }));
    const option = await screen.findByRole("option", { name: /12 Elm Street purchase/ });
    expect(option).toHaveTextContent("Lucy Chen");
    await user.click(option);
    await user.click(dialog.getByRole("radio", { name: "Call" }));
    await user.type(dialog.getByLabelText("Description"), "Discussed the inspection");
    await user.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const body = requests.find((r) => r.method === "POST")?.body;
    expect(body).toMatchObject({ type: "call", deal_id: 5 });
    expect(body).not.toHaveProperty("contact_id");
  });

  it("clears the choice when switching between contact and deal", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Contact" }));
    await user.click(await screen.findByRole("option", { name: /Lucy Chen/ }));
    expect(dialog.getByRole("button", { name: "Contact" })).toHaveTextContent("Lucy Chen");

    await user.click(dialog.getByRole("radio", { name: "A deal" }));
    await user.click(dialog.getByRole("radio", { name: "A contact" }));

    expect(dialog.getByRole("button", { name: "Contact" })).toHaveTextContent("None");
  });

  it("offers no deals when they can't be loaded", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog({ "GET /deals": new FakeResponse(500) });
    await waitFor(() => expect(requests.some((r) => r.path === "/deals")).toBe(true));

    await user.click(dialog.getByRole("radio", { name: "A deal" }));
    await user.click(dialog.getByRole("button", { name: "Deal" }));

    expect(await screen.findAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("None");
  });

  it("stays open and shows the server's reason when saving fails", async () => {
    const user = userEvent.setup();
    const { dialog, onOpenChange } = renderDialog({
      "POST /activities": new FakeResponse(404, { detail: "Contact not found" }),
    });

    await user.click(dialog.getByRole("button", { name: "Contact" }));
    await user.click(await screen.findByRole("option", { name: /Lucy Chen/ }));
    await user.type(dialog.getByLabelText("Description"), "Coffee meeting");
    await user.click(dialog.getByRole("button", { name: "Save" }));

    expect((await screen.findAllByText("Contact not found")).length).toBeGreaterThan(0);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes on Cancel", async () => {
    const user = userEvent.setup();
    const { dialog, onOpenChange } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
