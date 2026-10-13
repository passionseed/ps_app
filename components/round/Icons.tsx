import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

/** Line pictograms from the v3 mockup (no emoji as icons, DESIGN.md). */
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
  | "back"
  | "link"
  | "camera"
  | "pencil"
  | "alert"
  | "share"
  | "copy"
  | "trash"
  | "send"
  | "search"
  | "compass"
  | "book";

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
    case "back":
      body = <Path d="M15 6l-6 6 6 6" {...common} />;
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
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {body}
    </Svg>
  );
}
