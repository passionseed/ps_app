import React, { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { AppText } from "../AppText";
import { Accent, Text } from "../../lib/theme";
import { requestCompanionEmailChange, syncCompanionEmail } from "../../lib/shiftCompanion";
import type { CompanionCopy } from "../../lib/shiftCompanionCopy";
import { CompanionButton, CompanionField, TextAction } from "./CompanionUI";

export function CompanionEmailEditor({ userId, pendingEmail, copy, onSaved }: {
  userId: string;
  pendingEmail?: string;
  copy: CompanionCopy;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(!!pendingEmail);
  const [email, setEmail] = useState(pendingEmail ?? "");
  const [requested, setRequested] = useState(pendingEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const field = useRef<TextInput>(null);
  const fail = (cause: unknown) => {
    const code = cause instanceof Error ? cause.message : "network";
    setError(code === "email" ? copy.emailInvalid : code === "email_unchanged" ? copy.emailUnchanged
      : code === "verify_email" ? copy.authExpired : code === "email_change_failed" ? copy.emailChangeFailed : copy.network);
  };
  const request = useMutation({
    mutationFn: () => requestCompanionEmailChange(userId, email), retry: false,
    onSuccess: () => { setRequested(email.trim().toLowerCase()); setSaved(false); }, onError: fail,
  });
  const check = useMutation({
    mutationFn: (target?: string) => syncCompanionEmail(userId, target), retry: false,
    onSuccess: async result => {
      if (!result.confirmed) { setError(copy.emailChangePending); return; }
      setRequested(""); setEmail(""); setEditing(false); setSaved(true);
      await onSaved();
    }, onError: fail,
  });
  const busy = request.isPending || check.isPending;
  return <View style={styles.section}>
    {!editing ? <>
      <TextAction label={copy.changeEmail} disabled={busy} onPress={() => { setEditing(true); setError(null); setSaved(false); }} />
      <AppText style={styles.secondary}>{copy.emailSyncHelp}</AppText>
      <TextAction label={check.isPending ? copy.loading : requested ? copy.checkEmailChange : copy.syncEmail} disabled={busy} onPress={() => { setError(null); setSaved(false); check.mutate(requested || undefined); }} />
    </> : <>
      <AppText style={styles.secondary}>{copy.emailChangeHelp}</AppText>
      <CompanionField ref={field} label={copy.newEmail} value={email} onChangeText={setEmail} keyboardType="email-address"
        autoComplete="email" autoCapitalize="none" textContentType="emailAddress" editable={!busy && !requested} />
      {requested ? <>
        <AppText accessibilityLiveRegion="polite" style={styles.secondary}>{copy.emailChangeSent}</AppText>
        <CompanionButton label={check.isPending ? copy.loading : copy.checkEmailChange} disabled={busy}
          onPress={() => { setError(null); check.mutate(requested); }} />
        <TextAction label={copy.changeEmail} disabled={busy} onPress={() => { setRequested(""); setError(null); }} />
      </> : <CompanionButton label={request.isPending ? copy.loading : copy.sendEmailChange} disabled={busy} onPress={() => {
        setError(null); setSaved(false);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(copy.emailInvalid); field.current?.focus(); return; }
        request.mutate();
      }} />}
      <TextAction label={copy.back} disabled={busy} onPress={() => { setEditing(false); setError(null); }} />
    </>}
    {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
    {saved ? <AppText accessibilityLiveRegion="polite" style={styles.secondary}>{copy.emailChangeSaved}</AppText> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 16 },
  secondary: { color: Text.secondary, fontSize: 16, lineHeight: 24 },
  error: { color: Accent.errorStrong, fontSize: 16, lineHeight: 24 },
});
