import { createClient } from "@supabase/supabase-js";
import { configureAuth, queryClient } from "../../api/client";
import type { AuthConfig } from "./types";

/**
 * Where the session stands. "ended" is signed out because the API refused the
 * token, so the sign-in screen says so (R52).
 */
export type SessionState = "unknown" | "signed-in" | "signed-out" | "ended";

export type SignInProblem = "wrong" | "unreachable";

export class SignInError extends Error {
  readonly problem: SignInProblem;

  constructor(problem: SignInProblem) {
    super(problem === "wrong" ? "That email and password don't match." : "Couldn't reach the sign-in service.");
    this.name = "SignInError";
    this.problem = problem;
  }
}

/** One way to sign in and out, backed by Supabase or by local mode (concern 16). */
export interface Session {
  readonly mode: AuthConfig["auth"];
  state(): SessionState;
  subscribe(listener: () => void): () => void;
  getToken(): Promise<string | null>;
  signIn(email: string, password: string): Promise<void>;
  /** Signing out from the user menu (R53). */
  signOut(): Promise<void>;
  /** The API refused the token (R52). */
  end(): void;
}

function listeners() {
  const all = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      all.add(listener);
      return () => all.delete(listener);
    },
    notify() {
      for (const listener of all) listener();
    },
  };
}

export const LOCAL_TOKEN_KEY = "accountable-local-token";

/** Local mode: the backend signs a token for a made-up teammate, kept in localStorage (R54). */
export function localSession(storage: Storage = localStorage): Session {
  const changes = listeners();
  let ended = false;
  const token = () => storage.getItem(LOCAL_TOKEN_KEY);
  const forget = () => {
    storage.removeItem(LOCAL_TOKEN_KEY);
    queryClient.clear();
  };

  return {
    mode: "local",
    state: () => (token() ? "signed-in" : ended ? "ended" : "signed-out"),
    subscribe: changes.subscribe,
    getToken: async () => token(),
    async signIn(email, password) {
      let response: Response;
      try {
        response = await fetch("/api/auth/local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      } catch {
        throw new SignInError("unreachable");
      }
      if (response.status === 401) throw new SignInError("wrong");
      if (!response.ok) throw new SignInError("unreachable");
      const { token: signedToken } = (await response.json()) as { token: string };
      ended = false;
      storage.setItem(LOCAL_TOKEN_KEY, signedToken);
      changes.notify();
    },
    async signOut() {
      ended = false;
      forget();
      changes.notify();
    },
    end() {
      ended = true;
      forget();
      changes.notify();
    },
  };
}

interface SupabaseSessionData {
  access_token: string;
}

interface SupabaseAuthError {
  name?: string;
  status?: number;
}

/** The parts of supabase-js's auth client this app uses, so tests can fake them. */
export interface SupabaseAuth {
  onAuthStateChange(callback: (event: string, session: SupabaseSessionData | null) => void): unknown;
  getSession(): Promise<{ data: { session: SupabaseSessionData | null } }>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: SupabaseAuthError | null }>;
  signOut(): Promise<unknown>;
}

function cannotReach(error: SupabaseAuthError): boolean {
  return error.name === "AuthRetryableFetchError" || !error.status || error.status >= 500;
}

/** Supabase mode: supabase-js signs in, renews the token before it expires and signs out (R52). */
export function supabaseSession(auth: SupabaseAuth): Session {
  const changes = listeners();
  let state: SessionState = "unknown";
  const become = (next: SessionState) => {
    state = next;
    changes.notify();
  };

  auth.onAuthStateChange((_event, session) => {
    if (session) become("signed-in");
    else if (state !== "ended") become("signed-out");
  });

  return {
    mode: "supabase",
    state: () => state,
    subscribe: changes.subscribe,
    // getSession hands back a renewed token when the old one is about to expire.
    getToken: async () => (await auth.getSession()).data.session?.access_token ?? null,
    async signIn(email, password) {
      let error: SupabaseAuthError | null;
      try {
        ({ error } = await auth.signInWithPassword({ email, password }));
      } catch {
        throw new SignInError("unreachable");
      }
      if (error) throw new SignInError(cannotReach(error) ? "unreachable" : "wrong");
      become("signed-in");
    },
    async signOut() {
      queryClient.clear();
      become("signed-out");
      await auth.signOut().catch((error: unknown) => console.warn("Couldn't tell Supabase about the sign-out", error));
    },
    end() {
      queryClient.clear();
      become("ended");
      void auth.signOut().catch(() => undefined);
    },
  };
}

let current: { key: string; session: Session } | null = null;

/** The session for this config, made once, and wired into the API client. */
export function sessionFor(config: AuthConfig): Session {
  const key = config.auth === "local" ? "local" : `${config.supabaseUrl} ${config.publishableKey}`;
  if (current?.key === key) return current.session;
  const session =
    config.auth === "local"
      ? localSession()
      : supabaseSession(createClient(config.supabaseUrl, config.publishableKey).auth);
  configureAuth({ getToken: () => session.getToken(), onSessionEnded: () => session.end() });
  current = { key, session };
  return session;
}

/** Tests start each case with no session made yet. */
export function forgetSessions() {
  current = null;
  configureAuth(null);
}
