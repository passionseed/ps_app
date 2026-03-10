import React from "react";
import Svg, { Path, Text, SvgProps } from "react-native-svg";

interface FireStreakIconProps extends SvgProps {
  count: number;
}

export const FireStreakIcon = ({ count, ...props }: FireStreakIconProps) => (
  <Svg width={64} height={64} viewBox="0 0 64 64" fill="none" {...props}>
    {/* Outer Glow / Bubble */}
    <Path
      d="M32 60C46.3594 60 58 48.3594 58 34C58 24 50 16 46 8C46 8 44 20 38 22C32 24 28 14 28 14C28 14 26 24 18 28C14 30 6 38 6 46C6 54.2843 12.7157 60 21 60C24 60 28 60 32 60Z"
      fill="#FF4B4B"
    />
    {/* Inner bright fire component */}
    <Path
      d="M32 54C41 54 48 47 48 38C48 31 43 25 39 20C39 20 38 28 34 29C30 30 27 24 27 24C27 24 26 31 21 33C18 34 14 39 14 44C14 49 19 54 26 54C28 54 30 54 32 54Z"
      fill="#FFB614"
    />

    <Text
      x="32"
      y="44"
      fill="#FFFFFF"
      fontSize="16"
      fontWeight="bold"
      fontFamily="System"
      textAnchor="middle"
      alignmentBaseline="middle"
    >
      {count}
    </Text>
  </Svg>
);
