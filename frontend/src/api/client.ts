import { QueryClient } from "@tanstack/react-query";

/** An error from the API, with the HTTP status and a readable message. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: {
      // After any change to data, refresh every query, so every screen stays current (R38).
      onSettled: () => queryClient.invalidateQueries(),
    },
  },
});

const UNREACHABLE = "Can't reach Accountable's server. Is it running?";

function messageFrom(status: number, body: unknown): string {
  // The dev proxy answers 502 to 504 when the backend isn't running.
  if (status >= 502 && status <= 504) return UNREACHABLE;
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; loc?: unknown[] };
    const field = first.loc?.[first.loc.length - 1];
    return field ? `${String(field)}: ${first.msg}` : (first.msg ?? "The request was not valid.");
  }
  if (status === 404) return "That record no longer exists.";
  return "Something went wrong. Please try again.";
}

/** The one fetch wrapper. Sends and receives JSON, and throws ApiError on failure. */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    if (response.ok) throw new ApiError(response.status, "The server sent an answer Accountable can't read.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(response.status, body), body);
  }
  return body as T;
}
