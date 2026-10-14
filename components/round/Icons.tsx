import React from "react";
import { Platform } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

/** Line pictograms (no emoji as icons, DESIGN.md). `google` and `apple` are filled brand marks. */
export type IconName =
  | "house"
  | "people"
  | "person"
  | "check"
  | "mic"
  | "stop"
  | "play"
  | "pause"
  | "close"
  | "heart"
  | "plus"
  | "chevron"
  | "chevronDown"
  | "back"
  | "arrow"
  | "link"
  | "camera"
  | "pencil"
  | "alert"
  | "info"
  | "share"
  | "copy"
  | "trash"
  | "send"
  | "search"
  | "compass"
  | "book"
  | "calendar"
  | "video"
  | "chat"
  | "mail"
  | "globe"
  | "bell"
  | "shield"
  | "logout"
  | "award"
  | "external"
  | "sparkle"
  | "google"
  | "apple";

// react-native-svg forwards props to the DOM on web, where the native a11y props are unknown
// (React warned "does not recognize the `importantForAccessibility` prop" on every screen).
// On web an un-positioned <svg> paints under absolutely positioned siblings (e.g. a gradient
// face drawn before the icon); `position: relative` keeps DOM order = paint order, as on native.
const styles = { svg: { position: "relative" as const } };

const HIDDEN =
  Platform.OS === "web"
    ? ({ "aria-hidden": true } as Record<string, unknown>)
    : ({ accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as Record<string, unknown>);

export function Icon({
  name,
  size = 24,
  color = "#14112A",
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const common = { stroke: color, strokeWidth, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let body: React.ReactNode = null;
  switch (name) {
    case "house":
      body = (
        <>
          <Path d="M4 20V10l8-6 8 6v10" {...common} />
          <Path d="M10 20v-6h4v6" {...common} />
        </>
      );
      break;
    case "people":
      body = (
        <>
          <Circle cx="9" cy="9" r="3.2" {...common} />
          <Circle cx="16.5" cy="10" r="2.6" {...common} />
          <Path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 19a4 4 0 0 1 7 0" {...common} />
        </>
      );
      break;
    case "person":
      body = (
        <>
          <Circle cx="12" cy="8" r="4" {...common} />
          <Path d="M4 21a8 8 0 0 1 16 0" {...common} />
        </>
      );
      break;
    case "check":
      body = <Path d="M5 12l5 5 9-10" {...common} />;
      break;
    case "mic":
      body = (
        <>
          <Rect x="9" y="3" width="6" height="11" rx="3" {...common} />
          <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...common} />
        </>
      );
      break;
    case "stop":
      body = <Rect x="6" y="6" width="12" height="12" rx="2" {...common} />;
      break;
    case "play":
      body = <Path d="M7 4l13 8-13 8z" {...common} />;
      break;
    case "pause":
      body = <Path d="M8 5v14M16 5v14" {...common} />;
      break;
    case "close":
      body = <Path d="M6 6l12 12M18 6L6 18" {...common} />;
      break;
    case "heart":
      body = <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" {...common} />;
      break;
    case "plus":
      body = <Path d="M12 5v14M5 12h14" {...common} />;
      break;
    case "chevron":
      body = <Path d="M9 6l6 6-6 6" {...common} />;
      break;
    case "chevronDown":
      body = <Path d="M6 9l6 6 6-6" {...common} />;
      break;
    case "back":
      body = <Path d="M15 6l-6 6 6 6" {...common} />;
      break;
    case "arrow":
      body = <Path d="M5 12h14M13 6l6 6-6 6" {...common} />;
      break;
    case "link":
      body = <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" {...common} />;
      break;
    case "camera":
      body = (
        <>
          <Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...common} />
          <Circle cx="12" cy="13" r="3.5" {...common} />
        </>
      );
      break;
    case "pencil":
      body = <Path d="M4 20l4-1 11-11-3-3L5 16z" {...common} />;
      break;
    case "alert":
      body = (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M12 7v6M12 16.5v.5" {...common} />
        </>
      );
      break;
    case "info":
      body = (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M12 11v6M12 7.5v.5" {...common} />
        </>
      );
      break;
    case "share":
      body = <Path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" {...common} />;
      break;
    case "copy":
      body = (
        <>
          <Rect x="8" y="8" width="12" height="12" rx="2" {...common} />
          <Path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" {...common} />
        </>
      );
      break;
    case "trash":
      body = <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...common} />;
      break;
    case "search":
      body = (
        <>
          <Circle cx="11" cy="11" r="6.5" {...common} />
          <Path d="M16 16l4.5 4.5" {...common} />
        </>
      );
      break;
    case "compass":
      body = (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5z" {...common} />
        </>
      );
      break;
    case "book":
      body = <Path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5" {...common} />;
      break;
    case "send":
      body = <Path d="M4 12l16-8-6 16-2-6z" {...common} />;
      break;
    case "calendar":
      body = (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="3" {...common} />
          <Path d="M3 10h18M8 3v4M16 3v4" {...common} />
        </>
      );
      break;
    case "video":
      body = (
        <>
          <Path d="M15 10l5-3v10l-5-3z" {...common} />
          <Rect x="3" y="6" width="12" height="12" rx="3" {...common} />
        </>
      );
      break;
    case "chat":
      body = <Path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z" {...common} />;
      break;
    case "mail":
      body = (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="3" {...common} />
          <Path d="M4 7l8 6 8-6" {...common} />
        </>
      );
      break;
    case "globe":
      body = (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" {...common} />
        </>
      );
      break;
    case "bell":
      body = <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" {...common} />;
      break;
    case "shield":
      body = <Path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6zM9 12l2 2 4-4" {...common} />;
      break;
    case "logout":
      body = <Path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10" {...common} />;
      break;
    case "award":
      body = (
        <>
          <Circle cx="12" cy="9" r="5.5" {...common} />
          <Path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5" {...common} />
        </>
      );
      break;
    case "external":
      body = <Path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" {...common} />;
      break;
    case "sparkle":
      body = <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" {...common} />;
      break;
    case "google":
      body = (
        <>
          <Path fill={color} d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
          <Path fill={color} d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
          <Path fill={color} d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" />
          <Path fill={color} d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" />
        </>
      );
      break;
    case "apple":
      body = (
        <Path
          fill={color}
          d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.6-4zM14 5.4c.7-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.3z"
        />
      );
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={styles.svg} {...HIDDEN}>
      {body}
    </Svg>
  );
}
