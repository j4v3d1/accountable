# Independent review: `multi-user` against `main`

Reviewed against `docs/REVIEW.md`, excluding style as requested. This is a read-only code and documentation review; I did not run the test suite.

## Important

1. **The branch ends before its specified product is built.** `docs/changes/multi-user/plan.md` steps 5–18 are unfinished (confirmed in `docs/STATUS.md:164,173`). There is no `backend/app/search/` or `frontend/src/features/search/`, and `frontend/src/App.tsx` renders an empty `TopBar`. The user menu is absent, while `ThemeToggle` remains in the rail. This leaves the global search (R58–R62), user-menu sign-out (R53), and three-way theme choice (R6a) unavailable. The spec describes all of these as current behavior after merge, and the plan explicitly requires the person-dependent steps, CI, and walkthrough before completion. Complete the plan in order before merging.

2. **Deleting all records silently restores sample data on the next restart.** `backend/app/main.py` calls `seed.reset(engine)` whenever all four record tables are empty. A team can legitimately delete its records; after a restart, the app repopulates them with fictional sample records. This affects the live Supabase database as well as local SQLite and violates the expected persistence of deletions (R5). Seed only a database known to be newly initialized, rather than one whose records are empty. `docs/STATUS.md:162` also identifies this as still open.

## Other findings

None identified in the completed Phase 1 code. The security and standards passes found no additional concrete issue; the missing later phases and manual checks above prevent a full product verification.
