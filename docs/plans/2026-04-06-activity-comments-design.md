# Activity Comments Feature Design

**Date:** 2026-04-06
**Feature:** Comment system for hackathon learning activities
**Status:** Approved

## Overview

Add a threaded comment system to hackathon learning activities, enabling participants to ask questions, share insights, and engage in discussions. Comments support 1-level threading (comment + replies), real-time updates, push notifications, and engagement-based sorting.

## Requirements Summary

- **Visibility:** All program participants can see and interact with comments
- **Thread depth:** 1 level (comment + replies)
- **Permissions:** 
  - Participants can create comments and reply to others
  - Authors can edit/delete own comments
  - Admins can delete any comment
- **Features:** Push notifications for replies
- **Sorting:** Most engaged first (replies weighted higher)
- **UI placement:** Preview (top 3) at bottom of activity screen, dedicated full page for all comments

---

## 1. Database Schema

### Tables

```sql
-- Main comments table
CREATE TABLE hackathon_activity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES hackathon_phase_activities(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 500),
  engagement_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_edited boolean DEFAULT false
);

-- Replies table (1 level deep only)
CREATE TABLE hackathon_activity_comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES hackathon_activity_comments(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 500),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_edited boolean DEFAULT false
);

-- Push tokens for notifications
CREATE TABLE hackathon_participant_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  push_token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_comments_activity ON hackathon_activity_comments(activity_id, deleted_at);
CREATE INDEX idx_comments_engagement ON hackathon_activity_comments(activity_id, engagement_score DESC NULLS LAST);
CREATE INDEX idx_replies_comment ON hackathon_activity_comment_replies(comment_id, deleted_at);
CREATE INDEX idx_push_tokens_participant ON hackathon_participant_push_tokens(participant_id);
```

### Engagement Score Trigger

```sql
-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION update_comment_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hackathon_activity_comments
  SET engagement_score = (
    SELECT COUNT(*) * 2
    FROM hackathon_activity_comment_replies
    WHERE comment_id = NEW.comment_id AND deleted_at IS NULL
  )
  WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers on reply insert/delete
CREATE TRIGGER trigger_reply_insert_engagement
  AFTER INSERT ON hackathon_activity_comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_engagement_score();

CREATE TRIGGER trigger_reply_delete_engagement
  AFTER DELETE ON hackathon_activity_comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_engagement_score();
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE hackathon_activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_activity_comment_replies ENABLE ROW LEVEL SECURITY;

-- Policies for comments
CREATE POLICY "Participants can view all comments"
  ON hackathon_activity_comments FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Participants can insert own comments"
  ON hackathon_activity_comments FOR INSERT
  WITH CHECK (auth.uid() = participant_id);

CREATE POLICY "Authors can update own comments"
  ON hackathon_activity_comments FOR UPDATE
  USING (auth.uid() = participant_id AND deleted_at IS NULL);

CREATE POLICY "Authors can delete own comments"
  ON hackathon_activity_comments FOR DELETE
  USING (auth.uid() = participant_id);

CREATE POLICY "Admins can delete any comment"
  ON hackathon_activity_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM hackathon_participants
      WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    )
  );

-- Policies for replies (similar structure)
CREATE POLICY "Participants can view all replies"
  ON hackathon_activity_comment_replies FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Participants can insert own replies"
  ON hackathon_activity_comment_replies FOR INSERT
  WITH CHECK (auth.uid() = participant_id);

CREATE POLICY "Authors can update own replies"
  ON hackathon_activity_comment_replies FOR UPDATE
  USING (auth.uid() = participant_id AND deleted_at IS NULL);

CREATE POLICY "Authors can delete own replies"
  ON hackathon_activity_comment_replies FOR DELETE
  USING (auth.uid() = participant_id);

CREATE POLICY "Admins can delete any reply"
  ON hackathon_activity_comment_replies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM hackathon_participants
      WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    )
  );
```

---

## 2. API/Library Functions

### File: `lib/hackathonComments.ts`

```typescript
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types
export interface CommentRecord {
  id: string;
  activity_id: string;
  participant_id: string;
  content: string;
  engagement_score: number;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

export interface ReplyRecord {
  id: string;
  comment_id: string;
  participant_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

export interface CommentWithReplies extends CommentRecord {
  replies: ReplyRecord[];
  participant: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

// CRUD Operations
export async function createActivityComment(
  activityId: string,
  participantId: string,
  content: string
): Promise<CommentRecord> {
  const { data, error } = await supabase
    .from('hackathon_activity_comments')
    .insert({
      activity_id: activityId,
      participant_id: participantId,
      content: content.trim()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function createCommentReply(
  commentId: string,
  participantId: string,
  content: string
): Promise<ReplyRecord> {
  const { data, error } = await supabase
    .from('hackathon_activity_comment_replies')
    .insert({
      comment_id: commentId,
      participant_id: participantId,
      content: content.trim()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateComment(
  commentId: string,
  participantId: string,
  content: string
): Promise<CommentRecord> {
  const { data, error } = await supabase
    .from('hackathon_activity_comments')
    .update({
      content: content.trim(),
      is_edited: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .eq('participant_id', participantId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteComment(
  commentId: string,
  participantId: string,
  isAdmin: boolean
): Promise<void> {
  const query = supabase
    .from('hackathon_activity_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);
  
  if (!isAdmin) {
    query.eq('participant_id', participantId);
  }
  
  const { error } = await query;
  if (error) throw error;
}

// Fetching
export async function getActivityComments(
  activityId: string,
  limit?: number
): Promise<CommentWithReplies[]> {
  let query = supabase
    .from('hackathon_activity_comments')
    .select(`
      *,
      participant:hackathon_participants(id, display_name, avatar_url),
      replies:hackathon_activity_comment_replies(
        *,
        participant:hackathon_participants(id, display_name, avatar_url)
      )
    `)
    .eq('activity_id', activityId)
    .is('deleted_at', null)
    .order('engagement_score', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Filter out deleted replies
  return data.map(comment => ({
    ...comment,
    replies: comment.replies.filter(r => r.deleted_at === null)
  }));
}

// Real-time Subscription
export function subscribeToActivityComments(
  activityId: string,
  callback: (comments: CommentWithReplies[]) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`comments:${activityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hackathon_activity_comments',
        filter: `activity_id=eq.${activityId}`
      },
      async () => {
        const comments = await getActivityComments(activityId);
        callback(comments);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hackathon_activity_comment_replies'
      },
      async () => {
        const comments = await getActivityComments(activityId);
        callback(comments);
      }
    )
    .subscribe();
  
  return channel;
}
```

---

## 3. UI Components

### Component Structure

```
components/Hackathon/
├── ActivityCommentsPreview.tsx    (top 3 preview on activity screen)
├── ActivityCommentsFull.tsx       (full list on dedicated page)
├── CommentCard.tsx                (single comment display)
├── ReplyCard.tsx                  (single reply display)
├── CommentInput.tsx               (add/edit comment input)
└── ReplyInput.tsx                 (add/edit reply input)
```

### Activity Screen Layout

```
┌─────────────────────────┐
│ Activity Content        │
│ (video, text, etc.)     │
│                         │
│ Assessment Section      │
│ (if applicable)         │
│                         │
├─────────────────────────┤
│ 💬 Comments (12)        │
│                         │
│ Top Comment 1           │
│ Top Comment 2           │
│ Top Comment 3           │
│                         │
│ [See All Comments →]    │
├─────────────────────────┤
│                         │
│ ↓ Swipe for next        │
│ activity                │
└─────────────────────────┘
```

### Dedicated Comments Page

Route: `app/(hackathon)/activity/[nodeId]/comments.tsx`

Features:
- Full comment list (sorted by engagement)
- Reply expansion (tap to show/hide)
- Add comment input at top
- Edit/delete actions
- Real-time subscription
- Back button to activity

### Component Details

**ActivityCommentsPreview.tsx**
- Props: `activityId`, `participantId`, `isAdmin`
- Shows top 3 comments only
- Comment count badge in header
- "See All Comments" button → navigates to dedicated page
- No reply expansion (just show reply count badge)
- Compact layout, minimal padding

**ActivityCommentsFull.tsx**
- Props: `activityId`, `participantId`, `isAdmin`
- Full comment list with pagination (20 per page)
- Reply expansion (tap comment to expand)
- Add comment input at top
- Real-time subscription on mount
- Loading skeleton on initial fetch
- Empty state: "No comments yet. Start the discussion!"

**CommentCard.tsx**
- Props: `comment`, `onEdit`, `onDelete`, `onExpand`, `isExpanded`
- Display: author avatar, name, timestamp, content
- Reply count badge (e.g., "3 replies")
- Edit/delete buttons (conditional on ownership/admin)
- "Edited" indicator if `is_edited === true`
- Tap to expand/collapse replies
- Bioluminescent styling

**ReplyCard.tsx**
- Props: `reply`, `onEdit`, `onDelete`
- Similar to CommentCard but indented
- Shows parent comment context (optional)
- Edit/delete buttons for own replies

**CommentInput.tsx**
- Props: `onSubmit`, `onCancel`, `initialValue?`, `isEdit?`
- Text input with character counter (max 500)
- Submit button (disabled if empty or over limit)
- Cancel button for edit mode
- Bioluminescent styling (dark bg, cyan accents)

**ReplyInput.tsx**
- Props: `commentId`, `onSubmit`, `onCancel`
- Similar to CommentInput
- Shows "Replying to [author name]" context
- Appears inline under parent comment when expanded

### Styling

- Background: #03050a (bioluminescent dark)
- Accent: #91C4E3 (cyan)
- Text: #ffffff, #a0a0a0 (secondary)
- Glow effects on active elements
- Smooth animations for reply expansion (300ms)
- Loading states with skeleton UI
- Empty state with encouraging message

---

## 4. Push Notifications

### Notification Triggers

1. **Reply to your comment**
   - Trigger: INSERT on `hackathon_activity_comment_replies`
   - Recipient: Parent comment author
   - Content: "[Replier Name] replied to your comment on [Activity Title]"
   - Deep link: `/activity/[nodeId]/comments?commentId=[commentId]`

### Implementation

**Edge Function: `supabase/functions/comment-notification/`**

```typescript
import { createClient } from '@supabase/supabase-js-js';

export default async function handler(req: Request) {
  const { record, table } = await req.json();
  
  if (table !== 'hackathon_activity_comment_replies') return;
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // 1. Get parent comment author
  const { data: comment } = await supabase
    .from('hackathon_activity_comments')
    .select('participant_id, activity_id')
    .eq('id', record.comment_id)
    .single();
  
  // 2. Don't notify if replying to own comment
  if (comment.participant_id === record.participant_id) return;
  
  // 3. Get activity title
  const { data: activity } = await supabase
    .from('hackathon_phase_activities')
    .select('title')
    .eq('id', comment.activity_id)
    .single();
  
  // 4. Get replier display name
  const { data: replier } = await supabase
    .from('hackathon_participants')
    .select('display_name')
    .eq('id', record.participant_id)
    .single();
  
  // 5. Get recipient push tokens
  const { data: tokens } = await supabase
    .from('hackathon_participant_push_tokens')
    .select('push_token, platform')
    .eq('participant_id', comment.participant_id);
  
  // 6. Send push notifications via Expo
  const messages = tokens.map(token => ({
    to: token.push_token,
    title: 'New Reply',
    body: `${replier.display_name} replied to your comment on ${activity.title}`,
    data: {
      type: 'comment_reply',
      activityId: comment.activity_id,
      commentId: record.comment_id
    }
  }));
  
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages)
  });
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
```

**Database Trigger:**

```sql
-- Notify Edge Function on reply insert
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via webhook
  -- (configured in Supabase dashboard)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reply_notification
  AFTER INSERT ON hackathon_activity_comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_reply();
```

**Push Token Registration:**

```typescript
// In app initialization or login
import * as Notifications from 'expo-notifications';

async function registerPushToken(participantId: string) {
  const { data: token } = await Notifications.getExpoPushTokenAsync();
  
  await supabase
    .from('hackathon_participant_push_tokens')
    .upsert({
      participant_id: participantId,
      push_token: token,
      platform: Platform.OS
    });
}
```

**Deep Link Handling:**

```typescript
// In app root
Notifications.addNotificationReceivedListener(notification => {
  const data = notification.request.content.data;
  if (data.type === 'comment_reply') {
    router.push(`/activity/${data.activityId}/comments?commentId=${data.commentId}`);
  }
});
```

---

## 5. Error Handling & Edge Cases

### Error Handling

1. **Network failures**
   - Show error toast: "Failed to post comment. Please try again."
   - Retry button on failed comments
   - Optimistic UI rollback on failure

2. **Real-time subscription drops**
   - Automatic reconnection with exponential backoff
   - Show "Reconnecting..." indicator
   - Manual refresh button as fallback

3. **Permission errors**
   - Clear error messages: "You can only edit your own comments"
   - Admin delete: confirmation dialog before action

4. **Content validation**
   - Empty comment: disable submit button
   - Character limit: warning at 450 chars, block at 500
   - Profanity filter (optional): warn before posting

### Edge Cases

1. **Deleted comments with replies**
   - Soft delete: comment shows "[Deleted]" placeholder
   - Replies remain visible (attached to placeholder)

2. **Edit after replies exist**
   - Allow editing (show "Edited" indicator)
   - Replies remain attached

3. **Concurrent edits**
   - Last edit wins (no conflict resolution)

4. **Empty comments section**
   - Show: "No comments yet. Start the discussion!"
   - Add comment input always visible

5. **Large number of comments**
   - Pagination on dedicated page (20 per page)
   - Preview shows top 3 regardless of total

6. **Offline scenario**
   - Queue comment locally (AsyncStorage)
   - Show "Pending" indicator
   - Sync when online

---

## 6. Testing Strategy

### Unit Tests

- API functions CRUD operations
- Engagement score calculation
- Permission checks
- Database triggers

### Integration Tests

- Real-time subscriptions
- Notification flow
- RLS policy enforcement

### E2E Tests

- Comment creation, edit, delete flow
- Reply creation and expansion
- Real-time updates across clients
- Notification delivery and deep link

### Manual QA Checklist

- Comments sorted by engagement correctly
- Reply count updates accurately
- Edit/delete actions work for authors
- Admin delete works with confirmation
- Real-time updates feel instant
- Push notifications arrive promptly
- Deep links navigate to correct comment
- Offline queue and sync works
- Character limit enforcement
- Empty state displays correctly

---

## Implementation Plan

See: `docs/plans/2026-04-06-activity-comments-implementation.md` (to be created)

## Dependencies

- Existing: Supabase, Expo Router, hackathon activity system
- New: Expo Notifications API, Supabase Realtime, Edge Functions

## Timeline Estimate

- Database setup: 1-2 hours
- API functions: 2-3 hours
- UI components: 4-6 hours
- Notifications: 2-3 hours
- Testing: 2-3 hours
- Total: ~12-17 hours