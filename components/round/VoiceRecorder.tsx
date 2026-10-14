import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { Ink, Status, Violet } from "../../lib/theme";
import { formatDuration } from "../../lib/round/time";
import { MAX_AUDIO_MS } from "../../lib/round/media";
import { Key } from "./Key";
import { RText } from "./RText";

/** AAC in m4a, mono, 64 kbps (spec 2.5). */
const OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
};

function bars(seed: string, levels: number[], count = 28): number[] {
  if (levels.length >= count) {
    const step = levels.length / count;
    return Array.from({ length: count }, (_, i) => levels[Math.floor(i * step)]);
  }
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }, (_, i) => 0.25 + (((h >> (i % 24)) & 7) / 7) * 0.7);
}

/**
 * Record (max 3:00, visible timer) and play back with a waveform (spec 5.6).
 * Labels come from the caller so this stays props-only (X15).
 */
export function VoiceRecorder({
  audio,
  onRecorded,
  onRemove,
  labels,
  disabled,
}: {
  audio: { local_uri: string; duration_ms: number } | null;
  onRecorded: (uri: string, durationMs: number) => void;
  onRemove: () => void;
  labels: { record: string; recording: (time: string) => string; stop: string; play: string; pause: string; remove: string; permission: string };
  disabled?: boolean;
}) {
  const recorder = useAudioRecorder(OPTIONS);
  const state = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(audio?.local_uri ?? null);
  const playback = useAudioPlayerStatus(player);
  const [denied, setDenied] = useState(false);
  const levels = useRef<number[]>([]);
  const [recordedLevels, setRecordedLevels] = useState<number[]>([]);
  const stopping = useRef(false);

  useEffect(() => {
    if (state.isRecording && typeof state.metering === "number") {
      levels.current.push(Math.max(0.15, Math.min(1, (state.metering + 60) / 60)));
    }
  }, [state.durationMillis, state.isRecording, state.metering]);

  const stop = async () => {
    if (stopping.current) return;
    stopping.current = true;
    try {
      const duration = state.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      setRecordedLevels([...levels.current]);
      if (recorder.uri) onRecorded(recorder.uri, Math.min(duration, MAX_AUDIO_MS));
    } finally {
      stopping.current = false;
    }
  };

  useEffect(() => {
    if (state.isRecording && state.durationMillis >= MAX_AUDIO_MS) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.durationMillis, state.isRecording]);

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setDenied(true);
      return;
    }
    setDenied(false);
    levels.current = [];
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const waveform = useMemo(() => bars(audio?.local_uri ?? "", recordedLevels), [audio?.local_uri, recordedLevels]);

  if (state.isRecording) {
    return (
      <View style={styles.card}>
        <Key round size="lg" tone="danger" icon="stop" label={labels.stop} onPress={() => void stop()} />
        <RText variant="label" latin={false} accessibilityLiveRegion="polite">
          {labels.recording(formatDuration(state.durationMillis))}
        </RText>
      </View>
    );
  }

  if (audio) {
    const playing = playback.playing;
    return (
      <View style={[styles.card, styles.playRow]}>
        <Key
          round
          icon={playing ? "pause" : "play"}
          label={playing ? labels.pause : labels.play}
          haptic="select"
          onPress={() => {
            if (playing) player.pause();
            else {
              if (playback.didJustFinish || (playback.duration && playback.currentTime >= playback.duration)) void player.seekTo(0);
              player.play();
            }
          }}
        />
        <View style={styles.wave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {waveform.map((h, i) => {
            const progress = playback.duration ? playback.currentTime / playback.duration : 0;
            const played = i / waveform.length < progress;
            return <View key={i} style={[styles.bar, { height: `${Math.round(h * 100)}%`, backgroundColor: played ? Violet[600] : Violet[100] }]} />;
          })}
        </View>
        <RText variant="meta" latin>
          {formatDuration(audio.duration_ms)}
        </RText>
        <Key round icon="trash" label={labels.remove} onPress={onRemove} disabled={disabled} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Key round size="lg" tone="shift" icon="mic" label={labels.record} disabled={disabled} onPress={() => void start()} />
      <RText variant="label" color={Violet[700]}>
        {labels.record}
      </RText>
      {denied ? (
        <RText variant="small" color={Status.error}>
          {labels.permission}
        </RText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    gap: 10,
    shadowColor: Ink.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  playRow: { flexDirection: "row", gap: 10 },
  wave: { flex: 1, height: 36, flexDirection: "row", alignItems: "center", gap: 2 },
  bar: { flex: 1, borderRadius: 2, minHeight: 4 },
});
