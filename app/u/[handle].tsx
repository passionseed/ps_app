// app/u/[handle].tsx
// Public profile viewer — renders ONLY published fields.
// Security: query filters is_public=true server-side (RLS enforces too).
// Does NOT expose user_id, email, raw scores.

import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppText as Text } from '../../components/AppText';
import { supabase } from '../../lib/supabase';
import { isSectionPublished, buildBecomingLine } from '../../lib/publicProfile';
import type { PublicProfile } from '../../types/publicProfile';
import { logPublicProfileOpened } from '../../lib/eventLogger';

export default function PublicProfileViewer() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!handle) return;
    logPublicProfileOpened(handle);
    supabase
      .from('public_profiles')
      .select('*')
      .eq('handle', handle)
      .eq('is_public', true)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) {
          setError(true);
          return;
        }
        setProfile((data as PublicProfile | null) ?? null);
      });
  }, [handle]);

  if (profile === undefined && !error) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error || profile === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Profile not found</Text>
      </View>
    );
  }

  const showClass = isSectionPublished(profile, 'class') && profile.class_slug;
  const showGrowth = isSectionPublished(profile, 'growth');

  const becomingLine = showClass ? buildBecomingLine(profile) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {showClass && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Identity</Text>
          <Text style={styles.classText}>
            {profile.class_slug!.charAt(0).toUpperCase() + profile.class_slug!.slice(1)}
          </Text>
          {becomingLine && <Text style={styles.becomingLine}>{becomingLine}</Text>}
        </View>
      )}

      {showGrowth && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Growth</Text>
          <Text style={styles.growthText}>
            {profile.growth_count} {profile.growth_count === 1 ? 'seed' : 'seeds'} deep
          </Text>
        </View>
      )}

      {!showClass && !showGrowth && (
        <View style={styles.center}>
          <Text style={styles.notFound}>Nothing published yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 24,
    gap: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    fontFamily: 'LibreFranklin_400Regular',
  },
  notFound: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'LibreFranklin_400Regular',
  },
  section: {
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    color: '#9D81AC',
    fontSize: 12,
    fontFamily: 'LibreFranklin_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  classText: {
    color: '#03050a',
    fontSize: 26,
    fontFamily: 'LibreFranklin_700Bold',
  },
  becomingLine: {
    color: '#495057',
    fontSize: 15,
    fontFamily: 'LibreFranklin_400Regular',
    lineHeight: 22,
  },
  growthText: {
    color: '#03050a',
    fontSize: 20,
    fontFamily: 'LibreFranklin_600SemiBold',
  },
});
