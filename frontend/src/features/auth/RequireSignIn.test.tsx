import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { queryClient } from "../../api/client";
import { FakeResponse, mockApi, renderApp } from "../../test/renderApp";
import { LOCAL_TOKEN_KEY } from "./session";

const organizations = [
  {
    id: 1,
    name: "Harbor Point Lending",
    website: null,
    industry: "Mortgage lending",
    notes: null,
    contact_count: 0,
    open_deal_count: 0,
    created_at: "2026-11-01T09:00:00Z",
    updated_at: "2026-11-01T09:00:00Z",
    created_by_name: "Sample data",
    updated_by_name: "Sample data",
  },
];

describe("signing in", () => {
  it("shows the sign-in screen at the address asked for, with no rail or top bar", async () => {
    mockApi({});
    renderApp("/organizations", { signedIn: false });

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Accountable" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("opens the page that was asked for once signed in", async () => {
    const user = userEvent.setup();
    mockApi({ "POST /auth/local": { token: "maya-token" }, "GET /organizations": organizations });
    renderApp("/organizations", { signedIn: false });

    await user.type(await screen.findByLabelText("Email"), "maya.torres@example.com");
    await user.type(screen.getByLabelText("Password"), "local");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Organizations" })).toBeInTheDocument();
    expect(await screen.findByText("Harbor Point Lending")).toBeInTheDocument();
    expect(localStorage.getItem(LOCAL_TOKEN_KEY)).toBe("maya-token");
  });

  it("after a 401, drops the cached data and says the session ended", async () => {
    mockApi({ "GET /organizations": new FakeResponse(401, { detail: "Your session ended. Sign in again." }) });
    renderApp("/organizations");

    expect(await screen.findByText("Your session ended. Sign in again.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Sign in to Accountable" })).toBeInTheDocument();
    expect(localStorage.getItem(LOCAL_TOKEN_KEY)).toBeNull();
    expect(queryClient.getQueryData(["organizations"])).toBeUndefined();
  });

  it("says so when the server can't be reached for the sign-in settings", async () => {
    const user = userEvent.setup();
    let reachable = false;
    mockApi({ "GET /config": () => (reachable ? { auth: "local" } : new FakeResponse(502)) });
    renderApp("/", { signedIn: false, config: null });

    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach Accountable's server. Is it running?");
    reachable = true;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sign in to Accountable" })).toBeInTheDocument());
  });
});
