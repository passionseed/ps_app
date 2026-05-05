# Contact Support Feature Plan

## Objective
Implement a contact support feature in the settings page that allows users to send support messages. These messages will be saved in a new dedicated database table so administrators can review and assist.

## Key Files & Context
- `app/settings.tsx`: The main settings page containing the "Contact Support" button.
- `app/contact-support.tsx`: (New File) The dedicated screen for users to submit their support messages.
- `supabase/migrations/20260503000000_create_support_messages.sql`: (New File) The migration script for the new database table.

## Proposed Solution
1. **Database Schema:** 
   - Create a new table `support_messages`.
   - Columns: `id` (UUID), `user_id` (UUID, FK to `auth.users`), `message` (TEXT), `status` (TEXT, enum: 'open', 'in_progress', 'resolved'), `created_at` (TIMESTAMPTZ), and `updated_at` (TIMESTAMPTZ).
   - Enable Row Level Security (RLS) allowing users to insert and read only their own messages, while admins can read and update all messages.

2. **Frontend UI - Contact Support Screen:**
   - Create `app/contact-support.tsx`.
   - Include a large `TextInput` for the user to type their message.
   - Display a submit button with a loading state during the database insert operation.
   - Upon success, show an alert and navigate back to the settings page.

3. **Frontend UI - Settings Page Updates:**
   - Update `app/settings.tsx`.
   - Replace the existing `handleContactSupport` function (which currently uses `Linking.openURL` to send an email) with a router push to the new `/contact-support` route.

## Implementation Steps
1. Create the Supabase migration file `supabase/migrations/20260503000000_create_support_messages.sql`.
2. Create the frontend component `app/contact-support.tsx`.
3. Modify `app/settings.tsx` to route to the new screen.
4. Test the flow by submitting a message and verifying it appears in the database.

## Alternatives Considered
- **Reusing an existing feedback table:** Based on user preference, we decided to create a dedicated `support_messages` table to keep support inquiries logically separated from general app feedback or other requests.
- **Modal vs Dedicated Screen:** We opted for a dedicated screen to provide more space for the user to describe their issue in detail, rather than a constrained modal overlay.

## Verification & Testing
- Attempt to navigate to the new Contact Support screen from Settings.
- Submit a support message and verify it successfully saves to the database.
- Check Supabase dashboard (or run a query) to ensure the message `status` defaults to 'open' and the `user_id` matches the authenticated user.
- Verify RLS policies by ensuring a regular user cannot query messages belonging to other users.