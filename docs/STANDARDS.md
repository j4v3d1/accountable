Follow these coding guidelines:

## ED Dommer's suggestions 
- Be thoughtful and careful about naming things so that code is expressive and easy to read
- Don't comment out unused code; delete it
- Favor short functions and methods with one purpose
- Make code readable so that only very short comments are needed, and mostly comment the why
- Clean abstractions with clear separation of concerns, but don't abstract before it's needed
- Avoid brittle tests that are tied to implementation specifics

# Project standards

## Priorities
- Prefer correctness and clarity over cleverness.
- Make the smallest change that fully solves the problem.
- Preserve existing behavior unless the task calls for a change.

## Before changing code
- Read the project README, relevant documentation, and nearby code.
- Identify the existing conventions and follow them.
- State any important assumptions when requirements are unclear.

## Implementation
- Keep functions and modules focused.
- Use descriptive names and explicit interfaces.
- Handle expected errors; do not silently swallow failures.
- Avoid new dependencies unless they provide clear value.
- Do not include secrets, credentials, or personal data in code or logs.

## Verification
- Test behavior that could realistically break.
- Run the relevant existing checks before declaring work complete.
- If a check cannot run, say why.
- Do not claim a change works without evidence.

## Changes and reviews
- Keep changes scoped to the request.
- Explain what changed, why, and how it was verified.
- Call out remaining risks or tradeoffs.
- Do not commit, deploy, publish, or change external systems unless authorized.