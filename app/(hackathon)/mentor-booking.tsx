import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Pressable,
  Modal,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppText } from "../../components/AppText";
import { Space } from "../../lib/theme";
import { readHackathonToken } from "../../lib/hackathon-mode";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - Space.xl * 2 - Space.md) / 2;
const PHOTO_H = CARD_W * 1.15;

const WHITE = "#FFFFFF";
const WHITE70 = "rgba(255,255,255,0.7)";
const WHITE40 = "rgba(255,255,255,0.4)";
const CYAN = "#91C4E3";
const CYAN_DIM = "rgba(145,196,227,0.15)";
const CYAN_FILL = "rgba(145,196,227,0.2)";
const BG = "#010108";
const CARD_BG = "#0d1219";
const MODAL_BG = "#070c12";

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
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}


// ── Mentor card (grid item) ─────────────────────────────────────────────────

function MentorCard({ mentor, onPress }: { mentor: MentorProfile; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      {/* Photo */}
      <View style={styles.photoWrap}>
        {mentor.photo_url ? (
          <Image source={{ uri: mentor.photo_url }} style={styles.photo} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <AppText variant="bold" style={styles.initials}>{getInitials(mentor.full_name)}</AppText>
          </View>
        )}
        {/* Session type badge */}
        <View style={[styles.typeBadge, mentor.session_type === "group" ? styles.typeBadgeGroup : styles.typeBadgeHealthcare]}>
          <AppText style={styles.typeBadgeText}>{mentor.session_type === "group" ? "Group" : "Healthcare"}</AppText>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <AppText variant="bold" style={styles.cardName} numberOfLines={1}>{mentor.full_name}</AppText>
        <AppText style={styles.cardProfession} numberOfLines={1}>{mentor.profession}</AppText>
        {!!mentor.institution && (
          <AppText style={styles.cardInstitution} numberOfLines={1}>{mentor.institution}</AppText>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Fallback: generate all hourly slots 8am–8pm for the next 14 days
function generateAllSlots(): string[] {
  const slots: string[] = [];
  const now = new Date();
  for (let day = 0; day < 14; day++) {
    for (let hour = 8; hour <= 20; hour++) {
      const d = new Date(now);
      d.setDate(now.getDate() + day);
      d.setHours(hour, 0, 0, 0);
      if (d.getTime() > now.getTime() + 30 * 60 * 1000) {
        slots.push(d.toISOString());
      }
    }
  }
  return slots;
}

// ── Booking modal ───────────────────────────────────────────────────────────

// A slot returned from the API: ISO string datetime
type AvailableSlot = string;

// Group slots by date label
function groupSlotsByDate(slots: AvailableSlot[]): Map<string, AvailableSlot[]> {
  const map = new Map<string, AvailableSlot[]>();
  for (const iso of slots) {
    const d = new Date(iso);
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(iso);
  }
  return map;
}

function formatSlotTime(iso: string, durationMinutes: number): { start: string; end: string } {
  const d = new Date(iso);
  const endD = new Date(d.getTime() + durationMinutes * 60 * 1000);
  const fmt = (dt: Date) => dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { start: fmt(d), end: fmt(endD) };
}

function BookingModal({
  mentor,
  onClose,
}: {
  mentor: MentorProfile;
  onClose: () => void;
}) {
  const [duration, setDuration] = useState<30 | 60>(30);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available slots whenever duration changes
  useEffect(() => {
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedDate(null);
    setSelectedSlot(null);

    const controller = new AbortController();
    fetch(
      `https://www.passionseed.org/api/hackathon/student/mentor-slots?mentor_id=${mentor.id}&duration=${duration}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        // If endpoint isn't deployed yet, fall back to showing all slots
        if (res.status === 404) return { slots: null };
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
        return data;
      })
      .then((data) => {
        // null slots = endpoint not available, generate all slots for next 14 days
        const slots: AvailableSlot[] = data.slots ?? generateAllSlots();
        setAvailableSlots(slots);
        // Auto-select first available date
        if (slots.length > 0) {
          const firstDate = new Date(slots[0]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          setSelectedDate(firstDate);
        }
        setSlotsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Could not load availability";
        setSlotsError(msg);
        setSlotsLoading(false);
      });

    return () => controller.abort();
  }, [mentor.id, duration]);

  const slotsByDate = groupSlotsByDate(availableSlots);
  const dateOptions = Array.from(slotsByDate.keys());
  const timeSlotsForDate = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];

  async function handleBook() {
    if (!selectedSlot) { setError("Please select a time slot."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const token = await readHackathonToken();
      if (!token) { setError("You are not logged in."); setSubmitting(false); return; }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let res: Response;
      try {
        res = await fetch("https://www.passionseed.org/api/hackathon/student/book-mentor", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            mentor_id: mentor.id,
            slot_datetime: selectedSlot,
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
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setSubmitting(false);
    }
  }

  return (
    <Modal animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modal.scrollContent}>

            {/* Photo banner */}
            <View style={modal.photoBanner}>
              {mentor.photo_url ? (
                <Image source={{ uri: mentor.photo_url }} style={modal.bannerImg} contentFit="cover" transition={200} />
              ) : (
                <View style={[modal.bannerImg, modal.bannerFallback]}>
                  <AppText variant="bold" style={modal.bannerInitials}>{getInitials(mentor.full_name)}</AppText>
                </View>
              )}
              {/* Close btn */}
              <Pressable onPress={onClose} style={modal.closeBtn} hitSlop={12}>
                <AppText style={modal.closeBtnText}>✕</AppText>
              </Pressable>
            </View>

            {/* Name + bio */}
            <View style={modal.infoSection}>
              <AppText variant="bold" style={modal.name}>{mentor.full_name}</AppText>
              {!!mentor.bio && (
                <AppText style={modal.bio}>{mentor.bio}</AppText>
              )}

              {/* Institution pill */}
              {!!mentor.institution && (
                <View style={modal.institutionRow}>
                  <View style={modal.institutionPill}>
                    <AppText style={modal.institutionText}>{mentor.institution}</AppText>
                  </View>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={modal.divider} />

            {success ? (
              <View style={modal.successBox}>
                <AppText variant="bold" style={modal.successTitle}>Booking request sent!</AppText>
                <AppText style={modal.successSub}>The mentor will confirm your session shortly.</AppText>
                <TouchableOpacity style={modal.doneBtn} onPress={onClose}>
                  <AppText variant="bold" style={modal.doneBtnText}>Done</AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={modal.formSection}>
                {/* Duration — pick first so slots update */}
                <AppText style={modal.fieldLabel}>Duration</AppText>
                <View style={modal.durationRow}>
                  {([30, 60] as const).map((d) => (
                    <TouchableOpacity key={d} onPress={() => setDuration(d)}
                      style={[modal.durationBtn, duration === d && modal.durationBtnSelected]}>
                      <AppText style={[modal.durationText, duration === d && modal.durationTextSelected]}>{d} min</AppText>
                    </TouchableOpacity>
                  ))}
                </View>

                {slotsLoading ? (
                  <View style={modal.slotsLoadingBox}>
                    <ActivityIndicator color={CYAN} />
                    <AppText style={modal.slotsLoadingText}>Loading availability…</AppText>
                  </View>
                ) : slotsError ? (
                  <AppText style={modal.errorText}>{slotsError}</AppText>
                ) : availableSlots.length === 0 ? (
                  <View style={modal.noSlotsBox}>
                    <AppText style={modal.noSlotsText}>No available slots in the next 14 days.</AppText>
                  </View>
                ) : (
                  <>
                    {/* Date */}
                    <AppText style={modal.fieldLabel}>Select Date</AppText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modal.pillScroll} contentContainerStyle={modal.pillRow}>
                      {dateOptions.map((d) => (
                        <TouchableOpacity key={d} onPress={() => { setSelectedDate(d); setSelectedSlot(null); }}
                          style={[modal.pill, selectedDate === d && modal.pillSelected]}>
                          <AppText style={[modal.pillText, selectedDate === d && modal.pillTextSelected]}>{d}</AppText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Time */}
                    <AppText style={modal.fieldLabel}>Select Time</AppText>
                    <View style={modal.timeList}>
                      {timeSlotsForDate.map((iso) => {
                        const isSelected = selectedSlot === iso;
                        const { start, end } = formatSlotTime(iso, duration);
                        return (
                          <TouchableOpacity key={iso} onPress={() => setSelectedSlot(iso)}
                            style={[modal.timeRow, isSelected && modal.timeRowSelected]}>
                            <View style={[modal.timeIconWrap, isSelected && modal.timeIconWrapSelected]}>
                              <AppText style={modal.timeIcon}>⏱</AppText>
                            </View>
                            <AppText style={[modal.timeRangeText, isSelected && modal.timeRangeTextSelected]}>
                              {start} – {end}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Notes */}
                <AppText style={modal.fieldLabel}>Notes (optional)</AppText>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What would you like help with?"
                  placeholderTextColor={WHITE40}
                  style={modal.notesInput}
                  multiline
                  numberOfLines={3}
                />

                {!!error && <AppText style={modal.errorText}>{error}</AppText>}

                {/* Book button */}
                <TouchableOpacity onPress={handleBook} disabled={submitting || !selectedSlot}
                  style={[modal.bookBtn, (submitting || !selectedSlot) && modal.bookBtnDisabled]}>
                  {submitting
                    ? <ActivityIndicator color={BG} size="small" />
                    : <AppText variant="bold" style={modal.bookBtnText}>Book Session</AppText>
                  }
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function MentorBookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);

  useEffect(() => {
    fetch("https://www.passionseed.org/api/hackathon/mentor/public")
      .then((res) => { if (!res.ok) throw new Error("Failed to load mentors"); return res.json(); })
      .then((data) => { setMentors(data.mentors ?? []); setLoading(false); })
      .catch((err) => { setError(err.message ?? "Something went wrong"); setLoading(false); });
  }, []);

  // Pair mentors into rows of 2
  const rows: MentorProfile[][] = [];
  for (let i = 0; i < mentors.length; i += 2) {
    rows.push(mentors.slice(i, i + 2));
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <AppText style={styles.backLabel}>← Back</AppText>
          </Pressable>
          <AppText variant="bold" style={styles.title}>Mentor Booking</AppText>
          <AppText style={styles.subtitle}>Schedule 1:1 help with technical and business mentors.</AppText>
        </View>

        {loading && <View style={styles.center}><ActivityIndicator color={CYAN} size="large" /></View>}
        {!loading && error && <View style={styles.center}><AppText style={styles.errorText}>{error}</AppText></View>}
        {!loading && !error && mentors.length === 0 && (
          <View style={styles.center}><AppText style={{ color: WHITE40 }}>No mentors available yet.</AppText></View>
        )}

        {/* Grid */}
        {!loading && !error && rows.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((mentor) => (
              <MentorCard key={mentor.id} mentor={mentor} onPress={() => setSelectedMentor(mentor)} />
            ))}
            {/* Fill empty slot if odd count */}
            {row.length === 1 && <View style={styles.cardPlaceholder} />}
          </View>
        ))}
      </ScrollView>

      {/* Booking modal */}
      {selectedMentor && (
        <BookingModal mentor={selectedMentor} onClose={() => setSelectedMentor(null)} />
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { padding: Space.xl, paddingBottom: 120, gap: Space.lg },
  header: { marginBottom: Space.xs },
  backBtn: { marginBottom: Space.md },
  backLabel: { color: CYAN, fontSize: 14 },
  title: { fontSize: 26, color: WHITE, marginBottom: Space.xs },
  subtitle: { fontSize: 14, color: WHITE70 },
  center: { alignItems: "center", paddingVertical: Space["2xl"] },
  errorText: { color: "#F87171", fontSize: 13 },
  row: { flexDirection: "row", gap: Space.md },

  // Card
  card: {
    width: CARD_W,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CYAN_DIM,
  },
  cardPlaceholder: { width: CARD_W },
  photoWrap: { width: CARD_W, height: PHOTO_H, position: "relative" },
  photo: { width: CARD_W, height: PHOTO_H },
  photoFallback: {
    backgroundColor: "rgba(145,196,227,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 32, color: CYAN },
  typeBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeHealthcare: { backgroundColor: "rgba(59,130,246,0.75)" },
  typeBadgeGroup: { backgroundColor: "rgba(139,92,246,0.75)" },
  typeBadgeText: { fontSize: 11, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  cardBody: { padding: 12, gap: 3 },
  cardName: { fontSize: 14, color: WHITE },
  cardProfession: { fontSize: 12, color: WHITE70 },
  cardInstitution: { fontSize: 11, color: WHITE40 },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: MODAL_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    borderTopWidth: 1,
    borderColor: CYAN_DIM,
  },
  scrollContent: { paddingBottom: 48 },

  // Banner
  photoBanner: { width: "100%", height: 280, position: "relative" },
  bannerImg: { width: "100%", height: 280 },
  bannerFallback: {
    backgroundColor: "rgba(145,196,227,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerInitials: { fontSize: 56, color: CYAN },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: WHITE, fontSize: 14 },

  // Info
  infoSection: { paddingHorizontal: 24, paddingTop: 20, gap: 8 },
  name: { fontSize: 24, color: WHITE },
  bio: { fontSize: 14, color: WHITE70, lineHeight: 21 },
  institutionRow: { flexDirection: "row", marginTop: 4 },
  institutionPill: {
    backgroundColor: "rgba(145,196,227,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CYAN_DIM,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  institutionText: { fontSize: 13, color: CYAN, fontFamily: "BaiJamjuree_500Medium" },

  divider: { height: 1, backgroundColor: CYAN_DIM, marginVertical: 20, marginHorizontal: 24 },

  // Form
  formSection: { paddingHorizontal: 24, gap: Space.sm },
  fieldLabel: {
    fontSize: 11,
    color: CYAN,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "BaiJamjuree_700Bold",
    marginTop: 4,
  },
  pillScroll: { flexGrow: 0 },
  pillRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.35)",
    backgroundColor: "transparent",
  },
  pillSelected: { backgroundColor: CYAN_FILL, borderColor: CYAN },
  pillText: { fontSize: 13, color: WHITE70, fontFamily: "BaiJamjuree_500Medium" },
  pillTextSelected: { color: WHITE },

  // Slots loading / empty
  slotsLoadingBox: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 },
  slotsLoadingText: { color: WHITE40, fontSize: 13 },
  noSlotsBox: { paddingVertical: 16 },
  noSlotsText: { color: WHITE40, fontSize: 13 },

  // Time list
  timeList: { gap: 8 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(145,196,227,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.12)",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  timeRowSelected: {
    backgroundColor: CYAN,
    borderColor: CYAN,
  },
  timeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(145,196,227,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  timeIconWrapSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  timeIcon: { fontSize: 18 },
  timeIconSelected: {},
  timeRangeText: {
    fontSize: 15,
    color: WHITE70,
    fontFamily: "BaiJamjuree_500Medium",
  },
  timeRangeTextSelected: {
    color: BG,
    fontFamily: "BaiJamjuree_700Bold",
  },

  durationRow: { flexDirection: "row", gap: 12 },
  durationBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.35)",
    alignItems: "center",
  },
  durationBtnSelected: { backgroundColor: CYAN_FILL, borderColor: CYAN },
  durationText: { fontSize: 14, color: WHITE70, fontFamily: "BaiJamjuree_500Medium" },
  durationTextSelected: { color: WHITE },

  notesInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)",
    borderRadius: 12,
    color: WHITE,
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 14,
    padding: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorText: { color: "#F87171", fontSize: 13 },

  bookBtn: {
    backgroundColor: CYAN,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { color: BG, fontSize: 16 },

  // Success
  successBox: { paddingHorizontal: 24, paddingTop: 8, alignItems: "center", gap: 12 },
  successTitle: { fontSize: 20, color: CYAN },
  successSub: { fontSize: 14, color: WHITE70, textAlign: "center" },
  doneBtn: {
    marginTop: 8,
    backgroundColor: CYAN,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  doneBtnText: { color: BG, fontSize: 15 },
});
