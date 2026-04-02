---
name: no_auto_commit
description: Don't commit after every code change unless explicitly asked
type: feedback
---

Don't create git commits after every code change. Only commit when the user explicitly asks.

**Why:** User finds it unnecessary and disruptive to auto-commit every small change.

**How to apply:** Write/edit code directly without following up with git add + git commit. Only run git commands when the user says "commit", "push", or similar.
