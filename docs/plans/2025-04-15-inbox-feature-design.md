# Inbox Feature Design Document

**Date**: 2025-04-15  
**Feature**: Hackathon Participant Inbox  
**Status**: Design Ready for Review

---

## 1. Overview

Add an inbox system to the hackathon experience that consolidates all participant communications: mentor feedback, admin announcements, submission reviews, and notifications. This creates a single source of truth for all important communications.

### Goals
- Centralize all participant communications in one place
- Surface unread items prominently on the home page
- Enable quick access to feedback and action items
- Support multiple inbox item types (reviews, comments, announcements)

---

## 2. User Experience

### 2.1 Inbox Card on Home Page
**Location**: Hackathon program home page (`/hackathon-program/index.tsx`)

**Design**:
- Positioned prominently near the top, below the current phase card
- GlassCard component with "education" variant (purple accent)
- Badge showing unread count
- Preview of the most recent 1-2 inbox items
- Click navigates to full inbox page

**States**:
- **Empty**: "No messages yet" with subtle styling
- **Unread items**: Bold title, unread badge, preview text
- **All read**: Muted styling, "You're all caught up!"

### 2.2 Inbox Page
**Route**: `/hackathon-program/inbox.tsx`

**Design**:
- Full-screen scrollable list
- Header with back button, title "Inbox", mark-all-read button
- Filter tabs: All | Unread | Mentions
- List items grouped by date (Today, Yesterday, Earlier)

**Item Card Structure**:
- Icon based on type (review, comment, announcement)
- Title
- Body preview (2 lines max)
- Timestamp
- Unread indicator (dot)
- Action hint (e.g., "View submission")

### 2.3 Item Types

1. **Assessment Review** (`assessment_review`)
   - Icon: Checkmark or document
   - Trigger: Submission review completed
   - Action: Link to reviewed submission

2. **Mentor Comment** (`mentor_comment`)
   - Icon: Chat bubble
   - Trigger: Mentor leaves feedback on activity
   - Action: Link to activity with comment

3. **Admin Announcement** (`admin_announcement`)
   - Icon: Megaphone
   - Trigger: Admin posts program-wide message
   - Action: May have external link or just informational

4. **System Notification** (`system`)
   - Icon: Bell
   - Trigger: Automated notifications (deadlines, etc.)
   - Action: Contextual link

---

## 3. Database Structure

### Existing Schema (from migration 20260410000001)

Table: `hackathon_participant_inbox_items`

```sql
CREATE TABLE public.hackathon_participant_inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'assessment_review',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hackathon_inbox_participant_created
  ON public.hackathon_participant_inbox_items(participant_id, created_at DESC);

CREATE INDEX idx_hackathon_inbox_participant_unread
  ON public.hackathon_participant_inbox_items(participant_id, read_at)
  WHERE read_at IS NULL;
```

**RLS Policy**:
- Participants can only read their own inbox items
- Admins can manage all inbox items

---

## 4. Data Access Layer

### Library File: `lib/hackathonInbox.ts`

**Functions**:

```typescript
// Fetch inbox items for current participant
export async function getInboxItems(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<InboxItem[]>;

// Get unread count for badge
export async function getUnreadInboxCount(): Promise<number>;

// Mark item as read
export async function markInboxItemRead(itemId: string): Promise<void>;

// Mark all items as read
export async function markAllInboxItemsRead(): Promise<void>;

// Real-time subscription for new items
export async function subscribeToInbox(
  participantId: string,
  callback: (items: InboxItem[]) => void
): Promise<RealtimeChannel>;
```

### Types: `types/hackathon-inbox.ts`

```typescript
export type InboxItemType = 
  | 'assessment_review' 
  | 'mentor_comment' 
  | 'admin_announcement' 
  | 'system';

export interface InboxItem {
  id: string;
  participant_id: string;
  type: InboxItemType;
  title: string;
  body: string;
  action_url?: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  isUnread: boolean;
}

export interface InboxPreview {
  unreadCount: number;
  recentItems: InboxItem[];
}
```

---

## 5. UI Components

### 5.1 InboxCard (Home Page)

**Props**:
```typescript
interface InboxCardProps {
  preview: InboxPreview | null;
  onPress: () => void;
}
```

**Features**:
- Displays unread count badge
- Shows up to 2 recent item previews
- Uses GlassCard "education" variant
- Animated entrance

### 5.2 InboxItemRow (Inbox Page)

**Props**:
```typescript
interface InboxItemRowProps {
  item: InboxItem;
  onPress: () => void;
}
```

**Features**:
- Icon based on type
- Bold title for unread items
- 2-line body preview
- Timestamp relative ("2h ago")
- Swipe to mark read (future enhancement)

---

## 6. Navigation

**New Route**: `/hackathon-program/inbox`

**Navigation Flow**:
1. User sees InboxCard on home page
2. Tap → `router.push('/hackathon-program/inbox')`
3. Inbox page loads with filter tabs
4. Tap item → navigate to `action_url` if provided, or mark read
5. Back button returns to home

---

## 7. Integration Points

### 7.1 Existing Systems

1. **Submission Reviews** (`hackathon_submission_reviews`)
   - When review created/updated → create inbox item
   - Link submission_review_id in metadata

2. **Comments** (`hackathon_activity_comments`)
   - When mentor/admin replies → create inbox item
   - Link comment_id in metadata

3. **Push Notifications** (future)
   - Inbox items can trigger push notifications
   - Separate from in-app inbox

### 7.2 Edge Functions (future)

Consider edge function to:
- Auto-create inbox items when reviews are added
- Batch notifications
- Clean up old read items

---

## 8. Success Metrics

- Inbox card visible on home page
- Tap navigates to inbox page
- Unread count badge updates correctly
- Items display with correct type icons
- Mark as read functionality works
- Real-time updates when new items arrive

---

## 9. Open Questions

1. Should we auto-mark items as read when navigated to action_url?
2. Should we support archiving/deleting items?
3. How long to retain read items? (30 days default?)
4. Should mentor comments from activities appear in inbox?

---

## 10. Implementation Plan

### Phase 1: Core Infrastructure
1. ✅ Database table exists (migration already applied)
2. Create types file
3. Create data library with queries

### Phase 2: UI Components
1. Create InboxCard for home page
2. Create Inbox page
3. Add navigation

### Phase 3: Integration
1. Wire up to home page
2. Test with sample data
3. Handle edge cases (empty, error states)

---

**Next Step**: CEO Review
