# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack

- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Tests

- `npm test` runs every test: backend unit tests (pytest), the TypeScript check, frontend unit tests (Vitest) and end-to-end tests (Playwright in Chrome). It runs all four even when one fails, prints a summary, and fails if any test fails.
- The tests use their own database and ports, so they never touch your data or a running `npm run dev`.
- `.only` is refused in Vitest and Playwright, so no test can be skipped by accident.
- Run `npm test`, and get it passing, before calling a piece of work done.
