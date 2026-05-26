import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import type { ViewProps } from "react-native";

export type ViewShotRef = {
  capture: () => Promise<string>;
};

type ViewShotProps = ViewProps & {
  options?: {
    format?: "png" | "jpg" | "webm" | "raw";
    quality?: number;
    result?: "tmpfile" | "base64" | "data-uri" | "zip-base64";
  };
};

type NativeViewShotComponent = React.ComponentType<
  ViewShotProps & React.RefAttributes<ViewShotRef>
>;

let nativeViewShot: NativeViewShotComponent | null | undefined;
let didWarnMissingViewShot = false;

function getNativeViewShot(): NativeViewShotComponent | null {
  if (nativeViewShot !== undefined) {
    return nativeViewShot;
  }

  try {
    nativeViewShot =
      require("react-native-view-shot").default as NativeViewShotComponent;
  } catch (e) {
    nativeViewShot = null;
    if (!didWarnMissingViewShot) {
      didWarnMissingViewShot = true;
      console.warn(
        "[useWrappedShareImage] react-native-view-shot is not available in this binary; image sharing is disabled.",
        e,
      );
    }
  }

  return nativeViewShot;
}

const FallbackViewShot = React.forwardRef<ViewShotRef, ViewShotProps>(
  function FallbackViewShot({ children, options: _options, ...props }, ref) {
    useImperativeHandle(
      ref,
      () => ({
        capture: async () => {
          throw new Error(
            "react-native-view-shot is not available in this binary.",
          );
        },
      }),
      [],
    );

    return React.createElement(View, props, children);
  },
);

export const ViewShot = React.forwardRef<ViewShotRef, ViewShotProps>(
  function SafeViewShot(props, ref) {
    const NativeViewShot = getNativeViewShot();
    const Component = NativeViewShot ?? FallbackViewShot;
    return React.createElement(Component, { ...props, ref });
  },
);

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
