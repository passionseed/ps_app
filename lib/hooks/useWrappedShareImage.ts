import { useRef, useState, useCallback } from "react";
import type { View } from "react-native";
import ViewShot from "react-native-view-shot";

export type ViewShotRef = View & {
  capture: () => Promise<string>;
};

export function useWrappedShareImage() {
  const viewShotRef = useRef<ViewShotRef>(null);
  const [capturing, setCapturing] = useState(false);

  const capture = useCallback(async (): Promise<string | null> => {
    if (!viewShotRef.current?.capture) {
      console.warn("[useWrappedShareImage] ViewShot ref not ready");
      return null;
    }
    setCapturing(true);
    try {
      const uri = await viewShotRef.current.capture();
      return uri;
    } catch (e) {
      console.error("[useWrappedShareImage] capture failed:", e);
      return null;
    } finally {
      setCapturing(false);
    }
  }, []);

  return { viewShotRef, capture, capturing };
}

export { ViewShot };
