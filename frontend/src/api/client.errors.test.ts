import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

function respond(status: number, body: string) {
  const fetch = vi.fn(async () => new Response(body || null, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function failure() {
  try {
    await api("/contacts/9");
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("expected the request to fail");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api requests", () => {
  it("sends a body as JSON, with the method given", async () => {
    const fetch = respond(200, JSON.stringify({ id: 4 }));

    await api("/deals/4", { method: "PATCH", body: { value: 415000 } });

    expect(fetch).toHaveBeenCalledWith("/api/deals/4", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: 415000 }),
    });
  });

  it("returns null for an empty answer, such as after a delete", async () => {
    respond(204, "");

    await expect(api("/deals/4", { method: "DELETE" })).resolves.toBeNull();
  });

  it("says so when a successful answer can't be read", async () => {
    respond(200, "<html>not json</html>");

    const error = await failure();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("The server sent an answer Accountable can't read.");
  });
});

describe("api error messages", () => {
  it("says the record is gone when the server answers 404 without a message", async () => {
    respond(404, "");

    const error = await failure();

    expect(error.status).toBe(404);
    expect(error.message).toBe("That record no longer exists.");
  });

  it("keeps the server's error body as the detail", async () => {
    respond(409, JSON.stringify({ detail: "That email is already used by Lucy Chen" }));

    expect((await failure()).detail).toEqual({ detail: "That email is already used by Lucy Chen" });
  });

  it("uses the validation message alone when it names no field", async () => {
    respond(422, JSON.stringify({ detail: [{ msg: "Value error, close date is required" }] }));

    expect((await failure()).message).toBe("Value error, close date is required");
  });

  it("falls back to a general message for a validation error without a message", async () => {
    respond(422, JSON.stringify({ detail: [{}] }));

    expect((await failure()).message).toBe("The request was not valid.");
  });

  it("falls back to a general message when the validation list is empty", async () => {
    respond(422, JSON.stringify({ detail: [] }));

    expect((await failure()).message).toBe("Something went wrong. Please try again.");
  });
});
