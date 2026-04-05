import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Pressable,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppText } from "../../components/AppText";
import { Space } from "../../lib/theme";
import { readHackathonToken } from "../../lib/hackathon-mode";

const WHITE = "#FFFFFF";
const WHITE70 = "rgba(255,255,255,0.7)";
const WHITE40 = "rgba(255,255,255,0.4)";
const CYAN = "#91C4E3";
const CYAN_DIM = "rgba(145,196,227,0.15)";
const CYAN_FILL = "rgba(145,196,227,0.2)";
const BG = "#010108";
const CARD_BG = "rgba(13,18,25,0.6)";

type MentorProfile = {
  id: string;
  full_name: string;
  profession: string;
  institution: string;
  bio: string;
  photo_url: string | null;
  session_type: "healthcare" | "group";
  is_approved: boolean;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function generateNext14Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    days.push(day);
  }
  return days;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? "AM" : "PM";
    slots.push(`${hour}:00 ${ampm}`);
  }
  return slots;
}

const DATE_OPTIONS = generateNext14Days();
const TIME_OPTIONS = generateTimeSlots();

export default function MentorBookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0]);
  const [selectedTime, setSelectedTime] = useState(TIME_OPTIONS[0]);
  const [duration, setDuration] = useState<30 | 60>(30);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://www.passionseed.org/api/hackathon/mentor/public")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load mentors");
        return res.json();
      })
      .then((data) => {
        setMentors(data.mentors ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Something went wrong");
        setLoading(false);
      });
  }, []);

  function handleToggle(mentorId: string) {
    if (expandedId === mentorId) {
      setExpandedId(null);
    } else {
      setExpandedId(mentorId);
      setSubmitError(null);
      setSuccessId(null);
      setSelectedDate(DATE_OPTIONS[0]);
      setSelectedTime(TIME_OPTIONS[0]);
      setDuration(30);
      setNotes("");
    }
  }

  async function handleBook(mentor: MentorProfile) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await readHackathonToken();
      if (!token) {
        setSubmitError("You are not logged in.");
        setSubmitting(false);
        return;
      }

      // Build ISO datetime from selected date + time labels
      const dateIndex = DATE_OPTIONS.indexOf(selectedDate);
      const timeIndex = TIME_OPTIONS.indexOf(selectedTime);
      const slotDate = new Date();
      slotDate.setDate(slotDate.getDate() + dateIndex);
      slotDate.setHours(8 + timeIndex, 0, 0, 0);

      if (slotDate <= new Date()) {
        setSubmitError("Please select a future time slot.");
        setSubmitting(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let res: Response;
      try {
        res = await fetch("https://www.passionseed.org/api/hackathon/student/book-mentor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mentor_id: mentor.id,
            slot_datetime: slotDate.toISOString(),
            duration_minutes: duration,
            notes: notes.trim() || undefined,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Booking failed");
      }

      setSuccessId(mentor.id);
      setNotes("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Booking failed";
      setSubmitError(message);
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <AppText style={styles.backLabel}>← Back</AppText>
          </Pressable>
          <AppText variant="bold" style={styles.title}>Mentor Booking</AppText>
          <AppText style={styles.subtitle}>Schedule 1:1 help with technical and business mentors.</AppText>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={CYAN} size="large" />
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={styles.center}>
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        )}

        {/* Mentor list */}
        {!loading && !error && mentors.length === 0 && (
          <View style={styles.center}>
            <AppText style={{ color: WHITE40 }}>No mentors available yet.</AppText>
          </View>
        )}

        {!loading && !error && mentors.map((mentor) => {
          const isExpanded = expandedId === mentor.id;
          const isSuccess = successId === mentor.id;

          return (
            <View key={mentor.id} style={styles.card}>
              {/* Card Header */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleToggle(mentor.id)}
                style={styles.cardHeader}
              >
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                  {mentor.photo_url ? (
                    <Image source={{ uri: mentor.photo_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <AppText variant="bold" style={styles.avatarInitials}>
                        {getInitials(mentor.full_name)}
                      </AppText>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <AppText variant="bold" style={styles.mentorName}>{mentor.full_name}</AppText>
                  <AppText style={styles.mentorProfession}>{mentor.profession}</AppText>
                  {!!mentor.institution && (
                    <AppText style={styles.mentorInstitution}>{mentor.institution}</AppText>
                  )}
                </View>

                {/* Badge */}
                <View style={[
                  styles.badge,
                  mentor.session_type === "group" ? styles.badgeGroup : styles.badgeHealthcare,
                ]}>
                  <AppText style={styles.badgeText}>
                    {mentor.session_type === "group" ? "Group" : "1:1"}
                  </AppText>
                </View>
              </TouchableOpacity>

              {/* Expanded booking form */}
              {isExpanded && (
                <View style={styles.formWrap}>
                  {/* Bio */}
                  {!!mentor.bio && (
                    <AppText style={styles.bioText}>{mentor.bio}</AppText>
                  )}

                  {isSuccess ? (
                    <View style={styles.successBox}>
                      <AppText variant="bold" style={styles.successText}>
                        Booking request sent!
                      </AppText>
                      <AppText style={styles.successSub}>
                        The mentor will confirm your session.
                      </AppText>
                    </View>
                  ) : (
                    <>
                      {/* Date picker */}
                      <AppText style={styles.fieldLabel}>Select Date</AppText>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.pillScroll}
                        contentContainerStyle={styles.pillRow}
                      >
                        {DATE_OPTIONS.map((d) => (
                          <TouchableOpacity
                            key={d}
                            onPress={() => setSelectedDate(d)}
                            style={[
                              styles.pill,
                              selectedDate === d && styles.pillSelected,
                            ]}
                          >
                            <AppText style={[
                              styles.pillText,
                              selectedDate === d && styles.pillTextSelected,
                            ]}>
                              {d}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      {/* Time picker */}
                      <AppText style={styles.fieldLabel}>Select Time</AppText>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.pillScroll}
                        contentContainerStyle={styles.pillRow}
                      >
                        {TIME_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            onPress={() => setSelectedTime(t)}
                            style={[
                              styles.pill,
                              selectedTime === t && styles.pillSelected,
                            ]}
                          >
                            <AppText style={[
                              styles.pillText,
                              selectedTime === t && styles.pillTextSelected,
                            ]}>
                              {t}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      {/* Duration */}
                      <AppText style={styles.fieldLabel}>Duration</AppText>
                      <View style={styles.durationRow}>
                        {([30, 60] as const).map((d) => (
                          <TouchableOpacity
                            key={d}
                            onPress={() => setDuration(d)}
                            style={[
                              styles.durationBtn,
                              duration === d && styles.durationBtnSelected,
                            ]}
                          >
                            <AppText style={[
                              styles.durationText,
                              duration === d && styles.durationTextSelected,
                            ]}>
                              {d} min
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Notes */}
                      <AppText style={styles.fieldLabel}>Notes (optional)</AppText>
                      <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="What would you like help with?"
                        placeholderTextColor={WHITE40}
                        style={styles.notesInput}
                        multiline
                        numberOfLines={3}
                      />

                      {/* Submit error */}
                      {!!submitError && (
                        <AppText style={styles.errorText}>{submitError}</AppText>
                      )}

                      {/* Book button */}
                      <TouchableOpacity
                        onPress={() => handleBook(mentor)}
                        disabled={submitting}
                        style={[styles.bookBtn, submitting && styles.bookBtnDisabled]}
                      >
                        {submitting ? (
                          <ActivityIndicator color={BG} size="small" />
                        ) : (
                          <AppText variant="bold" style={styles.bookBtnText}>Book Session</AppText>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: Space.xl,
    paddingBottom: 120,
    gap: Space.lg,
  },
  header: {
    marginBottom: Space.xs,
  },
  backBtn: {
    marginBottom: Space.md,
  },
  backLabel: {
    color: CYAN,
    fontSize: 14,
  },
  title: {
    fontSize: 26,
    color: WHITE,
    marginBottom: Space.xs,
  },
  subtitle: {
    fontSize: 14,
    color: WHITE70,
  },
  center: {
    alignItems: "center",
    paddingVertical: Space["2xl"],
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CYAN_DIM,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Space.lg,
    gap: Space.md,
  },
  avatarWrap: {
    width: 52,
    height: 52,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: CYAN_DIM,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(145,196,227,0.15)",
    borderWidth: 1.5,
    borderColor: CYAN_DIM,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 18,
    color: CYAN,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  mentorName: {
    fontSize: 16,
    color: WHITE,
  },
  mentorProfession: {
    fontSize: 13,
    color: WHITE70,
  },
  mentorInstitution: {
    fontSize: 12,
    color: WHITE40,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeHealthcare: {
    backgroundColor: "rgba(59,130,246,0.25)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
  },
  badgeGroup: {
    backgroundColor: "rgba(139,92,246,0.25)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.4)",
  },
  badgeText: {
    fontSize: 11,
    color: WHITE70,
    fontFamily: "BaiJamjuree_500Medium",
  },

  formWrap: {
    paddingHorizontal: Space.lg,
    paddingBottom: Space.lg,
    borderTopWidth: 1,
    borderTopColor: CYAN_DIM,
    paddingTop: Space.md,
    gap: Space.sm,
  },
  bioText: {
    fontSize: 13,
    color: WHITE70,
    lineHeight: 19,
    marginBottom: Space.xs,
  },
  fieldLabel: {
    fontSize: 12,
    color: CYAN,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: Space.xs,
    fontFamily: "BaiJamjuree_500Medium",
  },
  pillScroll: {
    flexGrow: 0,
  },
  pillRow: {
    flexDirection: "row",
    gap: Space.xs,
    paddingVertical: Space.xs,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CYAN,
    backgroundColor: "transparent",
  },
  pillSelected: {
    backgroundColor: CYAN_FILL,
  },
  pillText: {
    fontSize: 12,
    color: WHITE70,
  },
  pillTextSelected: {
    color: WHITE,
  },
  durationRow: {
    flexDirection: "row",
    gap: Space.sm,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CYAN,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  durationBtnSelected: {
    backgroundColor: CYAN_FILL,
  },
  durationText: {
    fontSize: 14,
    color: WHITE70,
  },
  durationTextSelected: {
    color: WHITE,
  },
  notesInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    borderRadius: 10,
    color: WHITE,
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 14,
    padding: Space.md,
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
  },
  bookBtn: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Space.xs,
  },
  bookBtnDisabled: {
    opacity: 0.6,
  },
  bookBtnText: {
    color: BG,
    fontSize: 15,
  },
  successBox: {
    backgroundColor: "rgba(145,196,227,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.3)",
    padding: Space.lg,
    alignItems: "center",
    gap: Space.xs,
    marginTop: Space.sm,
  },
  successText: {
    fontSize: 16,
    color: CYAN,
  },
  successSub: {
    fontSize: 13,
    color: WHITE70,
  },
});
