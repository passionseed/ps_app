/**
 * Distinguishes an explicit sign-out from a session that expired (E14). `lib/auth.tsx` marks
 * explicit sign-outs; the root navigator treats any other SIGNED_OUT with local drafts as expiry.
 */
let explicitSignOut = false;

export function noteExplicitSignOut(): void {
  explicitSignOut = true;
}

export function consumeExplicitSignOut(): boolean {
  const value = explicitSignOut;
  explicitSignOut = false;
  return value;
}
