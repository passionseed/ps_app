# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Supabase

- **Remote instance:** iikrvgjfkuijcpvdwzvv.supabase.co
- **pseed project path:** /Users/bunyasit/dev/pseed (Supabase CLI linked here)
- **Migrations symlink:** ps_app/supabase/migrations → pseed/supabase/migrations
- **Supabase CLI version:** 2.75.0

## Environment Variables

In `.env`:
- `EXPO_PUBLIC_SUPABASE_URL` — Remote Supabase URL (https://iikrvgjfkuijcpvdwzvv.supabase.co)
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `EXPO_PUBLIC_PROJECT_ID` — Expo project ID

In Supabase secrets (remote, already configured):
- `GEMINI_API_KEY` — Google Gemini API key
- `EXA_API_KEY` — Exa search API key (used by university-insights)
- `SUPABASE_SERVICE_ROLE_KEY` — Auto-configured
- `SUPABASE_URL` — Auto-configured
- `SUPABASE_ANON_KEY` — Auto-configured

## Docker

Docker daemon is NOT running on this machine. `supabase db push` may require Docker. If blocked, apply migration SQL directly via:
1. Supabase dashboard SQL editor: https://supabase.com/dashboard/project/iikrvgjfkuijcpvdwzvv/sql
2. Or use the Supabase Management API

## Gemini API Pattern

The existing university-insights edge function uses this Gemini call pattern:
```typescript
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
const response = await fetch(geminiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
});
const data = await response.json();
const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
```
