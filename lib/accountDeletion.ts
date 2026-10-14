/**
 * Delete the signed-in Passion Seed account (same edge function as app/settings.tsx). The caller
 * clears local SHIFT data (E10) and signs out afterwards.
 */
export async function deleteMyAccount(input: { userId: string; accessToken: string | undefined }): Promise<void> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) throw new Error("Missing Supabase configuration");
  if (!input.accessToken) throw new Error("Not signed in");

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-user-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      apikey: publishableKey,
    },
    body: JSON.stringify({ userId: input.userId, confirmDelete: true }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to delete account");
  }
}
