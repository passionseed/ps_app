// components/GrowthBadge.tsx
//
// Shows the server-derived growth count (completed path explorations).
// Receives null to indicate an error state (hides silently — do not crash).
// count=0 is a valid value: show "0 seeds deep — start exploring".

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from './AppText';

interface Props {
  /** null = hide silently (error loading growth). 0+ = valid counts. */
  count: number | null;
}

export function GrowthBadge({ count }: Props) {
  if (count === null) return null;
  const label =
    count === 0
      ? '0 seeds deep — start exploring'
      : `${count} ${count === 1 ? 'seed' : 'seeds'} deep`;
  return (
    <View style={styles.container} accessible accessibilityLabel={label}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(157,129,172,0.12)',
    borderRadius: 20,
    marginVertical: 8,
  },
  text: {
    color: '#9D81AC',
    fontFamily: 'LibreFranklin_400Regular',
    fontSize: 13,
  },
});
