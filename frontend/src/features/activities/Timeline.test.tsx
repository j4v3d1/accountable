import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeResponse, mockApi, renderApp, requests } from "../../test/renderApp";
import type { ContactDetail } from "../contacts/types";
import type { Activity } from "./types";

function activity(id: number, description: string, fields: Partial<Activity> = {}): Activity {
  return {
    id,
    type: "note",
    contact_id: 3,
    contact_name: "Lucy Chen",
    deal_id: null,
    deal_name: null,
    description,
    occurred_at: "2026-11-20T15:00:00Z",
    follow_up_date: null,
    done: false,
    from_stage: null,
    to_stage: null,
    created_at: "2026-11-20T15:00:00Z",
    updated_at: "2026-11-20T15:00:00Z",
    ...fields,
  };
}

function lucy(timeline: Activity[]): ContactDetail {
  return {
    id: 3,
    first_name: "Lucy",
    last_name: "Chen",
    name: "Lucy Chen",
    email: null,
    phone: null,
    job_title: null,
    organization_id: null,
    organization_name: null,
    organization: null,
    status: "lead",
    last_activity_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deals: [],
    timeline,
  };
}

const call = activity(11, "Called about the counteroffer", {
  type: "call",
  deal_id: 5,
  deal_name: "12 Elm Street purchase",
  follow_up_date: "2020-01-06",
});
const email = activity(12, "Sent the pre-approval letter", { type: "email", follow_up_date: "2099-12-31" });
const note = activity(13, "Prefers mornings", { follow_up_date: "2026-11-27", done: true });
const stageChange = activity(14, "Moved from Showing to Offer", {
  type: "stage_change",
  deal_id: 5,
  deal_name: "12 Elm Street purchase",
  from_stage: "showing",
  to_stage: "offer",
});

function timeline() {
  return within(screen.getByRole("region", { name: "Timeline" }));
}

function entry(description: string) {
  return screen.getByText(description).closest("li")!;
}

async function openContact(entries: Activity[], routes: Record<string, unknown> = {}) {
  mockApi({ "GET /contacts/3": lucy(entries), ...routes });
  renderApp("/contacts/3");
  await screen.findByRole("heading", { name: "Lucy Chen", level: 1 });
}

describe("a record's timeline", () => {
  it("invites you to log the first activity when there are none", async () => {
    await openContact([]);

    expect(timeline().getByText("No activities yet. Log one to start the timeline.")).toBeInTheDocument();
  });

  it("shows each entry with its type, date, deal and follow-up", async () => {
    await openContact([call, email, note, stageChange]);

    const callEntry = within(entry("Called about the counteroffer"));
    expect(callEntry.getByText("Call:")).toBeInTheDocument();
    expect(callEntry.getByRole("link", { name: "12 Elm Street purchase" })).toHaveAttribute("href", "/deals/5");
    expect(callEntry.getByText("Nov 20, 2026")).toBeInTheDocument();
    expect(callEntry.getByText("Follow up Jan 6 · Overdue")).toBeInTheDocument();

    expect(within(entry("Sent the pre-approval letter")).getByText("Follow up Dec 31")).toBeInTheDocument();
    expect(within(entry("Prefers mornings")).getByText("Followed up Nov 27")).toBeInTheDocument();
  });

  it("lets you edit and delete activities, but not stage changes", async () => {
    await openContact([note, stageChange]);

    expect(within(entry("Prefers mornings")).getByRole("button", { name: "Edit activity" })).toBeInTheDocument();
    expect(within(entry("Prefers mornings")).getByRole("button", { name: "Delete activity" })).toBeInTheDocument();
    const stageEntry = within(entry("Moved from Showing to Offer"));
    expect(stageEntry.getByText("Stage change:")).toBeInTheDocument();
    expect(stageEntry.queryByRole("button")).not.toBeInTheDocument();
  });

  it("logs a new activity on the record", async () => {
    const user = userEvent.setup();
    let entries: Activity[] = [];
    await openContact([], {
      "GET /contacts/3": () => lucy(entries),
      "POST /activities": (body: unknown) => {
        const saved = { ...activity(20, ""), ...(body as object) };
        entries = [saved];
        return saved;
      },
    });

    await user.click(timeline().getByRole("button", { name: "Log activity" }));
    const dialog = await screen.findByRole("dialog", { name: "Log activity" });
    await user.click(within(dialog).getByRole("radio", { name: "Email" }));
    await user.type(within(dialog).getByLabelText("Description"), "Sent listing photos");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await timeline().findByText("Sent listing photos")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect((await screen.findAllByText("Activity saved")).length).toBeGreaterThan(0);
    expect(requests.find((r) => r.method === "POST")?.body).toMatchObject({
      type: "email",
      description: "Sent listing photos",
      contact_id: 3,
      follow_up_date: null,
      done: false,
    });
  });

  it("closes the log form on Cancel", async () => {
    const user = userEvent.setup();
    await openContact([]);

    await user.click(timeline().getByRole("button", { name: "Log activity" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edits an activity, starting from what was logged", async () => {
    const user = userEvent.setup();
    await openContact([email], {
      "PATCH /activities/12": (body: unknown) => ({ ...email, ...(body as object) }),
    });

    await user.click(within(entry("Sent the pre-approval letter")).getByRole("button", { name: "Edit activity" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit activity" });
    expect(within(dialog).getByRole("radio", { name: "Email" })).toBeChecked();
    expect(within(dialog).getByLabelText("Follow-up date")).toHaveValue("2099-12-31");
    await user.click(within(dialog).getByLabelText("Done"));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const patch = requests.find((r) => r.method === "PATCH");
    expect(patch?.body).toMatchObject({ description: "Sent the pre-approval letter", done: true });
    expect(patch?.body).not.toHaveProperty("contact_id");
  });

  it("closes the edit form on Cancel", async () => {
    const user = userEvent.setup();
    await openContact([email]);

    await user.click(within(entry("Sent the pre-approval letter")).getByRole("button", { name: "Edit activity" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the form open and shows the reason when saving fails", async () => {
    const user = userEvent.setup();
    await openContact([email], {
      "PATCH /activities/12": new FakeResponse(422, {
        detail: [{ loc: ["body", "description"], msg: "String should have at most 2000 characters" }],
      }),
    });

    await user.click(within(entry("Sent the pre-approval letter")).getByRole("button", { name: "Edit activity" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Save" }));

    expect(
      (await screen.findAllByText("description: String should have at most 2000 characters")).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("dialog", { name: "Edit activity" })).toBeInTheDocument();
  });

  it("deletes an activity after asking", async () => {
    const user = userEvent.setup();
    let entries = [call];
    await openContact(entries, {
      "GET /contacts/3": () => lucy(entries),
      "DELETE /activities/11": () => {
        entries = [];
        return null;
      },
    });

    await user.click(within(entry("Called about the counteroffer")).getByRole("button", { name: "Delete activity" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this call?" });
    expect(within(dialog).getByText("Nothing else will change.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await timeline().findByText("No activities yet. Log one to start the timeline.")).toBeInTheDocument();
    expect((await screen.findAllByText("Activity deleted")).length).toBeGreaterThan(0);
  });

  it("keeps the activity when you cancel the delete", async () => {
    const user = userEvent.setup();
    await openContact([note]);

    await user.click(within(entry("Prefers mornings")).getByRole("button", { name: "Delete activity" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(requests.some((r) => r.method === "DELETE")).toBe(false);
  });

  it("tells you when a delete fails", async () => {
    const user = userEvent.setup();
    await openContact([note], { "DELETE /activities/13": new FakeResponse(404) });

    await user.click(within(entry("Prefers mornings")).getByRole("button", { name: "Delete activity" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect((await screen.findAllByText("That record no longer exists.")).length).toBeGreaterThan(0);
    expect(timeline().getByText("Prefers mornings")).toBeInTheDocument();
  });
});
