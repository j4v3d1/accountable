import { createContext, use, useSyncExternalStore, type ReactNode } from "react";
import { SESSION_ENDED } from "../../api/client";
import { ErrorState, LoadingState } from "../../ui/States";
import { useAuthConfig } from "./queries";
import { sessionFor, type Session } from "./session";
import { SignInPage } from "./SignInPage";

const SessionContext = createContext<Session | null>(null);

/** The signed-in session, for signing out (R53). Only used under RequireSignIn. */
export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession is only used inside RequireSignIn");
  return session;
}

/** Signed out, shows the sign-in screen at the same address instead of the page (R49, R52). */
export function RequireSignIn({ children }: { children: ReactNode }) {
  const config = useAuthConfig();
  if (config.isPending) return <LoadingState label="Loading..." />;
  if (config.isError) return <ErrorState message={config.error.message} onRetry={() => void config.refetch()} />;
  return <SessionGate session={sessionFor(config.data)}>{children}</SessionGate>;
}

function SessionGate({ session, children }: { session: Session; children: ReactNode }) {
  const state = useSyncExternalStore(session.subscribe, session.state);
  if (state === "unknown") return null;
  if (state !== "signed-in") {
    return <SignInPage session={session} notice={state === "ended" ? SESSION_ENDED : null} />;
  }
  return <SessionContext value={session}>{children}</SessionContext>;
}
