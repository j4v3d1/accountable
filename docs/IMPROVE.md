# Improve the harness

Run this at Deploy, after the review fixes and before the merge.

1. Check the review fixes are in. If an Important finding is still open, say so at the start of your report; the merge waits for it either way. Also say at the start which steps of the plan's order of work aren't done yet, if you're running this before Deploy.
2. Look at what went wrong on this change: the review's findings, what the person corrected, what the checks caught, what `docs/STATUS.md` lists as "Still open" or "Not checked", what the reviewer and ui-check listed as "Not checked" (a pass `docs/REVIEW.md` asks for counts as a miss), and whether CI passed on the pushed branch (`gh run list -R <fork> --branch <branch>`; if there's no run, the branch hasn't been pushed, so say so).
3. For a mistake that has happened twice, add the correction to AGENTS.md or docs/REVIEW.md, or suggest a change to docs/STANDARDS.md for the person to make. If a tool can catch it, add it to the checks instead. To tell whether it happened before, read the review findings, "Still open" notes and "watch for a repeat" lists of earlier changes in `docs/STATUS.md`, not the other change folders. Record a mistake that has happened once under "watch for a repeat" in your section, rather than adding a rule for it.
4. Remove anything out of date, in these files and in `docs/STATUS.md`.
5. Add a short section to `docs/STATUS.md` saying what this round changed and why, so the next round can see which mistakes are already covered.
6. Improve this file, so that the next round makes a better change. Keep this as the last step.
