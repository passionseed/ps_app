import React, { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { SoftButton } from "../primitives";
import { useToast } from "../Toast";

/**
 * Receipt action "คัดลอกไปโพสต์ใน #progress" (scale spec D7): copies the formatted post to the
 * clipboard and confirms with a toast. The app never posts to Discord itself.
 */
export function ProgressCopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const copy = async () => {
    if (!text || busy) return;
    setBusy(true);
    try {
      await Clipboard.setStringAsync(text);
      toast.show(copiedLabel);
    } catch {
      // clipboard unavailable: nothing to undo
    } finally {
      setBusy(false);
    }
  };
  return <SoftButton label={label} icon="copy" onPress={() => void copy()} />;
}
