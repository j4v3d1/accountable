# Intent: subagents

Add two project subagents to Claude Code, so a review and a browser check can run in a fresh context with their own instructions:

- **reviewer**: reviews the changes on a branch with `docs/REVIEW.md` and reports its findings by severity. It reads files and runs only commands that read, such as `git diff`, `git log`, `git show` and `grep`, and never changes anything. It runs on Sonnet.
- **ui-check**: checks the running app in the browser with the Playwright MCP server. It opens each page, takes a screenshot, checks it against the brand skill and `docs/spec.md`, and reports anything off-brand or broken. It saves its screenshots in `.playwright-mcp/`, which git ignores, and doesn't change any code. It runs on Sonnet.

No app code changes. The person makes the commits.
