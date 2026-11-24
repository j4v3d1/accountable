# Intent: harness

Give agents and people one command that says whether the code is in shape: `npm run check`. It runs formatting, linting, a complexity limit, type checks, a secrets scan and every test with a coverage floor, and fails if any of them fails. What it finds gets fixed, without weakening any rule.

Hooks run the checks without anyone having to remember: a git pre-commit hook for the quick checks, a Claude Code hook that runs `npm run check:quick` when the agent finishes a turn, and a Claude Code hook that keeps the agent out of `.env`.
