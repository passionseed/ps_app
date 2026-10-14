import React from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Canvas, Violet } from "../../lib/theme";
import { DepthCanvas, type OrbSpec } from "./DepthCanvas";
import { SHIFT_TAB_BAR_HEIGHT, shiftTabBarBottom } from "./ShiftTabBar";
import { ToastHost } from "./Toast";

/**
 * Screen shell (DESIGN.md v4): the layered lavender canvas (washes + soft orbs) behind a 560pt
 * max column (tablets). `dock` renders a bottom-docked area (the Pillow button) above the safe
 * area; content scrolls under a fade. Toasts from `useToast()` show above the dock.
 */
export function RoundShell({
  children,
  dock,
  scroll = true,
  refreshing,
  onRefresh,
  bottomInset = 0,
  keyboard = false,
  orbs = true,
  customOrbs,
  center = false,
  fill = false,
}: {
  children: React.ReactNode;
  dock?: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /**
   * Bottom space for the floating tab bar. Any value > 0 reserves the bar's real footprint
   * (ShiftTabBar geometry, safe area included) so the dock floats 12pt above it.
   */
  bottomInset?: number;
  keyboard?: boolean;
  /** Soft orbs behind the content (default on; turn off for dense lists). */
  orbs?: boolean;
  /** Replace the default orbs (sign-in, landing). */
  customOrbs?: OrbSpec[];
  /** Vertically centre short content (sign-in, empty states). */
  center?: boolean;
  /** Let the column fill the screen height so a child with `marginTop: "auto"` sits at the bottom. */
  fill?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const dockSpace = dock ? 112 : 24;
  // Distance from the screen bottom that content must clear: the floating tab bar's top edge
  // when there is one (bottomInset > 0), else the safe area.
  const reserve = bottomInset > 0 ? shiftTabBarBottom(insets.bottom) + SHIFT_TAB_BAR_HEIGHT : insets.bottom;
  const content = <View style={[styles.column, fill && styles.fill]}>{children}</View>;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        { paddingTop: insets.top + 12, paddingBottom: reserve + dockSpace, paddingHorizontal: 20 },
        center && styles.center,
        fill && styles.fill,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Violet[600]} colors={[Violet[600]]} />
        ) : undefined
      }
    >
      {content}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20 }, center && styles.center]}>{content}</View>
  );
  const inner = (
    <>
      {body}
      {dock ? (
        <View style={[styles.dockWrap, { paddingBottom: reserve + 12 }]}>
          <LinearGradient
            colors={["rgba(247,245,252,0)", "rgba(247,245,252,0.92)", Canvas.bottom]}
            locations={[0, 0.45, 1]}
            style={[StyleSheet.absoluteFill, styles.none]}
          />
          <View style={styles.column}>{dock}</View>
        </View>
      ) : null}
    </>
  );
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <DepthCanvas orbs={orbs} customOrbs={customOrbs} />
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
      <ToastHost bottom={reserve + (dock ? 86 : 16)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Canvas.mid },
  column: { width: "100%", maxWidth: 560, alignSelf: "center", gap: 14 },
  center: { flexGrow: 1, justifyContent: "center" },
  fill: { flexGrow: 1 },
  dockWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 30, pointerEvents: "box-none" },
  none: { pointerEvents: "none" },
});
