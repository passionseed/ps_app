import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { AppText } from "../AppText";
import { TextAction, useCompanionLang } from "./CompanionUI";
import { useAuth } from "../../lib/auth";
import { campImageUrl } from "../../lib/shift";
import { queryKeys } from "../../lib/queryClient";
import { Text } from "../../lib/theme";
import { validHttpLink, type DailyUpdate } from "../../lib/shiftCompanion";

export function DailyPhoto({ path }: { path: string }) {
  const { user } = useAuth();
  const { copy } = useCompanionLang();
  const photo = useQuery({ queryKey: queryKeys.shift.image(user?.id ?? "", path),
    queryFn: () => campImageUrl(path), enabled: !!user, staleTime: 5 * 60_000 });
  return <View>
    {photo.data ? <Image accessibilityLabel={copy.photo} source={{ uri: photo.data }} style={styles.photo} contentFit="contain" /> : null}
    {photo.isError ? <TextAction label={copy.retry} onPress={() => void photo.refetch()} /> : null}
  </View>;
}
export function DailyUpdateDetail({ update }: { update: DailyUpdate }) {
  const { copy } = useCompanionLang();
  return <View style={styles.detail}>
    <AppText style={styles.body}>{update.tried}</AppText>
    {update.learned ? <View style={styles.detail}><AppText variant="bold" style={styles.label}>{copy.learned}</AppText><AppText style={styles.body}>{update.learned}</AppText></View> : null}
    {update.help ? <View style={styles.detail}><AppText variant="bold" style={styles.label}>{copy.help}</AppText><AppText style={styles.body}>{update.help}</AppText></View> : null}
    {update.link && validHttpLink(update.link) ? <TextAction label={update.link} onPress={() => void Linking.openURL(update.link!).catch(() => {})} /> : null}
    {update.image_path ? <DailyPhoto path={update.image_path} /> : null}
  </View>;
}
const styles = StyleSheet.create({ detail: { gap: 8 }, body: { color: Text.primary, fontSize: 16, lineHeight: 26 },
  label: { color: Text.secondary, fontSize: 16 }, photo: { width: "100%", height: 240 } });
