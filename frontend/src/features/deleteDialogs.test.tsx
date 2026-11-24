import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteContactDialog } from "./contacts/ContactDialogs";
import { DeleteDealDialog } from "./deals/DealDialogs";
import { DeleteOrganizationDialog } from "./organizations/OrganizationDialogs";

// Each record's delete dialog loads its counts from delete-impact (R4). When that
// request fails, the dialog has to say so rather than wait for ever.
const dialogs = [
  { name: "deal", Dialog: DeleteDealDialog },
  { name: "contact", Dialog: DeleteContactDialog },
  { name: "organization", Dialog: DeleteOrganizationDialog },
];

describe.each(dialogs)("the $name delete dialog", ({ Dialog }) => {
  beforeEach(() => {
    // The dev proxy answers 502 when the backend isn't running.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 502 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an error when the counts can't be loaded", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Dialog target={{ id: 7, name: "Northgate" }} onClose={() => {}} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Couldn't check linked records/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
