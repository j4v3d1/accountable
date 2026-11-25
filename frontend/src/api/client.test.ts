import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, configureAuth, queryClient } from "./client";

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
  configureAuth(null);
  queryClient.clear();
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

describe("signing requests in", () => {
  it("sends the session's token", async () => {
    respond(200, "[]");
    configureAuth({ getToken: async () => "maya-token", onSessionEnded: () => {} });

    await api("/deals", { method: "POST", body: { name: "Deal" } });

    const [, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(init.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer maya-token" });
  });

  it("sends no token when signed out", async () => {
    respond(200, "[]");

    await api("/config");

    const [, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(init.headers).toEqual({});
  });

  it("on a 401, drops every cached record and ends the session", async () => {
    respond(401, JSON.stringify({ detail: "Sign in to continue" }));
    const onSessionEnded = vi.fn();
    configureAuth({ getToken: async () => "old-token", onSessionEnded });
    queryClient.setQueryData(["deals"], [{ id: 1 }]);

    const error = await failure();

    expect(error.status).toBe(401);
    expect(error.message).toBe("Your session ended. Sign in again.");
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(["deals"])).toBeUndefined();
  });
});
