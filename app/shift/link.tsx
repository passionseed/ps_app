import React, { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { shiftStorage } from "../../lib/shiftStorage";
import { router } from "expo-router";
import { AppText } from "../../components/AppText";
import {
  CompanionButton,
  CompanionField,
  CompanionScreen,
  CompanionSupport,
  LangSwitch,
  TextAction,
  companionMessage,
  isNetworkError,
  useCompanionLang,
} from "../../components/shift/CompanionUI";
import { useAuth } from "../../lib/auth";
import { Accent, Text } from "../../lib/theme";
import {
  claimLinkCode,
  normalizeCode,
  normalizeMobile,
  previewLinkCode,
  sendEmailOtp,
  sessionEmailConfirmed,
  verifyEmailOtp,
} from "../../lib/shiftCompanion";

type Step = "code" | "contact" | "otp" | "done";

export default function ShiftLink() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previewMutation = useMutation({ mutationFn: previewLinkCode, retry: false });
  const claimMutation = useMutation({ mutationFn: claimLinkCode, retry: false });
  const { lang, setLang, copy } = useCompanionLang();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [cohortName, setCohortName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const signedIn = sessionEmailConfirmed(user, user?.email ?? email);
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);
  const [country, setCountry] = useState("66");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [already, setAlready] = useState(false);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobileRef = useRef<TextInput>(null);
  const otpRef = useRef<TextInput>(null);
  useEffect(() => () => { if (resendTimer.current) clearInterval(resendTimer.current); }, []);
  // Persist only non-secret contact inputs; neither linking codes nor OTPs are stored.
  useEffect(() => {
    const key = `shift-link-contact:${user?.id ?? "anonymous"}`;
    let alive = true;
    void shiftStorage.getItem(key).then(raw => {
      if (!raw || !alive) return;
      const contact = JSON.parse(raw);
      if (typeof contact.email === "string" && !user?.email) setEmail(contact.email);
      if (typeof contact.country === "string") setCountry(contact.country);
      if (typeof contact.mobile === "string") setMobile(contact.mobile);
    }).catch(() => {});
    return () => { alive = false; };
  }, [user?.id, user?.email]);
  useEffect(() => {
    if (step === "code" || step === "done") return;
    void shiftStorage.setItem(`shift-link-contact:${user?.id ?? "anonymous"}`, JSON.stringify({ email, country, mobile })).catch(() => {});
  }, [email, country, mobile, step, user?.id]);
  const codeRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const fail = (value: unknown) => {
    if (isNetworkError(value)) {
      setError(copy.network);
      return;
    }
    const message = value instanceof Error ? value.message : copy.network;
    setError(message);
  };

  const startResend = () => {
    setResendIn(60);
    if (resendTimer.current) clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendIn((current) => {
        if (current <= 1) {
          if (resendTimer.current) clearInterval(resendTimer.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const claim = async (address: string) => {
    const normalized = normalizeMobile(country, mobile);
    if (!normalized) {
      setError(copy.mobileInvalid);
      setStep("contact");
      return;
    }
    const result = await claimMutation.mutateAsync({
      code,
      email: address,
      countryCode: country,
      mobile,
    });
    if (!result.ok) {
      setError(companionMessage(copy, result.error, result.wait_minutes));
      if (result.error === "verify_email") setStep("otp");
      else if (result.error === "mobile" || result.error === "email_mismatch") setStep("contact");
      return;
    }
    setCohortName(result.cohort.name);
    setAlready(result.already);
    await shiftStorage.removeItem(`shift-link-contact:${user?.id ?? "anonymous"}`).catch(() => {});
    await shiftStorage.removeItem("shift-link-contact:anonymous").catch(() => {});
    const claimedUserId = result.user_id || user?.id;
    if (claimedUserId) {
      queryClient.setQueryData(queryKeys.shift.selection(claimedUserId), result.cohort.id);
      await shiftStorage.setItem(`shift-cohort:${claimedUserId}`, result.cohort.id).catch(() => {});
      const key = queryKeys.shift.companion(claimedUserId);
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData(key, (previous: any) => ({
        ok: true, linked: true, email: address, mobile: normalized,
        cohorts: [{ ...result.cohort, mobile: normalized }, ...(previous?.cohorts ?? []).filter((item: { id: string }) => item.id !== result.cohort.id)],
      }));
      void queryClient.invalidateQueries({ queryKey: queryKeys.shift.user(claimedUserId) });
    }
    setCode(""); setOtp(""); setStep("done");
  };

  const onContinue = async () => {
    setError(null);
    if (!code.trim()) {
      setError(copy.codeEmpty);
      codeRef.current?.focus();
      return;
    }
    if (!normalizeCode(code)) {
      setError(copy.codeInvalid);
      codeRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const preview = await previewMutation.mutateAsync(code);
      if (!preview.ok) {
        setError(companionMessage(copy, preview.error, preview.wait_minutes));
        codeRef.current?.focus();
        return;
      }
      setCohortName(preview.cohort_name);
      setStep("contact");
    } catch (value) {
      fail(value);
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setError(null);
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(copy.emailInvalid);
      emailRef.current?.focus();
      return;
    }
    if (!normalizeMobile(country, mobile)) {
      setError(copy.mobileInvalid);
      mobileRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (sessionEmailConfirmed(user, address)) {
        await claim(address);
        return;
      }
      await sendEmailOtp(address);
      setStep("otp");
      startResend();
    } catch (value) {
      fail(value);
    } finally {
      setBusy(false);
    }
  };

  const onOtp = async () => {
    setError(null);
    const token = otp.replace(/\s/g, "");
    if (token.length < 6) {
      setError(copy.otpHelp);
      otpRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await verifyEmailOtp(email.trim(), token);
      await claim(email.trim());
    } catch (value) {
      fail(value);
    } finally {
      setBusy(false);
    }
  };

  const footer =
    step === "code" ? (
      <CompanionButton label={busy ? copy.loading : copy.continue} onPress={() => void onContinue()} disabled={busy} />
    ) : step === "contact" ? (
      <CompanionButton
        label={signedIn ? copy.connectAccount : copy.verifyConnect}
        onPress={() => void onVerify()}
        disabled={busy}
      />
    ) : step === "otp" ? (
      <CompanionButton label={copy.verifyConnect} onPress={() => void onOtp()} disabled={busy} />
    ) : (
      <CompanionButton label={copy.writeToday} onPress={() => router.replace("/shift/today")} />
    );

  return (
    <CompanionScreen footer={footer}>
      <LangSwitch lang={lang} onChange={setLang} />
      <AppText variant="bold" style={{ color: Text.primary, fontSize: 16, marginTop: 12 }}>
        {copy.brand}
      </AppText>
      {step === "code" ? (
        <View style={{ gap: 20, marginTop: 24 }}>
          <AppText variant="bold" style={{ color: Text.primary, fontSize: 24 }}>
            {copy.connectTitle}
          </AppText>
          <AppText style={{ color: Text.secondary, fontSize: 16 }}>{copy.connectHelp}</AppText>
          <CompanionField
            ref={codeRef}
            label={copy.codeLabel}
            editable={!busy}
            value={code}
            onChangeText={(value) => {
              setCode(value);
              setError(null);
            }}
            placeholder={copy.codePlaceholder}
            autoCapitalize="characters"
            autoCorrect={false}
            error={error}
          />
          <CompanionSupport copy={copy} title={copy.needCode} />
          <TextAction label={copy.signInExisting} onPress={() => router.push("/shift/sign-in")} />
          <TextAction label={copy.otherApp} onPress={() => router.push("/welcome")} />
        </View>
      ) : null}
      {step === "contact" ? (
        <View style={{ gap: 20, marginTop: 24 }}>
          <TextAction label={copy.back} onPress={() => { setError(null); setStep("code"); }} />
          <AppText variant="bold" style={{ color: Text.primary, fontSize: 24 }}>
            {copy.connectCohort} {cohortName}
          </AppText>
          <CompanionField
            ref={emailRef}
            label={copy.emailLabel}
            value={email}
            onChangeText={setEmail}
            placeholder={copy.emailPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!signedIn && !busy}
            error={error && !error.includes(copy.mobileInvalid) ? error : null}
          />
          <AppText style={{ color: Text.primary, fontSize: 16 }}>{copy.mobileLabel}</AppText>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ width: 96 }}>
              <CompanionField
                label={copy.countryLabel}
                editable={!busy}
                value={country}
                onChangeText={setCountry}
                keyboardType="phone-pad"
                autoComplete="tel-country-code"
              />
            </View>
            <View style={{ flex: 1 }}>
              <CompanionField
                ref={mobileRef}
                label={copy.mobileLabel}
                editable={!busy}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                error={error === copy.mobileInvalid ? error : null}
              />
            </View>
          </View>
          <AppText style={{ color: Text.secondary, fontSize: 16 }}>{copy.privateNote}</AppText>
          {error && error !== copy.mobileInvalid ? (
            <AppText accessibilityRole="alert" style={{ color: Accent.errorStrong, fontSize: 16 }}>{error}</AppText>
          ) : null}
        </View>
      ) : null}
      {step === "otp" ? (
        <View style={{ gap: 20, marginTop: 24 }}>
          <TextAction label={copy.changeEmail} onPress={() => { setError(null); setStep("contact"); }} />
          <AppText variant="bold" style={{ color: Text.primary, fontSize: 24 }}>{copy.otpTitle}</AppText>
          <AppText style={{ color: Text.secondary, fontSize: 16 }}>{copy.otpHelp}</AppText>
          <CompanionField
            ref={otpRef}
            label={copy.otpLabel}
            editable={!busy}
            value={otp}
            onChangeText={setOtp}
            placeholder={copy.otpPlaceholder}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            error={error}
          />
          <TextAction
            label={resendIn > 0 ? `${copy.resendWait} ${resendIn}` : copy.resend}
            onPress={() => {
              if (resendIn > 0 || busy) return;
              setBusy(true);
              sendEmailOtp(email.trim())
                .then(startResend)
                .catch(fail)
                .finally(() => setBusy(false));
            }}
          />
        </View>
      ) : null}
      {step === "contact" || step === "otp" ? <CompanionSupport copy={copy} /> : null}
      {step === "done" ? (
        <View style={{ gap: 16, marginTop: 24 }}>
          <AppText variant="bold" style={{ color: Text.primary, fontSize: 24 }}>
            {already ? copy.already : `${copy.connected} ${cohortName}.`}
          </AppText>
          <AppText style={{ color: Text.secondary, fontSize: 16 }}>{copy.contactLater}</AppText>
        </View>
      ) : null}
    </CompanionScreen>
  );
}
