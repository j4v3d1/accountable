import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, vi } from "vitest";
import { queryClient } from "../api/client";
import { App } from "../App";
import { forgetSessions, LOCAL_TOKEN_KEY } from "../features/auth/session";
import type { AuthConfig, Me } from "../features/auth/types";
import { ToastProvider } from "../ui/Toast";

type Handler = (body: unknown) => unknown;

/** A fake API answer with a status other than 200, such as a 404 or a 409. */
export class FakeResponse {
  constructor(
    readonly status: number,
    readonly body: unknown = null,
  ) {}
}

/** Maya Torres, the made-up teammate the tests sign in as (R54). */
export const MAYA: Me = {
  id: "local-maya-torres",
  name: "Maya Torres",
  email: "maya.torres@example.com",
  initials: "MT",
};

/** Every request the fake API received, oldest first, apart from the sign-in ones (config and me). */
export const requests: { method: string; path: string; body: unknown }[] = [];

/**
 * Stands in for the backend. Routes are keyed "METHOD /path" (the path after /api,
 * with its query string), such as "GET /contacts" or "PATCH /deals/3". A value is
 * returned as JSON with status 200; a function gets the request body; a FakeResponse
 * sets the status. A request with no route fails the test. Local sign-in config and
 * Maya Torres as the signed-in person are there unless a test gives its own.
 */
export function mockApi(routes: Record<string, Handler | FakeResponse | object | string | number | boolean | null>) {
  const allRoutes: typeof routes = { "GET /config": { auth: "local" }, "GET /me": MAYA, ...routes };
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const path = url.replace(/^\/api/, "");
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    const key = `${method} ${path}`;
    if (key !== "GET /config" && key !== "GET /me") requests.push({ method, path, body });
    if (!(key in allRoutes)) throw new Error(`No fake API route for ${key}`);
    const route = allRoutes[key];
    const answer = typeof route === "function" ? (route as Handler)(body) : route;
    const response = answer instanceof FakeResponse ? answer : new FakeResponse(200, answer);
    return new Response(response.body === null ? "" : JSON.stringify(response.body), { status: response.status });
  });
}

/** Renders the whole app at a path, as the browser would, against the fake API, signed in unless asked not to be. */
export function renderApp(
  path: string,
  { signedIn = true, config = { auth: "local" } }: { signedIn?: boolean; config?: AuthConfig | null } = {},
) {
  if (signedIn) localStorage.setItem(LOCAL_TOKEN_KEY, "test-token");
  // Known from the start so pages render at once, unless the test fetches it (null).
  if (config) queryClient.setQueryData(["config"], config);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  queryClient.clear();
  localStorage.clear();
  forgetSessions();
  requests.length = 0;
  vi.unstubAllGlobals();
});
