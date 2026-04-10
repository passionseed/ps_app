import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
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
const RED = "#F87171";
const RED_DIM = "rgba(248,113,113,0.12)";
const RED_BORDER = "rgba(248,113,113,0.35)";
const BG = "#010108";
const CARD_BG = "#0d1219";

// ── Types ─────────────────────────────────────────────────────────────────────

type MentorProfile = {
  id: string;
  full_name: string;
  profession: string;
  institution: string;
  bio?: string;
  photo_url: string | null;
  session_type?: "healthcare" | "group";
  is_approved?: boolean;
  is_accepting_bookings?: boolean;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
};

type BookingInfo = {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
  cancellation_reason: string | null;
  slot_datetime: string;
  duration_minutes: number;
  notes: string | null;
  discord_room: number | null;
  mentor_id: string;
  mentor_profiles: MentorProfile | null;
};

type QuotaInfo = {
  chances_left: 0 | 1;
  booking: BookingInfo | null;
};

const TRACKS = [
  "Traditional & Integrative Healthcare",
  "Mental Health",
  "Community & Public Health",
] as const;
type Track = (typeof TRACKS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function generateAllSlots(): string[] {
  const slots: string[] = [];
  const now = new Date();
  for (let day = 0; day < 14; day++) {
    for (let hour = 8; hour <= 20; hour++) {
      const d = new Date(now);
      d.setDate(now.getDate() + day);
      d.setHours(hour, 0, 0, 0);
      if (d.getTime() > now.getTime() + 30 * 60 * 1000) slots.push(d.toISOString());
    }
  }
  return slots;
}

function groupSlotsByDate(slots: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const iso of slots) {
    const label = new Date(iso).toLocaleDateString("th-TH", { weekday: "short", month: "short", day: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(iso);
  }
  return map;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) +
    " น."
  );
}

function formatTimeRange(iso: string, duration: number): string {
  const d = new Date(iso);
  const end = new Date(d.getTime() + duration * 60000);
  const fmt = (dt: Date) => dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(d)} – ${fmt(end)} น.`;
}

function parseNotes(notes: string | null): { track: string; idea: string; need: string } | null {
  if (!notes) return null;
  const trackMatch = notes.match(/^Track: (.+)/m);
  const ideaMatch = notes.match(/รายละเอียด Idea:\n([\s\S]+?)(?=\n\nสิ่งที่|$)/);
  const needMatch = notes.match(/สิ่งที่ต้องการให้ Mentor ช่วย:\n([\s\S]+?)$/);
  if (!trackMatch) return null;
  return {
    track: trackMatch[1].trim(),
    idea: ideaMatch?.[1]?.trim() ?? "",
    need: needMatch?.[1]?.trim() ?? "",
  };
}

// ── MentorAvatar ──────────────────────────────────────────────────────────────

function MentorAvatar({ mentor, size = 64 }: { mentor: MentorProfile; size?: number }) {
  return mentor.photo_url ? (
    <Image
      source={{ uri: mentor.photo_url }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View style={[s.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText variant="bold" style={{ fontSize: size * 0.35, color: CYAN }}>
        {getInitials(mentor.full_name)}
      </AppText>
    </View>
  );
}

// ── Step 1: Mentor grid ───────────────────────────────────────────────────────

function MentorGrid({
  mentors,
  loading,
  error,
  onSelect,
}: {
  mentors: MentorProfile[];
  loading: boolean;
  error: string | null;
  onSelect: (m: MentorProfile) => void;
}) {
  const rows: MentorProfile[][] = [];
  for (let i = 0; i < mentors.length; i += 2) rows.push(mentors.slice(i, i + 2));

  if (loading) return <View style={s.center}><ActivityIndicator color={CYAN} size="large" /></View>;
  if (error) return <View style={s.center}><AppText style={s.errorText}>{error}</AppText></View>;
  if (mentors.length === 0) return <View style={s.center}><AppText style={{ color: WHITE40 }}>ยังไม่มี Mentor ในขณะนี้</AppText></View>;

  return (
    <View style={{ gap: Space.md }}>
      {rows.map((row, i) => (
        <View key={i} style={s.row}>
          {row.map((mentor) => {
            const unavailable = mentor.is_accepting_bookings === false;
            return (
              <TouchableOpacity
                key={mentor.id}
                activeOpacity={unavailable ? 1 : 0.85}
                onPress={() => { if (!unavailable) onSelect(mentor); }}
                style={[s.card, unavailable && { opacity: 0.4 }]}
              >
                <View style={s.photoWrap}>
                  {mentor.photo_url ? (
                    <Image source={{ uri: mentor.photo_url }} style={s.photo} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[s.photo, s.photoFallback]}>
                      <AppText variant="bold" style={s.initials}>{getInitials(mentor.full_name)}</AppText>
                    </View>
                  )}
                  {mentor.session_type && (
                    <View style={[s.typeBadge, mentor.session_type === "group" ? s.typeBadgeGroup : s.typeBadgeHealthcare]}>
                      <AppText style={s.typeBadgeText}>{mentor.session_type === "group" ? "Group" : "Healthcare"}</AppText>
                    </View>
                  )}
                  {unavailable && (
                    <View style={s.unavailableOverlay}>
                      <AppText style={s.unavailableText}>ปิดรับนัด</AppText>
                    </View>
                  )}
                </View>
                <View style={s.cardBody}>
                  <AppText variant="bold" style={s.cardName} numberOfLines={1}>{mentor.full_name}</AppText>
                  <AppText style={s.cardProfession} numberOfLines={1}>{mentor.profession}</AppText>
                  {!!mentor.institution && (
                    <AppText style={s.cardInstitution} numberOfLines={1}>{mentor.institution}</AppText>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {row.length === 1 && <View style={{ width: CARD_W }} />}
        </View>
      ))}
    </View>
  );
}

// ── Step 2: Mentor detail (bio + social) ─────────────────────────────────────

function MentorDetail({
  mentor,
  onBook,
}: {
  mentor: MentorProfile;
  onBook: () => void;
}) {
  return (
    <View style={{ gap: Space.md }}>
      {/* Avatar + name */}
      <View style={{ alignItems: "center", gap: Space.sm }}>
        <MentorAvatar mentor={mentor} size={96} />
        <AppText variant="bold" style={{ fontSize: 20, color: WHITE, textAlign: "center" }}>
          {mentor.full_name}
        </AppText>
        <AppText style={{ fontSize: 14, color: WHITE70, textAlign: "center" }}>
          {mentor.profession}
        </AppText>
        {!!mentor.institution && (
          <AppText style={{ fontSize: 13, color: WHITE40, textAlign: "center" }}>
            {mentor.institution}
          </AppText>
        )}
        {mentor.session_type && (
          <View style={[s.typeBadgeInline, mentor.session_type === "group" ? s.typeBadgeGroup : s.typeBadgeHealthcare]}>
            <AppText style={s.typeBadgeText}>
              {mentor.session_type === "group" ? "Group" : "Healthcare"}
            </AppText>
          </View>
        )}
      </View>

      {/* Bio */}
      {!!mentor.bio && (
        <View style={s.detailSection}>
          <AppText variant="bold" style={s.detailSectionTitle}>เกี่ยวกับ Mentor</AppText>
          <AppText style={{ fontSize: 14, color: WHITE70, lineHeight: 22 }}>{mentor.bio}</AppText>
        </View>
      )}

      {/* Social Media */}
      {(mentor.instagram_url || mentor.linkedin_url || mentor.website_url) && (
        <View style={s.detailSection}>
          <AppText variant="bold" style={s.detailSectionTitle}>Social Media</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {!!mentor.instagram_url && (
              <TouchableOpacity
                style={[s.socialBtn, { backgroundColor: "rgba(225,48,108,0.15)", borderColor: "rgba(225,48,108,0.4)" }]}
                onPress={() => Linking.openURL(mentor.instagram_url!.startsWith("http") ? mentor.instagram_url! : `https://instagram.com/${mentor.instagram_url}`)}
                activeOpacity={0.7}
              >
                <AppText style={[s.socialBtnText, { color: "#E1306C" }]}>📷 Instagram</AppText>
              </TouchableOpacity>
            )}
            {!!mentor.linkedin_url && (
              <TouchableOpacity
                style={[s.socialBtn, { backgroundColor: "rgba(0,119,181,0.15)", borderColor: "rgba(0,119,181,0.4)" }]}
                onPress={() => Linking.openURL(mentor.linkedin_url!.startsWith("http") ? mentor.linkedin_url! : `https://linkedin.com/in/${mentor.linkedin_url}`)}
                activeOpacity={0.7}
              >
                <AppText style={[s.socialBtnText, { color: "#0077B5" }]}>💼 LinkedIn</AppText>
              </TouchableOpacity>
            )}
            {!!mentor.website_url && (
              <TouchableOpacity
                style={[s.socialBtn, { backgroundColor: "rgba(145,196,227,0.1)", borderColor: "rgba(145,196,227,0.35)" }]}
                onPress={() => Linking.openURL(mentor.website_url!.startsWith("http") ? mentor.website_url! : `https://${mentor.website_url}`)}
                activeOpacity={0.7}
              >
                <AppText style={[s.socialBtnText, { color: CYAN }]}>🌐 Website</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Book button */}
      <TouchableOpacity style={s.confirmBtn} onPress={onBook} activeOpacity={0.85}>
        <AppText variant="bold" style={{ color: BG, fontSize: 16 }}>นัดหมาย Mentor นี้ →</AppText>
      </TouchableOpacity>
    </View>
  );
}

// ── Step 3: Booking form for a selected mentor ────────────────────────────────

function BookingForm({
  mentor,
  onBack,
  onSuccess,
}: {
  mentor: MentorProfile;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [ideaDetail, setIdeaDetail] = useState("");
  const [mentorNeed, setMentorNeed] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `https://www.passionseed.org/api/hackathon/student/mentor-slots?mentor_id=${mentor.id}&duration=30`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        if (res.status === 404) return { slots: null };
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Server error");
        return data;
      })
      .then((data) => {
        const loaded: string[] = data.slots ?? generateAllSlots();
        setSlots(loaded);
        if (loaded.length > 0) {
          const firstDate = new Date(loaded[0]).toLocaleDateString("th-TH", { weekday: "short", month: "short", day: "numeric" });
          setSelectedDate(firstDate);
        }
        setSlotsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setSlots(generateAllSlots());
        setSlotsLoading(false);
      });
    return () => controller.abort();
  }, [mentor.id]);

  const slotsByDate = groupSlotsByDate(slots);
  const dateOptions = Array.from(slotsByDate.keys());
  const timeSlotsForDate = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];

  async function handleSubmit() {
    if (!selectedTrack) { setError("กรุณาเลือก Track ของทีม"); return; }
    if (!ideaDetail.trim()) { setError("กรุณากรอกรายละเอียด Idea"); return; }
    if (!mentorNeed.trim()) { setError("กรุณาระบุสิ่งที่ต้องการให้ Mentor ช่วย"); return; }
    if (!selectedSlot) { setError("กรุณาเลือกเวลานัดหมาย"); return; }

    setSubmitting(true);
    setError(null);
    try {
      const token = await readHackathonToken();
      if (!token) { setError("คุณยังไม่ได้เข้าสู่ระบบ"); setSubmitting(false); return; }

      const notes = `Track: ${selectedTrack}\n\nรายละเอียด Idea:\n${ideaDetail.trim()}\n\nสิ่งที่ต้องการให้ Mentor ช่วย:\n${mentorNeed.trim()}`;

      const res = await fetch("https://www.passionseed.org/api/hackathon/student/book-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mentor_id: mentor.id, slot_datetime: selectedSlot, notes }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setSubmitting(false);
    }
  }

  return (
    <View style={{ gap: Space.md }}>
      {/* Selected mentor header */}
      <TouchableOpacity onPress={onBack} style={s.mentorSelectedRow} activeOpacity={0.7}>
        <MentorAvatar mentor={mentor} size={52} />
        <View style={{ flex: 1 }}>
          <AppText variant="bold" style={s.mentorSelectedName}>{mentor.full_name}</AppText>
          <AppText style={s.mentorSelectedProfession}>{mentor.profession}</AppText>
          {!!mentor.institution && <AppText style={s.mentorSelectedInstitution}>{mentor.institution}</AppText>}
        </View>
        <AppText style={s.changeMentorText}>เปลี่ยน</AppText>
      </TouchableOpacity>

      {/* Track */}
      <AppText style={s.fieldLabel}>Track ของทีม</AppText>
      <View style={s.trackList}>
        {TRACKS.map((track) => (
          <TouchableOpacity
            key={track}
            onPress={() => setSelectedTrack(track)}
            style={[s.trackRow, selectedTrack === track && s.trackRowSelected]}
          >
            <View style={[s.trackDot, selectedTrack === track && s.trackDotSelected]} />
            <AppText style={[s.trackText, selectedTrack === track && s.trackTextSelected]}>{track}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Idea detail */}
      <AppText style={s.fieldLabel}>รายละเอียด Idea ของทีม</AppText>
      <TextInput
        value={ideaDetail}
        onChangeText={setIdeaDetail}
        placeholder="อธิบาย Idea หรือโปรเจกต์ของทีมโดยย่อ..."
        placeholderTextColor={WHITE40}
        style={s.textInput}
        multiline
        numberOfLines={3}
      />

      {/* Mentor need */}
      <AppText style={s.fieldLabel}>ต้องการให้ Mentor ช่วยเรื่องอะไร</AppText>
      <TextInput
        value={mentorNeed}
        onChangeText={setMentorNeed}
        placeholder="เช่น ขอคำแนะนำด้านการตลาด, ตรวจสอบแผนธุรกิจ..."
        placeholderTextColor={WHITE40}
        style={s.textInput}
        multiline
        numberOfLines={3}
      />

      {/* Date */}
      <AppText style={s.fieldLabel}>เลือกวันที่</AppText>
      {slotsLoading ? (
        <ActivityIndicator color={CYAN} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll} contentContainerStyle={s.pillRow}>
          {dateOptions.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => { setSelectedDate(d); setSelectedSlot(null); }}
              style={[s.pill, selectedDate === d && s.pillSelected]}
            >
              <AppText style={[s.pillText, selectedDate === d && s.pillTextSelected]}>{d}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Time */}
      {!slotsLoading && (
        <>
          <AppText style={s.fieldLabel}>เลือกเวลา</AppText>
          <View style={s.timeList}>
            {timeSlotsForDate.map((iso) => {
              const isSelected = selectedSlot === iso;
              return (
                <TouchableOpacity
                  key={iso}
                  onPress={() => setSelectedSlot(iso)}
                  style={[s.timeRow, isSelected && s.timeRowSelected]}
                >
                  <AppText style={[s.timeText, isSelected && s.timeTextSelected]}>
                    {formatTimeRange(iso, 30)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {!!error && <AppText style={s.errorText}>{error}</AppText>}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={[s.confirmBtn, submitting && s.confirmBtnDisabled]}
      >
        {submitting
          ? <ActivityIndicator color={BG} size="small" />
          : <AppText variant="bold" style={s.confirmBtnText}>ยืนยันการจอง</AppText>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onCancel,
  onRebook,
  cancelling,
  cancelError,
}: {
  booking: BookingInfo;
  onCancel: () => void;
  onRebook: () => void;
  cancelling: boolean;
  cancelError?: string | null;
}) {
  const mentor = booking.mentor_profiles;
  const parsed = parseNotes(booking.notes);
  const isCancelled = booking.status === "cancelled";
  const cancelledByStudent = booking.cancellation_reason === "ยกเลิกโดยผู้เข้าร่วม";
  const cancelledByAdmin = booking.cancellation_reason === "รีเซ็ตสิทธิ์โดย Admin";
  const cancelledByMentor = isCancelled && !cancelledByStudent && !cancelledByAdmin;
  // Mentor declined = cancelled with no reason (from pending). Mentor cancelled = has reason (from confirmed).
  const mentorDeclined = cancelledByMentor && !booking.cancellation_reason;
  const mentorCancelledAfterConfirm = cancelledByMentor && !!booking.cancellation_reason;
  const isConfirmed = booking.status === "confirmed";

  return (
    <View style={[s.bookingCard, isCancelled && s.bookingCardCancelled]}>
      {/* Status pill */}
      <View style={[
        s.statusPill,
        isCancelled ? s.statusPillCancelled : isConfirmed ? s.statusPillConfirmed : s.statusPillPending,
      ]}>
        <AppText style={[
          s.statusPillText,
          { color: isCancelled ? RED : isConfirmed ? "#4ADE80" : CYAN },
        ]}>
          {isCancelled
        ? mentorDeclined ? "Mentor ปฏิเสธการนัด"
        : mentorCancelledAfterConfirm ? "Mentor ยกเลิกหลังยืนยัน"
        : cancelledByStudent ? "คุณยกเลิกแล้ว"
        : "ยกเลิกแล้ว"
        : isConfirmed ? "ยืนยันแล้ว ✓" : "รอการยืนยัน"}
        </AppText>
      </View>

      {/* Mentor */}
      {mentor && (
        <View style={s.mentorRow}>
          <MentorAvatar mentor={mentor} size={56} />
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="bold" style={s.mentorName}>{mentor.full_name}</AppText>
            <AppText style={s.mentorProfession}>{mentor.profession}</AppText>
            {!!mentor.institution && <AppText style={s.mentorInstitution}>{mentor.institution}</AppText>}
          </View>
        </View>
      )}

      <View style={s.divider} />

      {/* Meeting time */}
      <View style={s.infoRow}>
        <AppText style={s.infoLabel}>วันที่นัด</AppText>
        <AppText style={[s.infoValue, { flex: 1 }]}>{formatDateTime(booking.slot_datetime)}</AppText>
      </View>
      <View style={s.infoRow}>
        <AppText style={s.infoLabel}>เวลา</AppText>
        <AppText style={s.infoValue}>{formatTimeRange(booking.slot_datetime, booking.duration_minutes ?? 30)}</AppText>
      </View>
      {isConfirmed && booking.discord_room != null && (
        <View style={s.discordRoomBox}>
          <AppText style={s.discordRoomLabel}>ห้อง Discord</AppText>
          <AppText style={s.discordRoomValue}>🎙 ห้อง {booking.discord_room}</AppText>
        </View>
      )}

      {/* Notes */}
      {parsed && (
        <>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <AppText style={s.infoLabel}>Track</AppText>
            <AppText style={[s.infoValue, { flex: 1 }]}>{parsed.track}</AppText>
          </View>
          {!!parsed.idea && (
            <View style={{ gap: 4 }}>
              <AppText style={s.infoLabel}>รายละเอียด Idea</AppText>
              <AppText style={s.infoValue}>{parsed.idea}</AppText>
            </View>
          )}
          {!!parsed.need && (
            <View style={{ gap: 4 }}>
              <AppText style={s.infoLabel}>ต้องการให้ Mentor ช่วย</AppText>
              <AppText style={s.infoValue}>{parsed.need}</AppText>
            </View>
          )}
        </>
      )}

      {/* Cancellation */}
      {isCancelled && (
        <>
          <View style={s.divider} />
          <View style={{ gap: 6 }}>
            {mentorDeclined && (
              <>
                <AppText style={[s.infoLabel, { color: RED }]}>Mentor ปฏิเสธการนัด</AppText>
                <AppText style={s.refundNote}>สิทธิ์การจองของทีมได้รับคืนแล้ว</AppText>
                <TouchableOpacity onPress={onRebook} style={s.rebookBtn}>
                  <AppText variant="bold" style={s.rebookBtnText}>จองใหม่</AppText>
                </TouchableOpacity>
              </>
            )}
            {mentorCancelledAfterConfirm && (
              <>
                <AppText style={[s.infoLabel, { color: RED }]}>เหตุผลที่ยกเลิก</AppText>
                <AppText style={s.infoValue}>{booking.cancellation_reason}</AppText>
                <AppText style={s.refundNote}>สิทธิ์การจองของทีมได้รับคืนแล้ว</AppText>
                <TouchableOpacity onPress={onRebook} style={s.rebookBtn}>
                  <AppText variant="bold" style={s.rebookBtnText}>จองใหม่</AppText>
                </TouchableOpacity>
              </>
            )}
            {cancelledByStudent && (
              <>
                <AppText style={[s.infoLabel, { color: RED }]}>คุณยกเลิกการนัดนี้</AppText>
                <AppText style={[s.refundNote, { color: WHITE40 }]}>
                  สิทธิ์การจองถูกใช้ไปแล้ว ไม่สามารถจองใหม่ได้
                </AppText>
              </>
            )}
          </View>
        </>
      )}

      {/* Cancel button */}
      {!isCancelled && (
        <>
          {!!cancelError && <AppText style={s.errorText}>{cancelError}</AppText>}
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel} disabled={cancelling}>
            {cancelling
              ? <ActivityIndicator color={RED} size="small" />
              : <AppText style={s.cancelBtnText}>ยกเลิกการนัด</AppText>
            }
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Step = "grid" | "detail" | "form";

export default function MentorBookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = React.useRef<ScrollView>(null);

  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [mentorsError, setMentorsError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("grid");
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function goToStep(s: Step) {
    setStep(s);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  async function fetchQuota() {
    const token = await readHackathonToken();
    if (!token) { setQuotaLoading(false); return; }
    try {
      const res = await fetch("https://www.passionseed.org/api/hackathon/student/mentor-quota", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("quota response", JSON.stringify(data));
      setQuota(data as QuotaInfo);
    } catch {
      // fail silently
    } finally {
      setQuotaLoading(false);
    }
  }

  useFocusEffect(useCallback(() => {
    setQuotaLoading(true);
    fetchQuota();
  }, []));

  useEffect(() => {
    fetch("https://www.passionseed.org/api/hackathon/mentor/public")
      .then((res) => { if (!res.ok) throw new Error("Failed to load mentors"); return res.json(); })
      .then((data) => { setMentors(data.mentors ?? []); setMentorsLoading(false); })
      .catch((err) => { setMentorsError(err.message ?? "Something went wrong"); setMentorsLoading(false); });
  }, []);

  async function doCancel() {
    if (!quota?.booking) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const token = await readHackathonToken();
      if (!token) { setCancelError("ไม่พบ session กรุณาเข้าสู่ระบบใหม่"); return; }
      const res = await fetch(
        `https://www.passionseed.org/api/hackathon/student/cancel-booking/${quota.booking.id}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));
      console.log("cancel response", res.status, data);
      if (!res.ok) {
        setCancelError(data.error ?? "ไม่สามารถยกเลิกได้ กรุณาลองใหม่");
        return;
      }
      setQuotaLoading(true);
      await fetchQuota();
    } catch (err) {
      console.error("cancel error", err);
      setCancelError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setCancelling(false);
    }
  }

  function handleCancel() {
    if (!quota?.booking) return;
    Alert.alert(
      "ยืนยันการยกเลิก",
      "สิทธิ์การจอง 1 ครั้งจะหมดไป ไม่สามารถจองใหม่ได้",
      [
        { text: "ไม่ใช่", style: "cancel" },
        { text: "ยืนยันยกเลิก", style: "destructive", onPress: () => { void doCancel(); } },
      ]
    );
  }

  function handleRebook() {
    goToStep("grid");
    setSelectedMentor(null);
  }

  // Determine what to show
  const hasActiveBooking = quota?.booking && quota.booking.status !== "cancelled";
  // Only show cancelled card if chances are used up (cancelled by student)
  const hasCancelledBooking = quota?.booking && quota.booking.status === "cancelled" && quota.chances_left === 0;
  const showBookingCard = hasActiveBooking || hasCancelledBooking;
  const showForm = !showBookingCard && quota?.chances_left === 1;

  // Header back label
  const backLabel = showBookingCard || step === "grid" ? "← Back" : step === "form" ? "← ข้อมูล Mentor" : "← เลือก Mentor";
  function handleBack() {
    if (showBookingCard || step === "grid") { router.back(); }
    else if (step === "form") { goToStep("detail"); }
    else { goToStep("grid"); setSelectedMentor(null); }
  }

  return (
    <View style={s.root}>
      <ScrollView ref={scrollRef} contentContainerStyle={[s.content, { paddingTop: insets.top + Space.md }]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={handleBack} style={s.backBtn}>
            <AppText style={s.backLabel}>{backLabel}</AppText>
          </Pressable>
          <AppText variant="bold" style={s.title}>Mentor Booking</AppText>
          <AppText style={s.subtitle}>นัดหมาย Mentor 1:1 เพื่อขอคำแนะนำ</AppText>
        </View>

        {quotaLoading ? (
          <View style={s.center}><ActivityIndicator color={CYAN} size="large" /></View>
        ) : showBookingCard ? (
          <BookingCard
            booking={quota!.booking!}
            onCancel={handleCancel}
            onRebook={handleRebook}
            cancelling={cancelling}
            cancelError={cancelError}
          />
        ) : showForm && step === "form" && selectedMentor ? (
          <BookingForm
            mentor={selectedMentor}
            onBack={() => { goToStep("detail"); }}
            onSuccess={() => { setQuotaLoading(true); fetchQuota(); }}
          />
        ) : showForm && step === "detail" && selectedMentor ? (
          <MentorDetail
            mentor={selectedMentor}
            onBook={() => goToStep("form")}
          />
        ) : (
          <>
            {/* One-chance banner */}
            <View style={s.onceNotice}>
              <AppText variant="bold" style={s.onceNoticeTitle}>จองได้ 1 ครั้งต่อทีมเท่านั้น</AppText>
              <AppText style={s.onceNoticeSub}>เลือก Mentor ที่ต้องการ แล้วกรอกข้อมูลทีม</AppText>
            </View>

            <MentorGrid
              mentors={mentors}
              loading={mentorsLoading}
              error={mentorsError}
              onSelect={(m) => { setSelectedMentor(m); goToStep("detail"); }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { padding: Space.xl, paddingBottom: 120, gap: Space.lg },
  header: { marginBottom: Space.xs },
  backBtn: { marginBottom: Space.md },
  backLabel: { color: CYAN, fontSize: 14 },
  title: { fontSize: 26, color: WHITE, marginBottom: Space.xs },
  subtitle: { fontSize: 14, color: WHITE70 },
  center: { alignItems: "center", paddingVertical: Space["2xl"] },
  errorText: { color: RED, fontSize: 13 },
  divider: { height: 1, backgroundColor: CYAN_DIM, marginVertical: 4 },
  row: { flexDirection: "row", gap: Space.md },

  // Mentor grid card
  card: {
    width: CARD_W,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CYAN_DIM,
  },
  photoWrap: { width: CARD_W, height: PHOTO_H, position: "relative" },
  photo: { width: CARD_W, height: PHOTO_H },
  photoFallback: { backgroundColor: "rgba(145,196,227,0.12)", alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 32, color: CYAN },
  typeBadge: { position: "absolute", top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeBadgeHealthcare: { backgroundColor: "rgba(59,130,246,0.75)" },
  typeBadgeGroup: { backgroundColor: "rgba(139,92,246,0.75)" },
  typeBadgeText: { fontSize: 11, color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  unavailableOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 6, alignItems: "center" },
  unavailableText: { fontSize: 12, color: "#9ca3af", fontFamily: "BaiJamjuree_700Bold" },
  cardBody: { padding: 12, gap: 3 },
  cardName: { fontSize: 14, color: WHITE },
  cardProfession: { fontSize: 12, color: WHITE70 },
  cardInstitution: { fontSize: 11, color: WHITE40 },

  // Avatar fallback
  avatarFallback: { backgroundColor: "rgba(145,196,227,0.12)", alignItems: "center", justifyContent: "center" },

  // Selected mentor header (step 2)
  mentorSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CYAN_DIM,
    padding: 14,
  },
  mentorSelectedName: { fontSize: 16, color: WHITE },
  mentorSelectedProfession: { fontSize: 13, color: WHITE70 },
  mentorSelectedInstitution: { fontSize: 12, color: WHITE40 },
  changeMentorText: { fontSize: 13, color: CYAN, fontFamily: "BaiJamjuree_700Bold" },

  // One-chance banner
  onceNotice: {
    backgroundColor: CYAN_FILL,
    borderWidth: 1,
    borderColor: CYAN_DIM,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  onceNoticeTitle: { fontSize: 17, color: WHITE },
  onceNoticeSub: { fontSize: 13, color: WHITE70, textAlign: "center" },

  // Form fields
  fieldLabel: {
    fontSize: 11,
    color: CYAN,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "BaiJamjuree_700Bold",
  },
  trackList: { gap: 8 },
  trackRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(145,196,227,0.06)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(145,196,227,0.12)",
    paddingVertical: 12, paddingHorizontal: 14,
  },
  trackRowSelected: { backgroundColor: CYAN_FILL, borderColor: CYAN },
  trackDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "rgba(145,196,227,0.4)" },
  trackDotSelected: { backgroundColor: CYAN, borderColor: CYAN },
  trackText: { fontSize: 13, color: WHITE70, fontFamily: "BaiJamjuree_500Medium", flex: 1 },
  trackTextSelected: { color: WHITE, fontFamily: "BaiJamjuree_700Bold" },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1,
    borderColor: "rgba(145,196,227,0.2)", borderRadius: 12,
    color: WHITE, fontFamily: "LibreFranklin_400Regular",
    fontSize: 14, padding: 14, minHeight: 80, textAlignVertical: "top",
  },
  pillScroll: { flexGrow: 0 },
  pillRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "rgba(145,196,227,0.35)" },
  pillSelected: { backgroundColor: CYAN_FILL, borderColor: CYAN },
  pillText: { fontSize: 13, color: WHITE70, fontFamily: "BaiJamjuree_500Medium" },
  pillTextSelected: { color: WHITE },
  timeList: { gap: 8 },
  timeRow: {
    paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(145,196,227,0.12)",
    backgroundColor: "rgba(145,196,227,0.05)",
  },
  timeRowSelected: { backgroundColor: CYAN, borderColor: CYAN },
  timeText: { fontSize: 14, color: WHITE70, fontFamily: "BaiJamjuree_500Medium" },
  timeTextSelected: { color: BG, fontFamily: "BaiJamjuree_700Bold" },
  discordRoomBox: { backgroundColor: "rgba(88,101,242,0.15)", borderWidth: 1, borderColor: "rgba(88,101,242,0.4)", borderRadius: 10, padding: 14, gap: 4, marginTop: 4 },
  discordRoomLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 },
  discordRoomValue: { fontSize: 20, color: "#7289DA", fontFamily: "BaiJamjuree_700Bold" },

  typeBadgeInline: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  detailSection: { backgroundColor: CARD_BG, borderRadius: 12, padding: 16, gap: 8 },
  detailSectionTitle: { fontSize: 13, color: WHITE40, letterSpacing: 0.5 },
  socialBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  socialBtnText: { fontSize: 14, fontFamily: "BaiJamjuree_700Bold" },

  confirmBtn: { backgroundColor: CYAN, borderRadius: 50, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: BG, fontSize: 16 },

  // Booking card
  bookingCard: {
    backgroundColor: CARD_BG, borderRadius: 20,
    borderWidth: 1, borderColor: CYAN_DIM, padding: 20, gap: 12,
  },
  bookingCardCancelled: { borderColor: RED_BORDER, backgroundColor: RED_DIM },
  statusPill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusPillPending: { borderColor: CYAN_DIM, backgroundColor: CYAN_FILL },
  statusPillConfirmed: { borderColor: "rgba(74,222,128,0.3)", backgroundColor: "rgba(74,222,128,0.1)" },
  statusPillCancelled: { borderColor: RED_BORDER, backgroundColor: RED_DIM },
  statusPillText: { fontSize: 12, fontFamily: "BaiJamjuree_700Bold" },
  mentorRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  mentorName: { fontSize: 18, color: WHITE },
  mentorProfession: { fontSize: 13, color: WHITE70 },
  mentorInstitution: { fontSize: 12, color: WHITE40 },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  infoLabel: { fontSize: 11, color: CYAN, fontFamily: "BaiJamjuree_700Bold", letterSpacing: 0.8, width: 80, paddingTop: 2 },
  infoValue: { fontSize: 14, color: WHITE70, lineHeight: 21 },
  refundNote: { fontSize: 12, color: CYAN, fontFamily: "BaiJamjuree_500Medium" },
  cancelBtn: { borderWidth: 1, borderColor: RED_BORDER, borderRadius: 50, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  cancelBtnText: { color: RED, fontSize: 14, fontFamily: "BaiJamjuree_700Bold" },
  rebookBtn: { backgroundColor: CYAN, borderRadius: 50, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  rebookBtnText: { color: BG, fontSize: 14 },
});
