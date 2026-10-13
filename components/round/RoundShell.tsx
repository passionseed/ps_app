import React from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Surface } from "../../lib/theme";

/**
 * Canvas + top-right wash and a 560pt max column (tablets). `dock` renders a bottom-docked
 * area (the Pillow button) above the safe area; content scrolls under a fade.
 */
export function RoundShell({
  children,
  dock,
  scroll = true,
  refreshing,
  onRefresh,
  bottomInset = 0,
  keyboard = false,
}: {
  children: React.ReactNode;
  dock?: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom padding (e.g. the floating tab bar). */
  bottomInset?: number;
  keyboard?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const dockSpace = dock ? 120 : 24;
  const content = (
    <View style={styles.column}>{children}</View>
  );
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + bottomInset + dockSpace, paddingHorizontal: 20 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20 }}>{content}</View>
  );
  const inner = (
    <>
      {body}
      {dock ? (
        <View pointerEvents="box-none" style={[styles.dockWrap, { paddingBottom: insets.bottom + bottomInset + 12 }]}>
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(244,242,251,0)", Surface.canvas]}
            locations={[0, 0.55]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.column}>{dock}</View>
        </View>
      ) : null}
    </>
  );
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        pointerEvents="none"
        colors={[Surface.wash, "rgba(236,230,255,0)"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.45 }}
        style={StyleSheet.absoluteFill}
      />
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Surface.canvas },
  column: { width: "100%", maxWidth: 560, alignSelf: "center", gap: 14 },
  dockWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 28 },
});
