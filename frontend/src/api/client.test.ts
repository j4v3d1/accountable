import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

function respond(status: number, body: string, contentType = "application/json") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body || null, { status, headers: { "Content-Type": contentType } })),
  );
}

async function failure(path = "/deals") {
  try {
    await api(path);
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("expected the request to fail");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("returns the JSON body", async () => {
    respond(200, JSON.stringify([{ id: 1 }]));

    await expect(api("/deals")).resolves.toEqual([{ id: 1 }]);
  });

  it("says the server can't be reached when the proxy has nothing behind it", async () => {
    respond(502, "", "text/plain");

    const error = await failure();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.message).toBe("Can't reach Accountable's server. Is it running?");
  });

  it("says the same when the network fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );

    expect((await failure()).message).toBe("Can't reach Accountable's server. Is it running?");
  });

  it("copes with an error body that isn't JSON", async () => {
    respond(500, "<html>Internal Server Error</html>", "text/html");

    const error = await failure();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Something went wrong. Please try again.");
  });

  it("uses the server's message, naming the field for invalid input", async () => {
    respond(
      422,
      JSON.stringify({ detail: [{ loc: ["body", "value"], msg: "Input should be greater than or equal to 0" }] }),
    );
    expect((await failure()).message).toBe("value: Input should be greater than or equal to 0");

    respond(409, JSON.stringify({ detail: "Stage changes are recorded automatically and can't be edited or deleted" }));
    expect((await failure()).message).toBe("Stage changes are recorded automatically and can't be edited or deleted");
  });
});
