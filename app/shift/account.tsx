import React, { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { AppText } from "../../components/AppText";
import { CompanionEmailEditor } from "../../components/shift/CompanionEmailEditor";
import { CompanionButton, CompanionField, CompanionLoadState, CompanionScreen, CompanionSupport, LangSwitch, TextAction, companionMessage, useCompanionLang } from "../../components/shift/CompanionUI";
import { useAuth } from "../../lib/auth";
import { useShiftCompanion } from "../../lib/hooks/useShiftCompanion";
import { Text } from "../../lib/theme";
import { normalizeMobile, updateCompanionMobile } from "../../lib/shiftCompanion";

export default function ShiftAccount() {
  const { user, signOut } = useAuth();
  const { lang, setLang, copy } = useCompanionLang();
  const { cohort, cohorts, statusQuery, select, reload } = useShiftCompanion();
  const [country, setCountry] = useState("66");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const mobileRef = useRef<TextInput>(null);
  const save = useMutation({ mutationFn: async () => {
    if (!cohort || !normalizeMobile(country, mobile)) throw new Error("mobile");
    const result = await updateCompanionMobile({ cohortId: cohort.id, countryCode: country, mobile });
    if (!result.ok) throw new Error(result.error);
    return result;
  }, retry: false, onSuccess: async () => { setSaved(true); await reload(); },
    onError: () => setError(copy.network) });
  return <CompanionScreen>
    <TextAction label={copy.back} onPress={() => router.replace("/shift/today")} />
    <View style={styles.header}><AppText variant="bold" accessibilityRole="header" style={styles.title}>{copy.account}</AppText><LangSwitch lang={lang} onChange={setLang} /></View>
    <CompanionLoadState loading={statusQuery.isPending} error={statusQuery.error} onRetry={() => void reload()} />
    <View style={styles.section}><AppText style={styles.secondary}>{copy.email}</AppText><AppText style={styles.body}>{statusQuery.data?.email || user?.email}</AppText></View>
    {user?.id && cohort ? <CompanionEmailEditor key={user.id} userId={user.id} pendingEmail={user.new_email} copy={copy} onSaved={reload} /> : null}
    <View style={styles.section}><AppText style={styles.secondary}>{copy.currentCohort}</AppText><AppText style={styles.body}>{cohort?.name}</AppText></View>
    {cohorts.length > 1 ? <View style={styles.section}><AppText style={styles.secondary}>{copy.chooseCohort}</AppText>{cohorts.map(item => <TextAction key={item.id} label={`${item.id === cohort?.id ? "✓ " : ""}${item.name}`} onPress={() => { void select(item.id); setSaved(false); setMobile(""); }} />)}</View> : null}
    <View style={styles.section}><AppText style={styles.secondary}>{copy.mobile}</AppText><AppText style={styles.body}>{cohort?.mobile || "—"}</AppText><AppText style={styles.secondary}>{copy.mobileHint}</AppText></View>
    <View style={styles.fields}>
      <View style={styles.country}><CompanionField label={copy.countryLabel} value={country} onChangeText={setCountry} keyboardType="phone-pad" editable={!save.isPending} /></View>
      <View style={styles.phone}><CompanionField ref={mobileRef} label={copy.mobileLabel} value={mobile} onChangeText={value => { setMobile(value); setSaved(false); }} keyboardType="phone-pad" autoComplete="tel" editable={!save.isPending} error={error} /></View>
    </View>
    <View style={styles.section}><CompanionButton label={save.isPending ? copy.saving : copy.saveMobile} disabled={save.isPending || !cohort} onPress={() => {
      setError(null); setSaved(false);
      if (!normalizeMobile(country, mobile)) { setError(companionMessage(copy, "mobile")); mobileRef.current?.focus(); return; }
      save.mutate();
    }} />{saved ? <AppText accessibilityLiveRegion="polite" style={styles.secondary}>{copy.contactSaved}</AppText> : null}</View>
    <CompanionSupport copy={copy} />
    <View style={styles.section}>
      <TextAction label={copy.connectAnother} onPress={() => router.push("/shift/link")} />
      <TextAction label={copy.signOut} onPress={() => { void signOut().then(() => router.replace("/shift/link")).catch(() => setError(copy.network)); }} />
    </View>
  </CompanionScreen>;
}
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  title: { color: Text.primary, fontSize: 24 }, body: { color: Text.primary, fontSize: 16 }, secondary: { color: Text.secondary, fontSize: 16, lineHeight: 24 },
  section: { gap: 8, marginTop: 24 }, fields: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24 }, country: { width: 120 }, phone: { flex: 1, minWidth: 180 } });
