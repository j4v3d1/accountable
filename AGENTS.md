# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/spec.md`: a short summary of what Accountable is and does today, with an index of the area files. Read it first, before anything else.
- `docs/specs/`: the detail, one file per area of the product (such as `deals.md`, `pipeline.md`, `visual-design.md`), each with its concerns, requirements and design. After `docs/spec.md`, read only the area files the current change touches. The index in `docs/spec.md` says which file holds each requirement and concern.
- `docs/TECH_STACK.md`: the stack
- `docs/STANDARDS.md`: how code is written in this repo. Follow it in every change.
- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Changes

- Each change has its own folder, `docs/changes/<branch name>/`, named after its git branch. It holds the change's `intent.md` (what the change is for) and `plan.md` (how it gets built).
- Read only the current change's folder: the one named after the branch you're on. The other folders are past changes, already described in `docs/spec.md` and `docs/specs/`, so don't read them.
- A change keeps the spec files it affects up to date in the same change: `docs/spec.md` and every area file in `docs/specs/` whose area it changes, so they describe the product as it will be once the change is merged. A change that adds an area adds its file and a row in the index in `docs/spec.md`.
- When the build adds something `plan.md` doesn't list (a file, a token, a behavior), add it to `plan.md` and to the spec (`docs/spec.md` or the area file it belongs in) in the same step.
- When a plan step needs the person (pushing and waiting for CI, a walkthrough by hand, switching Wi-Fi off), stop at that step and ask them. Don't swap in something else or move past it, because later steps may depend on it.
- At Deploy, after the review fixes and before the merge, follow `docs/IMPROVE.md` to improve the harness.

## Tests

- `npm test` runs every test: backend unit tests (pytest), the TypeScript check, frontend unit tests (Vitest) and end-to-end tests (Playwright in Chrome). It runs all four even when one fails, prints a summary, and fails if any test fails.
- The tests use their own database and ports, so they never touch your data or a running `npm run dev`.
- `.only` is refused in Vitest and Playwright, so no test can be skipped by accident.
- Run `npm test`, and get it passing, before calling a piece of work done.

## Checks

- `npm run check` runs every check: Prettier and ESLint (frontend), `ruff format` and `ruff check` (backend), complexity of at most 15 per function, `tsc` and `ty`, gitleaks, `npm test` with at least 80% unit test coverage, and a check that every Playwright baseline screenshot has both a Mac (`-darwin`) and a Linux (`-linux`) copy. It fails if any of them fails.
- `npm run check:quick` runs the same without the end-to-end tests and the baseline check; `npm run format` fixes the formatting.
- CI runs `npm run check:quick` on Linux (no end-to-end tests, so those run only on your Mac), and your machine is a Mac, so a change isn't done until CI has passed on the pushed branch. You don't push, so ask the person to push and tell you the result.
- Hooks run these for you: a git pre-commit hook (`lefthook.yml`) formats, lints, type-checks and scans the staged files, and a Claude Code Stop hook runs `npm run check:quick` when you finish a turn and sends failures back once. You can't edit `.env`.
- Run `npm run check`, and get it passing, before calling a piece of work done. Fix what it finds; don't weaken a rule, add a disable or ignore comment, or exclude code from coverage. If a rule doesn't suit the project, ask first.
