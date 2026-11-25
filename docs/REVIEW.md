# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong.
- **Security:** no secrets or personal data are exposed, and nobody can do what they shouldn't.
- **Matches the spec and plan.md:** the change does what `docs/spec.md`, the area files in `docs/specs/` and the change's `plan.md` (in `docs/changes/<branch name>/`) say, with nothing missing and nothing extra. Every step in the plan's order of work was done as written; a step that was skipped, swapped for something else or left to "still open" is a finding.
- **Described by the spec:** flag any code that neither `docs/spec.md` nor an area file in `docs/specs/` describes.
- **Spec kept up to date:** every area the change touches has its area file in `docs/specs/` updated in the same change, and `docs/spec.md` (summary and index) still matches the area files. A new area has its own file and a row in the index; a requirement or concern that moved or was added is listed against the right file.
- **Follows STANDARDS.md:** the change follows the coding standards in `docs/STANDARDS.md`.

## Important

An Important finding must be fixed before the change merges. A finding is Important if the change breaks behavior that should work, leaks data or breaks a rule in AGENTS.md.

## Nits

A nit is a small point, such as style or naming, that doesn't block the merge. Report at most five per review.