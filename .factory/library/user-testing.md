# User Testing

Testing surface, tools, and resource cost classification.

---

## Validation Surface

**Primary surface:** Web browser (`pnpm web` on port 8081)
**Tool:** agent-browser CLI (available at `/Users/bunyasit/.factory/bin/agent-browser`)

**Auth:** Google OAuth. The deep link scheme (`passion-seed://google-auth`) does NOT work in web mode. The redirect URL `http://localhost:8081/` has been added to Supabase Auth settings. After Google sign-in, the browser redirects back to localhost:8081 with auth tokens in the URL fragment.

**Testable flows:**
- Portfolio management (add/delete items)
- Fit browser (view scores, filter, navigate to detail)
- Fit detail (score display, narrative, gaps, deadline, CTA)
- Profile entry points (navigate to portfolio and fit)
- Cross-area flows (add portfolio → check score changes)

**Auth strategy for validators:** Try Google OAuth flow first. If the redirect works (localhost:8081 is configured), validators can authenticate normally. If auth fails or is flaky, validators should note it as a blocker and test only what's accessible.

## Validation Concurrency

**Machine:** 32GB RAM, 10 CPU cores
**Baseline load:** ~7GB active, ~4GB wired
**Usable headroom (70%):** ~12GB * 0.7 = 8.4GB

**agent-browser (web mode):**
- Each agent-browser instance: ~300MB RAM
- Shared Expo dev server: ~500MB
- 3 validators = ~1.4GB agents + ~500MB dev server = ~1.9GB — well within budget
- **Max concurrent: 3**
