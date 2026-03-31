# Hackathon Mode Design

**Date:** 2026-03-31

## Context

Passion Seed needs to support a second class of users: hackathon participants. These users register for specific hackathon events (e.g. "Super Seed Hackathon") and experience a completely different app — different navigation, different content, different purpose. They log in with email + password rather than Google/Apple OAuth. The goal is to add this mode with minimal disruption to the existing normal user flow.

---

## 1. Auth Flow

### Landing Page (`app/index.tsx`)
Add a "Hackathon Login" button below the existing Google/Apple/guest buttons. It navigates to a new screen `app/hackathon-login.tsx`.

### Hackathon Login Screen (`app/hackathon-login.tsx`)
- Email + password form
- On submit: calls `supabase.auth.signInWithPassword({ email, password })`
- After session established: queries `hackathon_team_members` to verify the user is a registered participant
  - If found → set `isHackathon: true` in AuthContext, proceed to `/(hackathon)/home`
  - If not found → show error: "This account is not registered for a hackathon."
- Standard error handling for wrong credentials

### AuthContext changes (`lib/auth.tsx`)
Two additions:
```ts
isHackathon: boolean;
signInWithEmailPassword: (email: string, password: string) => Promise<void>;
```

`isHackathon` is set to `true` inside `signInWithEmailPassword` after confirming team membership. It persists via AsyncStorage under the key `"hackathon_mode"`. On app start, it is read from storage and only applied if a valid session also exists. On sign out, both the session and `"hackathon_mode"` key are cleared.

---

## 2. Routing

### RootNavigator (`app/_layout.tsx`)
Add one routing case, checked before the guest check:

```ts
if (isHackathon && session) → router.replace("/(hackathon)/home")
```

Full priority order:
1. `loading` → show splash
2. `!session && !isGuest && !isHackathon` → landing (index)
3. `isHackathon && session` → `/(hackathon)/home`
4. `isGuest` → `/(tabs)/discover`
5. `session && onboarded` → `/(tabs)/discover`
6. `session && !onboarded` → `/onboarding`

### New route group: `app/(hackathon)/`
```
app/
  (hackathon)/
    _layout.tsx                    ← Bottom tab navigator (Home + Profile)
    home.tsx                       ← Hackathon journey screen (ported from pseed)
    phase/[phaseId].tsx            ← Phase detail (ported from pseed)
    module/[moduleId].tsx          ← Module detail (ported from pseed)
    reflection/[phaseId].tsx       ← Phase reflection (ported from pseed)
  hackathon-login.tsx              ← Email/password login screen
```

### Tab structure
Minimal 2-tab bar:
- **Home** — hackathon journey (current phase, team, timeline)
- **Profile** — team info + sign out button

No discover, my-paths, or any normal-app tabs.

---

## 3. Data Layer

### Files to port from `/Documents/pseed`
| Source | Destination |
|--------|-------------|
| `types/hackathon-program.ts` | `ps_app/types/hackathon-program.ts` |
| `lib/hackathonProgram.ts` | `ps_app/lib/hackathonProgram.ts` |
| `lib/hackathonProgramPreview.ts` | `ps_app/lib/hackathonProgramPreview.ts` |

These files contain all query logic (`getCurrentHackathonProgramHome`, `getHackathonPhaseDetail`, etc.) and types. Minor adaptation may be needed to use the ps_app Supabase client.

### Home screen
Port `pseed/app/hackathon-program/index.tsx` → `ps_app/app/(hackathon)/home.tsx`. It already handles loading, empty state (preview mode), current phase hero, team card, and timeline.

### Phase detail, module, and reflection screens
Port from pseed:
- `hackathon-program/phase/[phaseId].tsx` → `(hackathon)/phase/[phaseId].tsx`
- `hackathon-program/module/[moduleId].tsx` → `(hackathon)/module/[moduleId].tsx`
- `hackathon-program/reflection/[phaseId].tsx` → `(hackathon)/reflection/[phaseId].tsx`

---

## 4. Out of Scope

- Hackathon AI feedback (lives on web in pseed)
- Leaderboard
- Onboarding flow for hackathon users
- Deep-linking / push notifications for hackathon events

---

## 5. Verification

1. **Hackathon login button** appears on landing page
2. **Email/password login** works — valid hackathon credentials → routed to hackathon home
3. **Non-hackathon account** via hackathon button → error message shown
4. **Normal users** (Google/Apple/guest) → unaffected, routed as before
5. **App restart** with hackathon session → still lands on hackathon home (persistence works)
6. **Sign out** from hackathon profile → clears session, returns to landing page
7. **Hackathon home** shows current phase, team name, and program timeline
8. **Phase detail** navigates correctly from home
