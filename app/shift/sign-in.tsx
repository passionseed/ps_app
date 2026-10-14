import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppText } from "../../components/AppText";
import { CompanionButton, CompanionField, CompanionLoadState, CompanionScreen, CompanionSupport, LangSwitch, TextAction, useCompanionLang } from "../../components/shift/CompanionUI";
import { useAuth } from "../../lib/auth";
import { useShiftCompanion } from "../../lib/hooks/useShiftCompanion";
import { queryKeys } from "../../lib/queryClient";
import { clearCompanionResume, loadCompanionResume, permittedCompanionResume } from "../../lib/shiftCompanionRecovery";
import { shiftStorage } from "../../lib/shiftStorage";
import { sendEmailOtp, sessionEmailConfirmed, verifyEmailOtp } from "../../lib/shiftCompanion";
import { Accent, Text } from "../../lib/theme";

export default function ShiftSignIn() {
  const { user } = useAuth();
  const { lang, setLang, copy } = useCompanionLang();
  const access = useShiftCompanion();
  const client = useQueryClient();
  const [email, setEmail] = useState(user?.email ?? "");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [resendAt, setResendAt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [verifyingAccess, setVerifyingAccess] = useState(false);
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const tokenRef = useRef<TextInput>(null);
  const pending = useRef(false);
  const navigationStarted = useRef(false);
  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  const send = useMutation({ mutationFn: () => sendEmailOtp(email.trim(), false), retry: false });
  const verify = useMutation({ mutationFn: () => verifyEmailOtp(email.trim(), token.replace(/\s/g, "")), retry: false });
  const busy = send.isPending || verify.isPending || verifyingAccess;
  const wait = Math.max(0, Math.ceil((resendAt - clock) / 1000));
  const sendCode = async () => {
    if (pending.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(copy.emailInvalid); emailRef.current?.focus(); return; }
    pending.current = true; setError(null);
    try {
      await send.mutateAsync(); setStep("otp"); setClock(Date.now()); setResendAt(Date.now() + 60_000);
    } catch { setError(copy.network); }
    finally { pending.current = false; }
  };
  const confirm = async () => {
    if (pending.current) return;
    if (token.replace(/\s/g, "").length < 6) { setError(copy.otpHelp); tokenRef.current?.focus(); return; }
    pending.current = true; setError(null);
    try {
      const id = await verify.mutateAsync();
      setToken(""); setVerifyingAccess(true);
      await client.cancelQueries({ queryKey: queryKeys.shift.companion(id) });
      await client.invalidateQueries({ queryKey: queryKeys.shift.companion(id) });
      setVerifiedId(id);
    } catch { setError(copy.verifyFirst); }
    finally { pending.current = false; setVerifyingAccess(false); }
  };
  useEffect(() => {
    if (!verifiedId || user?.id !== verifiedId || !sessionEmailConfirmed(user, email) ||
      access.statusQuery.isPending || access.statusQuery.isFetching || access.error || navigationStarted.current) return;
    navigationStarted.current = true;
    let cancelled = false;
    void (async () => {
      const resume = permittedCompanionResume(await loadCompanionResume(verifiedId), access.cohorts);
      if (cancelled) return;
      if (resume) {
        client.setQueryData(queryKeys.shift.selection(verifiedId), resume.cohortId);
        await shiftStorage.setItem(`shift-cohort:${verifiedId}`, resume.cohortId).catch(() => {});
        if (cancelled) return;
        await clearCompanionResume(verifiedId);
        client.setQueryData(queryKeys.shift.resume(verifiedId), null);
        router.replace({ pathname: "/shift/update", params: { date: resume.date } });
      } else router.replace(access.cohorts.length ? "/shift/today" : "/shift/link");
    })();
    return () => { cancelled = true; navigationStarted.current = false; };
  }, [verifiedId, user, email, access.cohorts, access.statusQuery.isPending, access.statusQuery.isFetching, access.error, client]);

  return <CompanionScreen footer={verifiedId ? undefined : <CompanionButton
    label={busy ? copy.loading : step === "email" ? copy.sendSignInCode : copy.confirmSignIn}
    disabled={busy} onPress={() => void (step === "email" ? sendCode() : confirm())} />}>
    <View style={styles.header}><TextAction label={copy.back} onPress={() => router.replace("/shift/link")} /><LangSwitch lang={lang} onChange={setLang} /></View>
    <View style={styles.section}>
      <AppText variant="bold" accessibilityRole="header" style={styles.title}>{copy.signInTitle}</AppText>
      <AppText style={styles.secondary}>{copy.signInHelp}</AppText>
      <CompanionField ref={emailRef} label={copy.emailLabel} value={email} onChangeText={setEmail}
        keyboardType="email-address" autoComplete="email" autoCapitalize="none" textContentType="emailAddress" editable={step === "email" && !busy && !verifiedId} />
      {step === "otp" && !verifiedId ? <>
        <CompanionField ref={tokenRef} label={copy.otpLabel} value={token} onChangeText={setToken} keyboardType="number-pad"
          autoComplete="one-time-code" textContentType="oneTimeCode" editable={!busy} />
        <TextAction label={wait ? `${copy.resendWait} ${wait}` : copy.resend} onPress={() => { if (!wait && !busy) void sendCode(); }} />
        <TextAction label={copy.changeEmail} onPress={() => { if (!busy) { setStep("email"); setToken(""); setError(null); } }} />
      </> : null}
      {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
      {verifiedId ? <CompanionLoadState loading={access.loading || access.statusQuery.isFetching} error={access.error} onRetry={() => void access.reload()} /> : null}
    </View>
    <CompanionSupport copy={copy} />
  </CompanionScreen>;
}
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { marginTop: 24, gap: 20 }, title: { color: Text.primary, fontSize: 24 },
  secondary: { color: Text.secondary, fontSize: 16, lineHeight: 24 }, error: { color: Accent.errorStrong, fontSize: 16 } });
