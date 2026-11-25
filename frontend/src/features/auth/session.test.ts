import { afterEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "../../api/client";
import {
  forgetSessions,
  LOCAL_TOKEN_KEY,
  localSession,
  SignInError,
  supabaseSession,
  type SupabaseAuth,
} from "./session";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  queryClient.clear();
  forgetSessions();
});

function answer(status: number, body: unknown = null) {
  const fetch = vi.fn(async () => new Response(body === null ? "" : JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function problem(signIn: Promise<void>) {
  try {
    await signIn;
  } catch (error) {
    return (error as SignInError).problem;
  }
  throw new Error("expected sign-in to fail");
}

describe("local session", () => {
  it("signs in through the backend and keeps the token", async () => {
    const fetch = answer(200, { token: "local-token" });
    const session = localSession();
    const changed = vi.fn();
    session.subscribe(changed);

    await session.signIn("maya.torres@example.com", "local");

    expect(fetch).toHaveBeenCalledWith("/api/auth/local", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({
      email: "maya.torres@example.com",
      password: "local",
    });
    expect(localStorage.getItem(LOCAL_TOKEN_KEY)).toBe("local-token");
    expect(session.state()).toBe("signed-in");
    await expect(session.getToken()).resolves.toBe("local-token");
    expect(changed).toHaveBeenCalled();
  });

  it("is signed in on a new page while the token is kept", () => {
    localStorage.setItem(LOCAL_TOKEN_KEY, "kept");

    expect(localSession().state()).toBe("signed-in");
  });

  it("says a wrong password is wrong, and a server it can't reach is unreachable", async () => {
    answer(401, { detail: "That email and password don't match." });
    expect(await problem(localSession().signIn("maya.torres@example.com", "nope"))).toBe("wrong");

    answer(502);
    expect(await problem(localSession().signIn("maya.torres@example.com", "local"))).toBe("unreachable");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );
    expect(await problem(localSession().signIn("maya.torres@example.com", "local"))).toBe("unreachable");
  });

  it("signing out forgets the token and every cached record", async () => {
    localStorage.setItem(LOCAL_TOKEN_KEY, "kept");
    queryClient.setQueryData(["deals"], [{ id: 1 }]);
    const session = localSession();

    await session.signOut();

    expect(localStorage.getItem(LOCAL_TOKEN_KEY)).toBeNull();
    expect(queryClient.getQueryData(["deals"])).toBeUndefined();
    expect(session.state()).toBe("signed-out");
  });

  it("an ended session says so until someone signs in again", async () => {
    localStorage.setItem(LOCAL_TOKEN_KEY, "refused");
    const session = localSession();

    session.end();
    expect(session.state()).toBe("ended");

    answer(200, { token: "fresh" });
    await session.signIn("maya.torres@example.com", "local");
    expect(session.state()).toBe("signed-in");
  });
});

function fakeSupabase(overrides: Partial<SupabaseAuth> = {}) {
  let announce: (event: string, session: { access_token: string } | null) => void = () => {};
  const auth = {
    onAuthStateChange: vi.fn((callback: typeof announce) => {
      announce = callback;
    }),
    getSession: vi.fn(async () => ({ data: { session: { access_token: "renewed-token" } } })),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
  return { auth, announce: (session: { access_token: string } | null) => announce("EVENT", session) };
}

describe("Supabase session", () => {
  it("waits for supabase-js to say whether a session is kept", () => {
    const fake = fakeSupabase();
    const session = supabaseSession(fake.auth);
    expect(session.state()).toBe("unknown");

    fake.announce({ access_token: "kept" });
    expect(session.state()).toBe("signed-in");
  });

  it("signs in with supabase-js", async () => {
    const fake = fakeSupabase();
    const session = supabaseSession(fake.auth);
    fake.announce(null);

    await session.signIn("ana.ruiz@example.com", "secret");

    expect(fake.auth.signInWithPassword).toHaveBeenCalledWith({ email: "ana.ruiz@example.com", password: "secret" });
    expect(session.state()).toBe("signed-in");
  });

  it("asks supabase-js for the token each time, so a renewed one is used", async () => {
    const fake = fakeSupabase();

    await expect(supabaseSession(fake.auth).getToken()).resolves.toBe("renewed-token");
    expect(fake.auth.getSession).toHaveBeenCalled();
  });

  it("tells wrong credentials from a service it can't reach", async () => {
    const wrong = fakeSupabase({
      signInWithPassword: vi.fn(async () => ({ error: { name: "AuthApiError", status: 400 } })),
    });
    expect(await problem(supabaseSession(wrong.auth).signIn("a@example.com", "x"))).toBe("wrong");

    const offline = fakeSupabase({
      signInWithPassword: vi.fn(async () => ({ error: { name: "AuthRetryableFetchError", status: 0 } })),
    });
    expect(await problem(supabaseSession(offline.auth).signIn("a@example.com", "x"))).toBe("unreachable");

    const down = fakeSupabase({
      signInWithPassword: vi.fn(async () => ({ error: { name: "AuthApiError", status: 503 } })),
    });
    expect(await problem(supabaseSession(down.auth).signIn("a@example.com", "x"))).toBe("unreachable");

    const thrown = fakeSupabase({ signInWithPassword: vi.fn(async () => Promise.reject(new TypeError("offline"))) });
    expect(await problem(supabaseSession(thrown.auth).signIn("a@example.com", "x"))).toBe("unreachable");
  });

  it("signs out with supabase-js and forgets every cached record", async () => {
    const fake = fakeSupabase();
    const session = supabaseSession(fake.auth);
    fake.announce({ access_token: "kept" });
    queryClient.setQueryData(["deals"], [{ id: 1 }]);

    await session.signOut();
    fake.announce(null);

    expect(fake.auth.signOut).toHaveBeenCalled();
    expect(session.state()).toBe("signed-out");
    expect(queryClient.getQueryData(["deals"])).toBeUndefined();
  });

  it("still signs out here when Supabase can't be told", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fake = fakeSupabase({ signOut: vi.fn(async () => Promise.reject(new TypeError("offline"))) });
    const session = supabaseSession(fake.auth);
    fake.announce({ access_token: "kept" });

    await session.signOut();

    expect(session.state()).toBe("signed-out");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("an ended session stays ended when supabase-js then reports the sign-out", () => {
    const fake = fakeSupabase();
    const session = supabaseSession(fake.auth);
    fake.announce({ access_token: "refused" });

    session.end();
    fake.announce(null);

    expect(session.state()).toBe("ended");
    expect(fake.auth.signOut).toHaveBeenCalled();
  });
});
