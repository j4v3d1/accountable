# Plan: subagents

## Files

- `.claude/agents/reviewer.md`: the reviewer subagent. Tools: Read, Grep, Glob and Bash, with its instructions limiting Bash to commands that only read. Model: Sonnet.
- `.claude/agents/ui-check.md`: the ui-check subagent. Tools: Read, Grep, Glob and the Playwright MCP browser tools (no Edit, Write or Bash). Preloads the brand skill. Model: Sonnet.
- `docs/spec.md`: R48 and the code structure line for `.claude/agents/`.
- `docs/STATUS.md`: what was done.
- `.github/workflows/ci.yml` (added during the build, at the person's request): run `npm run check:quick` instead of `npm run check`, and drop the Playwright report upload. `AGENTS.md`, `docs/TECH_STACK.md` and `docs/spec.md` (concern 15, R47, structure line) updated to match.

## Order of work

1. Write both agent files.
2. Add R48 and the structure line to `docs/spec.md`.
3. Run `npm run check` (no app code changes, so it should pass as before).
4. The person commits, then tries each agent: the reviewer on this branch, and ui-check with `npm run dev` running.
