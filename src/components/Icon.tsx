import React from "react";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { colors } from "../design-system/theme";

export type IconName =
  | "home"
  | "play"
  | "keyboard"
  | "chart"
  | "settings"
  | "back"
  | "arrow"
  | "book"
  | "repeat"
  | "speed"
  | "rain";
export function Icon({
  name,
  size = 24,
  color = colors.navy,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {name === "home" && <Path d="m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7" />}
      {name === "play" && <Path d="m8 4 12 8-12 8V4Z" />}
      {name === "keyboard" && (
        <>
          <Rect x={2} y={5} width={20} height={14} rx={3} />
          <Path d="M6 9h.1M10 9h.1M14 9h.1M18 9h.1M6 12h.1M10 12h.1M14 12h.1M18 12h.1M7 15h10" />
        </>
      )}
      {name === "chart" && (
        <>
          <Path d="M4 4v16h17M8 15v-4m5 4V7m5 8v-5" />
        </>
      )}
      {name === "settings" && (
        <>
          <Path d="m10 3-.7 2.2-2 .9-2.2-.6-2 3.5 1.6 1.6v2.8L3.1 15l2 3.5 2.2-.6 2 .9L10 21h4l.7-2.2 2-.9 2.2.6 2-3.5-1.6-1.6v-2.8L20.9 9l-2-3.5-2.2.6-2-.9L14 3h-4Z" />
          <Circle cx={12} cy={12} r={3} />
        </>
      )}
      {name === "back" && <Path d="m14 5-7 7 7 7" />}
      {name === "arrow" && <Path d="M5 12h14m-6-6 6 6-6 6" />}
      {name === "book" && (
        <Path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2V4Z" />
      )}
      {name === "repeat" && <Path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />}
      {name === "speed" && (
        <>
          <Path d="M4 18a9 9 0 1 1 16 0M12 13l4-5" />
          <Circle cx={12} cy={14} r={2} />
        </>
      )}
      {name === "rain" && <Path d="M5 4v5m7-6v9m7-7v4M5 14v5m7-2v4m7-7v6" />}
    </Svg>
  );
}
