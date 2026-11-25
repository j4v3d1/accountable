/** How the browser signs in, from GET /api/config (concern 16). */
export type AuthConfig = { auth: "local" } | { auth: "supabase"; supabaseUrl: string; publishableKey: string };

/** The signed-in person, from GET /api/me (R55). */
export interface Me {
  id: string;
  name: string;
  email: string | null;
  initials: string;
}
