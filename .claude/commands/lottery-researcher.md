---
description: Run the lottery-researcher agent on new shows (or whatever you name)
argument-hint: [show names, or "refresh" to re-verify existing offers]
---

Launch the `lottery-researcher` agent.

- If arguments were given ($ARGUMENTS), pass them to the agent as the request: named shows, or "refresh" mode for re-verifying existing offers.
- If no arguments were given, use Fill mode on every show in data/shows.json that has no `discountCheckedAt` field. List those shows in the agent's prompt. If there are none, say so and stop without launching the agent.

Tell the agent not to commit. When it finishes, summarize per show what was verified and updated, what was left on the placeholder and why, and anything it couldn't confirm.
