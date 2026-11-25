# Sign-in and people

Signing in and out, the two ways sign-in works (Supabase and local), the people who use Accountable, and who added and last changed each record. Part of the spec; the summary and index are in `docs/spec.md`. The user menu is in `shared.md`, and the settings and commands are in `running.md`.

## Concerns

- **16. Two ways to sign in.** The live app signs people in with Supabase Auth. `npm run dev`, the tests and ui-check never touch Supabase, so the backend has a second, local mode with made-up teammates and no real passwords. The backend picks the mode from `ACCOUNTABLE_AUTH`: `supabase` (the default) or `local`. Local mode only starts against a SQLite database, so a live app pointed at Supabase can never be opened with a made-up teammate. Supabase mode refuses to start without `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, and names the missing settings.
- **17. How the backend checks a token.** Supabase signs each session token with the project's signing key and publishes the public half at `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`. The backend fetches those keys once and keeps them, fetching again only when a token names a key it doesn't have. It accepts a token only when the signature matches, it hasn't expired, its audience is `authenticated` and its issuer is `<SUPABASE_URL>/auth/v1`. So checking a token needs no call to Supabase per request. The person's id is the token's `sub`, their email its `email`, and their name its `user_metadata.display_name`, which is what Supabase's dashboard sets as "Display name". The backend never takes who someone is from anything else in the request.
- **18. Who added the sample data.** Sample records were added by nobody, so they're credited to a reserved person with the id `sample-data` and the name "Sample data". The migration that adds the who-added columns credits every record that's already in a database the same way, since a local database started from the sample data. On a Supabase database that starts empty, the sample data loads with the same credit.

## Requirements

- **R49** Signed out, every address shows the **sign-in screen** instead of the page, with no rail and no top bar. It's a white panel centred on the page background, holding the Sea Green "A" logo, the title "Sign in to Accountable", an Email field, a Password field and a "Sign in" button. Under the button: "No account? Ask whoever runs Accountable to add you." There's no sign-up, no password reset and no other way to sign in. After signing in, the page that was asked for opens; at `/` that's the dashboard.
- **R50** Sign-in errors show above the button, in Raspberry text:
  - wrong email or password: "That email and password don't match.";
  - Supabase can't be reached: "Couldn't reach the sign-in service. Check your connection and try again.";
  - empty fields are caught by the form, as in R3.

  While signing in, the button reads "Signing in..." and can't be pressed again.
- **R51** Signed out, every API route answers 401, except `GET /api/config`, `GET /api/health` and, in local mode, `POST /api/auth/local`. A request whose token is missing, expired, signed with another key or meant for another audience counts as signed out.
- **R52** A session lasts until the person signs out. The browser renews the token before it expires. If the API answers 401 anyway, such as after a sign-out on another tab, the app drops its cached data and shows the sign-in screen with "Your session ended. Sign in again." above the form.
- **R53** "Sign out" in the user menu (R6a) ends the session, drops every cached record from the browser, and shows the sign-in screen at the same address.
- **R54** **Local mode** (concern 16): the sign-in screen is the same, with one extra line under the title in Cerulean text: "Local mode. Sign in as a sample teammate, such as maya.torres@example.com, with the password local." It accepts only the made-up teammates, all with the password `local`:

  | Email | Display name |
  |---|---|
  | `maya.torres@example.com` | Maya Torres |
  | `sam.okafor@example.com` | Sam Okafor |
  | `priya.shah@example.com` | Priya Shah |
  | `jordan@example.com` | (none, so shown by email) |

  The backend signs local tokens with a key it makes when it starts, so restarting `npm run dev` signs everyone out.
- **R55** **People.** A person is shown by their display name, or by their email when they have none. Their initials are the first letters of the first and last words of the name ("Maya Torres" is MT, "Cher" is C), or, from an email, the first two letters before the `@`, in capitals (`jordan@example.com` is JO). On each request, the backend keeps the person's id, name and email from their token in the `users` table, updating the row when they've changed, so everyone sees everyone's current name. Several requests arriving at once on a first visit add the person once, without an error. People are added in Supabase's dashboard; Accountable doesn't add, change or remove anyone.
- **R56** **Who added it.** Every organization, contact, deal and activity records who added it and who last changed it, taken from the signed-in person (concern 17). Adding a record sets both. Saving an edit, moving a deal on the board, and marking a follow-up done set who last changed it. A stage change entry is added by whoever changed the stage.
- **R57** **Where it shows:**
  - the record page of an organization, contact or deal, at the bottom of its details panel: "Added by Maya Torres on Nov 3, 2026", and, when someone has changed it since, "Last changed by Sam Okafor on Nov 20, 2026";
  - each timeline entry and each entry in the dashboard's recent activity, after its date: "Maya Torres";
  - records from the sample data show "Sample data" (concern 18).

  Dates are the local day, as in R6.

## Data model

**users**: `id` text primary key (the Supabase user id, a made-up teammate's id in local mode, or `sample-data`); `name` text not null (the display name, or the email when there's none, or "Sample data"); `email` text; `created_at` and `updated_at`.

Organizations, contacts, deals and activities each gain `created_by` and `updated_by`, text not null, referencing users, **on delete restrict**. A person's row is never deleted, so their records keep their name.

## API

| Method and path | Purpose |
|---|---|
| `GET /api/config` | Public. `{auth: "supabase", supabaseUrl, publishableKey}` or `{auth: "local"}`, so the browser knows how to sign in. The publishable key is public by design |
| `GET /api/health` | Public. `{ok: true}`, for Render's health check. Reads no data |
| `POST /api/auth/local` | Local mode only (404 otherwise). Body `{email, password}`; returns `{token}` for a made-up teammate, or 401 |
| `GET /api/me` | The signed-in person: `{id, name, email, initials}` |

Every other route needs `Authorization: Bearer <token>`. If Supabase's signing keys can't be fetched, the route answers 503 rather than 401, so a network blip doesn't sign anyone out. Every record and activity in a response carries `created_by_name`, `updated_by_name`, `created_at` and `updated_at`. A new record's `updated_at` equals its `created_at`, so "Last changed by" (R57) shows once `updated_at` has moved on. A deal that only shifts up or down its column because another deal moved isn't changed.

In Supabase mode the browser signs in, renews the session and signs out directly with Supabase Auth, using the project URL and publishable key from `/api/config`. The backend only checks the tokens.
