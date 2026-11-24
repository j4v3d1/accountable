import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, vi } from "vitest";
import { queryClient } from "../api/client";
import { App } from "../App";
import { ToastProvider } from "../ui/Toast";

type Handler = (body: unknown) => unknown;

/** A fake API answer with a status other than 200, such as a 404 or a 409. */
export class FakeResponse {
  constructor(
    readonly status: number,
    readonly body: unknown = null,
  ) {}
}

/** Every request the fake API received, oldest first. */
export const requests: { method: string; path: string; body: unknown }[] = [];

/**
 * Stands in for the backend. Routes are keyed "METHOD /path" (the path after /api,
 * with its query string), such as "GET /contacts" or "PATCH /deals/3". A value is
 * returned as JSON with status 200; a function gets the request body; a FakeResponse
 * sets the status. A request with no route fails the test.
 */
export function mockApi(routes: Record<string, Handler | FakeResponse | object | string | number | boolean | null>) {
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const path = url.replace(/^\/api/, "");
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ method, path, body });
    const key = `${method} ${path}`;
    if (!(key in routes)) throw new Error(`No fake API route for ${key}`);
    const route = routes[key];
    const answer = typeof route === "function" ? (route as Handler)(body) : route;
    const response = answer instanceof FakeResponse ? answer : new FakeResponse(200, answer);
    return new Response(response.body === null ? "" : JSON.stringify(response.body), { status: response.status });
  });
}

/** Renders the whole app at a path, as the browser would, against the fake API. */
export function renderApp(path: string) {
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
  requests.length = 0;
  vi.unstubAllGlobals();
});
