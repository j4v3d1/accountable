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
export const SESSION_ENDED = "Your session ended. Sign in again.";

/** How requests are signed in. The auth feature sets it, so this file needs no area. */
export interface AuthHooks {
  /** The current session's token, or null when signed out. */
  getToken: () => Promise<string | null>;
  /** The API answered 401: the session has ended (R52). */
  onSessionEnded: () => void;
}

const signedOut: AuthHooks = { getToken: async () => null, onSessionEnded: () => {} };
let auth: AuthHooks = signedOut;

export function configureAuth(hooks: AuthHooks | null) {
  auth = hooks ?? signedOut;
}

async function headersFor(hasBody: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = hasBody ? { "Content-Type": "application/json" } : {};
  const token = await auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

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

/**
 * The one fetch wrapper. Sends the session's token, sends and receives JSON, and
 * throws ApiError on failure. A 401 drops every cached record and ends the session (R52).
 */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers: await headersFor(options.body !== undefined),
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
  if (response.status === 401) {
    queryClient.clear();
    auth.onSessionEnded();
    throw new ApiError(401, SESSION_ENDED, body);
  }
  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(response.status, body), body);
  }
  return body as T;
}
