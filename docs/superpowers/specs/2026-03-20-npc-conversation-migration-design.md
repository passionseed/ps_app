# NPC Conversation Migration: Web Developer PathLab

**Date:** 2026-03-20
**Status:** Approved

## Problem

The Web Developer PathLab seed (5 days) contains 5 `npc_chat` `path_content` rows that store conversations in an obsolete inline format (`content_body.messages[]`). The current app code expects:

1. A `path_npc_conversations` record with a node tree
2. `path_content.metadata.conversation_id` pointing to that record

Result: every NPC activity crashes with `"No conversation_id in metadata"`.

## Scope

- 5 NPC activities across Days 1–5 of the Web Developer seed
- Seed id: `f989a28a-1c4f-42b6-929f-fe00bc77f533`
- NPC: PM Alex (avatar in `seed_npc_avatars` for this seed)

## Data Design

### Tables written

| Table | Rows added |
|---|---|
| `path_npc_conversations` | 5 (one per day's NPC activity) |
| `path_npc_conversation_nodes` | ~14 (varies by conversation) |
| `path_npc_conversation_choices` | ~10 |
| `path_content` (replace) | 5 old rows deleted, 5 new rows inserted |

### Conversation trees

**Day 1 — PM Alex Introduction** (activity `9f434488-e3e8-44dd-8a24-205e8c95568c`)
```
[statement: "Hey! I'm Alex... Today's mission: setup, explore, prototype..."]
  → "Got it!" → [end]
```

**Day 2 — Requirements Review with Alex** (activity `51ee205c-bb52-4a87-a0c1-3af6c4a21ba0`)
```
[statement: "I saw your v0 prototype - nice start! Who is this for? What's the ONE thing..."]
  → "Got it!" → [end]
```

**Day 3 — Sprint Check-in with Alex** (activity `439b6bea-0914-4e09-aa0d-e8ff3c15227d`)
```
[statement: "How's the sprint going? What's working? What's blocking you?..."]
  → "Got it!" → [end]
```

**Day 4 — Final Review with Alex** (activity `3dc1dbbe-8229-43ce-9fcd-3e6a17e1935a`)
```
[statement: "Looking good! Let's do a final review before we ship."]
  → Continue →
[statement: "Tell me: 1. What are you most proud of? 2. What would you do differently? 3. Are you ready to ship?"]
  → [question: "Ready to ship, or blocked?"]
      ├─ "I'm ready to ship!"   → [statement: "Amazing! Let's push it live. You shipped something real."] → [end]
      └─ "I'm blocked by..."    → [statement: "That's totally normal. Let's simplify scope and ship what you have."] → [end]
```

**Day 5 — Sprint Retrospective with Alex** (activity `56504356-073f-4ee4-bd04-4193221751b5`)
```
[statement: "Great sprint! Let's do a retrospective... These aren't just project questions—they're career questions."]
  → "Got it!" → [end]
```

### path_content update per NPC activity

Old row:
```sql
content_type: 'npc_chat'
content_body: '{ "npc_id": "pm-alex", "messages": [...] }'
metadata: null
```

New row:
```sql
content_type: 'npc_chat'
content_body: null
metadata: '{ "conversation_id": "<uuid>" }'
```

## Implementation Plan

### File 1: `supabase/migrations/<timestamp>_npc_conversation_migration.sql`

A migration that:
1. Looks up the Alex NPC avatar id via `seed_npc_avatars WHERE seed_id = 'f989a28a...'` — stores in a local variable for use on every node row
2. Inserts 5 `path_npc_conversations` rows with deterministic UUIDs, **with `root_node_id = NULL` initially** (forward-reference not yet known)
3. Inserts all `path_npc_conversation_nodes` rows — **every node row sets `npc_avatar_id` to the Alex avatar id looked up in step 1**
4. Inserts all `path_npc_conversation_choices` rows linking nodes
5. **`UPDATE path_npc_conversations SET root_node_id = <first_node_uuid> WHERE id = <conversation_uuid>`** — one UPDATE per conversation after its nodes are inserted
6. Deletes old `path_content` rows (matched on `activity_id + content_type = 'npc_chat'`) — **safe: no other table has a FK referencing `path_content.id`, confirmed by schema inspection**
7. Inserts new `path_content` rows with `metadata: { conversation_id: "<uuid>" }`

### File 2: `supabase/seed/web-developer-pathlab-seed.sql` (update)

Replace the 5 old `npc_chat` `path_content` inserts with the proper structure:
- `path_npc_conversations` inserts with fixed UUIDs
- `path_npc_conversation_nodes` inserts
- `path_npc_conversation_choices` inserts
- `path_content` inserts with `metadata: { conversation_id: "..." }`

## No code changes required

The existing `initNPCDialogue` in `app/activity/[activityId].tsx` already handles the correct format. Once the data is fixed, the error resolves.

## Success criteria

- Opening any NPC activity in the Web Developer path no longer throws `"No conversation_id in metadata"`
- All 5 Alex conversations display in the app with correct node/choice flow
- Day 4 shows branching choices ("I'm ready to ship!" vs "I'm blocked by...")
- Fresh `supabase db reset` produces working NPC conversations without manual migration
