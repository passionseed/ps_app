import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  FlatList,
  Alert,
} from "react-native";
import { AppText as Text } from "../../components/AppText";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { backfillMissingIkigaiReflections } from "../../lib/ikigaiBackfill";
import { getProfile } from "../../lib/onboarding";
import {
  type IkigaiScores,
  type ScoreTimelineItem,
} from "../../lib/scoreEngine";
import {
  buildFocusSections,
  buildProfileMetaPills,
  buildRecentActivityItems,
  type ProfileActivityItem,
  type ProfileFocusSection,
} from "../../lib/profileScreenData";
import type { UserEvent } from "../../types/events";
import type {
  CareerGoal,
  InterestCategory,
  Profile,
} from "../../types/onboarding";
import { Accent, PageBg } from "../../lib/theme";
import { HackathonHeroCard } from "../../components/discover/HackathonHeroCard";

interface IkigaiPillar {
  score: number;
  label: string;
  emoji: string;
  description: string;
  insight: string;
  route: string;
}

function getIkigaiInsight(scores: IkigaiScores, isThai: boolean): string {
  const { passion, mission, profession, vocation } = scores;
  const avg = (passion + mission + profession + vocation) / 4;

  if (isThai) {
    if (passion >= 75 && mission >= 75) {
      return "ความหลงใหลและภารกิจของคุณสอดคล้องกันอย่างมาก พัฒนาทักษะต่อไปเพื่อเปลี่ยนแนวทางนี้ให้เป็นผลงานจริง";
    }
    if (profession >= 75 && vocation >= 75) {
      return "คุณมีโมเมนตัมที่แข็งแกร่งแล้วในด้านอาชีพและจุดแข็ง ตอนนี้มุ่งเน้นไปที่งานที่ทำให้คุณตื่นเต้น";
    }
    if (avg >= 70) {
      return "คุณมีความสมดุลที่แข็งแกร่งในทั้งสี่มิติของ Ikigai สำรวจต่อไปเพื่อกำหนดสิ่งที่ควรทำต่อไป";
    }
    if (passion < 50 && profession < 50) {
      return "คุณยังอยู่ในช่วงเริ่มต้นของการสำรวจ ลอง Seeds และการสะท้อนคิดเพิ่มเติมเพื่อเรียนรู้ว่าอะไรที่ดึงดูดความสนใจของคุณจริง ๆ";
    }
    if (vocation < 50) {
      return "ทิศทางของคุณกำลังก่อตัว แต่ฐานทักษะยังต้องการการฝึกฝน การฝึกซ้อมเพิ่มเติมจะช่วยให้เส้นทางชัดเจนขึ้น";
    }
    return "สัญญาณเริ่มก่อตัวแล้ว สำรวจและสะท้อนคิดต่อไปเพื่อให้รูปแบบชัดเจนขึ้น";
  }

  if (passion >= 75 && mission >= 75) {
    return "Your passion and mission are strongly aligned. Keep building the skills that turn that direction into real work.";
  }
  if (profession >= 75 && vocation >= 75) {
    return "You already have strong momentum in career-fit and strengths. Now keep pressure on the work that excites you.";
  }
  if (avg >= 70) {
    return "You have a strong balance across the four Ikigai dimensions. Keep exploring to sharpen what should come next.";
  }
  if (passion < 50 && profession < 50) {
    return "You are still early in exploration. Try more Seeds and reflections to learn what actually holds your attention.";
  }
  if (vocation < 50) {
    return "Your direction is forming, but your skill base still needs repetition. More practice should make the path clearer.";
  }
  return "The signal is starting to form. Keep exploring and reflecting so the pattern becomes easier to trust.";
}

function getPillarInsight(dimension: string, score: number, isThai: boolean): string {
  if (isThai) {
    if (score >= 80) {
      switch (dimension) {
        case "passion":
          return "คุณใส่ใจอย่างลึกซึ้งในด้านนี้";
        case "mission":
          return "สิ่งนี้ผูกโยงกับผลกระทบที่มีความหมายอย่างใกล้ชิด";
        case "profession":
          return "ทิศทางนี้มีศักยภาพในอาชีพแล้ว";
        case "vocation":
          return "จุดแข็งของคุณแสดงออกมาอย่างชัดเจนที่นี่";
      }
    } else if (score >= 60) {
      switch (dimension) {
        case "passion":
          return "ความสนใจนี้แข็งแกร่งและคุ้มค่ากับการติดตาม";
        case "mission":
          return "คุณกำลังสร้างความรู้สึกมีจุดมุ่งหมายที่ชัดเจนขึ้น";
        case "profession":
          return "สิ่งนี้มีศักยภาพในอาชีพที่น่าสนใจ";
        case "vocation":
          return "ความสามารถของคุณกำลังสร้างขึ้นอย่างมีนัยสำคัญ";
      }
    } else if (score >= 40) {
      switch (dimension) {
        case "passion":
          return "มีความดึงดูดบางอย่างที่นี่ แต่ต้องการการสำรวจเพิ่มเติม";
        case "mission":
          return "ความรู้สึกมีส่วนร่วมของคุณยังคงพัฒนาอยู่";
        case "profession":
          return "สัญญาณอาชีพยังอ่อนแอแต่กำลังก่อตัว";
        case "vocation":
          return "ทักษะเริ่มก่อตัวขึ้น แต่ยังไม่คงที";
      }
    } else {
      switch (dimension) {
        case "passion":
          return "คุณยังคงทดสอบว่าสิ่งนี้ทำให้คุณมีพลังจริง ๆ หรือไม่";
        case "mission":
          return "คุณยังคงค้นพบวิธีที่คุณต้องการมีส่วนร่วม";
        case "profession":
          return "ความพอดีในอาชีพยังอยู่ในระยะเริ่มต้นที่นี่";
        case "vocation":
          return "คุณยังคงสร้างพื้นฐานอยู่";
      }
    }
    return "";
  }

  if (score >= 80) {
    switch (dimension) {
      case "passion":
        return "You care deeply about this area.";
      case "mission":
        return "This feels closely tied to meaningful impact.";
      case "profession":
        return "This direction already looks career-viable.";
      case "vocation":
        return "Your strengths are showing up clearly here.";
    }
  } else if (score >= 60) {
    switch (dimension) {
      case "passion":
        return "The interest is strong and worth following.";
      case "mission":
        return "You are building a clearer sense of purpose.";
      case "profession":
        return "This has promising career potential.";
      case "vocation":
        return "Your capability is building in a real way.";
    }
  } else if (score >= 40) {
    switch (dimension) {
      case "passion":
        return "There is some pull here, but it needs more exploration.";
      case "mission":
        return "Your sense of contribution is still developing.";
      case "profession":
        return "The career signal is still weak but forming.";
      case "vocation":
        return "Skills are starting to form, but not yet stable.";
    }
  } else {
    switch (dimension) {
      case "passion":
        return "You are still testing whether this truly energizes you.";
      case "mission":
        return "You are still discovering how you want to contribute.";
      case "profession":
        return "Career fit is still very early here.";
      case "vocation":
        return "You are still building the basics.";
    }
  }
  return "";
}

function buildIkigaiData(scores: IkigaiScores, isThai: boolean): Record<string, IkigaiPillar> {
  return {
    passion: {
      score: scores.passion,
      label: isThai ? "ความหลงใหล" : "Passion",
      emoji: "🔥",
      description: isThai ? "สิ่งที่คุณรัก" : "What you love",
      insight: getPillarInsight("passion", scores.passion, isThai),
      route: "/ikigai/passion",
    },
    mission: {
      score: scores.mission,
      label: isThai ? "ภารกิจ" : "Mission",
      emoji: "🎯",
      description: isThai ? "สิ่งที่โลกต้องการ" : "What the world needs",
      insight: getPillarInsight("mission", scores.mission, isThai),
      route: "/ikigai/mission",
    },
    profession: {
      score: scores.profession,
      label: isThai ? "อาชีพ" : "Profession",
      emoji: "💼",
      description: isThai ? "สิ่งที่คุณได้รับค่าจ้าง" : "What you can be paid for",
      insight: getPillarInsight("profession", scores.profession, isThai),
      route: "/ikigai/profession",
    },
    vocation: {
      score: scores.vocation,
      label: isThai ? "คุณสมบัติ" : "Vocation",
      emoji: "🌍",
      description: isThai ? "สิ่งที่คุณเก่ง" : "What you're good at",
      insight: getPillarInsight("vocation", scores.vocation, isThai),
      route: "/ikigai/vocation",
    },
  };
}

function formatActivityTime(isoDate: string, isThai: boolean): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return isThai ? `${diffMinutes} นาทีที่แล้ว` : `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return isThai ? `${diffHours} ชั่วโมงที่แล้ว` : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return isThai ? `${diffDays} วันที่แล้ว` : `${diffDays}d ago`;
  }

  const date = new Date(isoDate);
  if (isThai) {
    const thaiMonths = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${date.getDate()} ${thaiMonths[date.getMonth()]}`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function pluralize(count: number, singular: string, plural = `${singular}s`, isThai = false) {
  if (isThai) {
    return `${count} ${singular}`;
  }
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function ProfileScreen() {
  const { appLanguage, user, isGuest, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<InterestCategory[]>([]);
  const [careers, setCareers] = useState<CareerGoal[]>([]);
  const [ikigaiScores, setIkigaiScores] = useState<IkigaiScores | null>(null);
  const [scoreTimeline, setScoreTimeline] = useState<ScoreTimelineItem[]>([]);
  const [hasScores, setHasScores] = useState<boolean | null>(null);
  const [activityEvents, setActivityEvents] = useState<UserEvent[]>([]);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [savedProgramsCount, setSavedProgramsCount] = useState(0);
  const [backfillingScores, setBackfillingScores] = useState(false);
  const [profileRefreshNonce, setProfileRefreshNonce] = useState(0);
  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;
    let cancelled = false;

    async function loadData() {
      const [
        profileData,
        interestsData,
        careersData,
        journeyData,
        scoreEventsData,
        portfolioData,
        savedProgramsData,
        eventsData,
      ] = await Promise.all([
        getProfile(userId),
        supabase.from("user_interests").select("*").eq("user_id", userId),
        supabase.from("career_goals").select("*").eq("user_id", userId),
        supabase
          .from("student_journeys")
          .select("*")
          .eq("student_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .maybeSingle(),
        supabase
          .from("score_events")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("student_portfolio_items")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("saved_programs")
          .select("id,user_id,program_id,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_events")
          .select("id,user_id,event_type,event_data,session_id,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (cancelled) return;

      setProfile(profileData);
      setInterests((interestsData.data as InterestCategory[] | null) ?? []);
      setCareers((careersData.data as CareerGoal[] | null) ?? []);

      const scoreEvents = (scoreEventsData.data as any[]) || [];

      // Compute ikigai scores from journey, or fall back to latest score event
      const journey = journeyData.data as any;
      if (journey?.scores) {
        const s = journey.scores;
        const passion = s.passion || 0;
        const mission = s.future || 0;
        const profession = s.world || 0;
        const vocation = Math.round((passion + mission + profession) / 3);
        setIkigaiScores({ passion, mission, profession, vocation });
        setHasScores(passion > 0 || mission > 0 || profession > 0);
      } else if (scoreEvents.length > 0) {
        const latestMeta = (scoreEvents[0].metadata as Record<string, number>) || {};
        const passion = latestMeta.passion || 0;
        const mission = latestMeta.mission || 0;
        const profession = latestMeta.profession || 0;
        const vocation =
          latestMeta.vocation ||
          Math.round((passion + mission + profession) / 3);
        setIkigaiScores({ passion, mission, profession, vocation });
        setHasScores(passion > 0 || mission > 0 || profession > 0);
      } else {
        setIkigaiScores(null);
        setHasScores(false);
      }

      // Build timeline from score events
      if (scoreEvents.length > 0) {
        const eventsByDate = new Map<string, any[]>();
        scoreEvents.forEach((event) => {
          const date = event.created_at.split("T")[0];
          if (!eventsByDate.has(date)) eventsByDate.set(date, []);
          eventsByDate.get(date)!.push(event);
        });
        const timeline = Array.from(eventsByDate.entries()).map(([date, events]) => {
          const meta = (events[0].metadata as Record<string, number>) || {};
          return {
            date,
            passion: meta.passion || 0,
            mission: meta.mission || 0,
            profession: meta.profession || 0,
            vocation: meta.vocation || 0,
          };
        });
        setScoreTimeline(timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      } else {
        setScoreTimeline([]);
      }

      setPortfolioCount((portfolioData.data as any[])?.length ?? 0);
      setSavedProgramsCount((savedProgramsData.data as any[])?.length ?? 0);
      setActivityEvents((eventsData.data as UserEvent[] | null) ?? []);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profileRefreshNonce]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleCreateProfile = () => {
    router.replace("/");
  };

  const handleBackfillIkigai = () => {
    if (backfillingScores) return;

    Alert.alert(
      isThai ? "รีคำนวณ Ikigai" : "Recompute Ikigai",
      isThai
        ? "ดึง reflections เก่าที่เคยบันทึกไว้กลับมาคิดคะแนน Ikigai อีกครั้งไหม?"
        : "Replay your older saved reflections into Ikigai scoring?",
      [
        { text: isThai ? "ยกเลิก" : "Cancel", style: "cancel" },
        {
          text: isThai ? "เริ่ม" : "Run",
          onPress: async () => {
            setBackfillingScores(true);
            try {
              const result = await backfillMissingIkigaiReflections(supabase);
              Alert.alert(
                isThai ? "เสร็จแล้ว" : "Done",
                result.processedCount > 0
                  ? isThai
                    ? `เพิ่ม reflections เก่าเข้า Ikigai แล้ว ${result.processedCount} รายการ`
                    : `Backfilled ${result.processedCount} older reflections into Ikigai.`
                  : isThai
                    ? "ไม่มี reflections เก่าที่ต้อง backfill แล้ว"
                    : "No older reflections needed backfill."
              );
              setProfileRefreshNonce((value) => value + 1);
            } catch (error) {
              Alert.alert(
                isThai ? "เกิดข้อผิดพลาด" : "Backfill failed",
                error instanceof Error ? error.message : String(error)
              );
            } finally {
              setBackfillingScores(false);
            }
          },
        },
      ]
    );
  };

  const isThai = appLanguage === "th";

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (isThai ? "นักสำรวจ" : "Explorer");
  const appVersion = Constants.expoConfig?.version ?? "dev";
  const avatarSource = profile?.avatar_url
    ? { uri: profile.avatar_url }
    : require("../../assets/images/user_avatar.png");
  const metaPills = useMemo(() => buildProfileMetaPills(profile), [profile]);
  const focusSections = useMemo(
    () => buildFocusSections(careers, interests),
    [careers, interests],
  );
  const activityItems = useMemo(
    () => buildRecentActivityItems(activityEvents).slice(0, 6),
    [activityEvents],
  );
  const primaryCareer = focusSections.find(
    (section) => section.kind === "career-goals",
  )?.items[0];

  const t = {
    heroSummary: {
      workingToward: isThai
        ? (primaryCareer: string) => `มุ่งสู่ ${primaryCareer}`
        : (primaryCareer: string) => `Working toward ${primaryCareer}`,
      addCareerGoal: isThai
        ? "เพิ่มเป้าหมายอาชีพเพื่อให้โปรไฟล์สะท้อนที่คุณต้องการไป"
        : "Add a career goal to make your profile reflect where you want to go.",
    },
    emptyHero: {
      title: isThai ? "ยังไม่มีทิศทางที่บันทึกไว้" : "No direction saved yet",
      body: isThai
        ? "เริ่มสำรวจอาชีพเพื่อให้หน้านี้สะท้อนสิ่งที่คุณอยากเป็น"
        : "Start exploring careers so this page can reflect what you actually want to become.",
      cta: isThai ? "สำรวจอาชีพ" : "Explore Careers",
    },
    ikigaiSection: {
      title: isThai ? "เข็มทิศ Ikigai ของคุณ" : "Your Ikigai Compass",
      emptyTitle: isThai ? "ค้นพบ Ikigai ของคุณ" : "Discover Your Ikigai",
      emptyBody: isThai
        ? "ทำ Seeds และการสะท้อนคิดเพื่อเปิดเผยว่าความหลงใหล ภารกิจ อาชีพ และคุณสมบัติของคุณพัฒนาอย่างไร"
        : "Complete Seeds and reflections to reveal how your passion, mission, profession, and vocation are developing.",
      exploreCta: isThai ? "สำรวจ Seeds" : "Explore Seeds",
      scoreTrend: isThai ? "แนวโน้มคะแนน" : "Score Trend",
    },
    portfolioSection: {
      title: isThai ? "พอร์ตโฟลิโอและแผน" : "Portfolio & Plans",
      myPortfolio: {
        subtitle: (count: number) =>
          count > 0
            ? isThai
              ? `${pluralize(count, "รายการ", undefined, true)} พร้อมนำเสนอ`
              : `${pluralize(count, "item")} ready to show`
            : isThai
              ? "เพิ่มโครงการ รางวัล และกิจกรรมที่คุณต้องการเก็บไว้"
              : "Add projects, awards, and activities you want to keep.",
      },
      savedPrograms: {
        subtitle: (count: number) =>
          count > 0
            ? isThai
              ? `${pluralize(count, "สาขา", undefined, true)} บันทึกไว้`
              : `${pluralize(count, "program")} saved for later`
            : isThai
              ? "ติดตามสาขาที่คุณต้องการกลับมาดู"
              : "Keep track of programs you want to revisit.",
      },
      tcasFit: {
        subtitle: (count: number) =>
          count > 0
            ? isThai
              ? "ดูว่าพอร์ตโฟลิโอของคุณสอดคล้องกับสาขารอบ Portfolio อย่างไร"
              : "See how your portfolio aligns with Portfolio-round programs."
            : isThai
              ? "เพิ่มหลักฐานพอร์ตโฟลิโอเพื่อให้สัญญาณความเหมาะสมมีประโยชน์มากขึ้น"
              : "Add portfolio evidence to make your fit signals more useful.",
      },
    },
    activitySection: {
      title: isThai ? "กิจกรรมล่าสุด" : "Recent Activity",
      emptyTitle: isThai ? "ยังไม่มีกิจกรรมล่าสุด" : "No recent activity yet",
      emptyBody: isThai
        ? "เมื่อคุณเลือกความสนใจ เพิ่มรายการพอร์ตโฟลิโอ บันทึกสาขา และสร้างเส้นทาง กิจกรรมจริงของคุณจะปรากฏที่นี่"
        : "As you choose interests, add portfolio items, save programs, and build paths, your real activity will show up here.",
      emptyCta: isThai ? "สำรวจ" : "Explore",
    },
    signOut: isThai ? "ออกจากระบบ" : "Sign out",
  };

  const guestCopy =
    appLanguage === "th"
      ? {
          title: "เริ่มต้นเส้นทางของคุณ",
          benefits: [
            "บันทึกความคืบหน้าในทุกเส้นทางอาชีพ",
            "ติดตามคะแนน Ikigai และการพัฒนาทักษะของคุณ",
            "ปลดล็อกความสำเร็จและโอกาสใหม่ ๆ",
            "สร้างพอร์ตสำหรับยื่น TCAS และมหาวิทยาลัย",
          ],
          cta: "สร้างโปรไฟล์",
          secondary: "มีบัญชีอยู่แล้ว? เข้าสู่ระบบเพื่อไปต่อ",
        }
      : {
          title: "Start Your Journey",
          benefits: [
            "Save your progress across all career paths",
            "Track your Ikigai scores and skill development",
            "Unlock achievements and new opportunities",
            "Build your portfolio for TCAS university applications",
          ],
          cta: "Create Profile",
          secondary: "Already have an account? Sign in to continue",
        };

  if (!authLoading && (isGuest || !user)) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.guestContainer}>
          <View style={styles.guestContent}>
            <View style={styles.guestIconContainer}>
              <Text style={styles.guestIcon}>🌱</Text>
            </View>

            <Text variant="bold" style={styles.guestTitle}>{guestCopy.title}</Text>

            <View style={styles.guestBenefits}>
              {["🎯", "📊", "🏆", "📁"].map((emoji, index) => (
                <View key={emoji} style={styles.guestBenefitItem}>
                  <Text style={styles.guestBenefitEmoji}>{emoji}</Text>
                  <Text style={styles.guestBenefitText}>
                    {guestCopy.benefits[index]}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.guestCtaBtn,
                pressed && styles.guestCtaBtnPressed,
              ]}
              onPress={handleCreateProfile}
            >
              <Text variant="bold" style={styles.guestCtaBtnText}>{guestCopy.cta}</Text>
            </Pressable>

            <Text style={styles.guestSecondaryText}>{guestCopy.secondary}</Text>
          </View>

          <View style={styles.guestVersionContainer}>
            <Text style={styles.versionText}>Version {appVersion}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <LinearGradient
            colors={["#FFFFFF", "#F8F5FF", "#EEF4FF"]}
            style={styles.heroCard}
          >
            <Pressable
              style={({ pressed }) => [
                styles.settingsBtn,
                pressed && styles.settingsBtnPressed,
              ]}
              onPress={() => router.push("/settings")}
            >
              <Text style={styles.settingsBtnText}>⚙️</Text>
            </Pressable>

            <View style={styles.headerRow}>
              <View style={styles.avatarContainer}>
                <Image
                  source={avatarSource}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.headerInfo}>
                <Text variant="bold" style={styles.name}>{displayName}</Text>
                <Text style={styles.heroSummary}>
                  {primaryCareer
                    ? t.heroSummary.workingToward(primaryCareer)
                    : t.heroSummary.addCareerGoal}
                </Text>
              </View>
            </View>

            {metaPills.length > 0 && (
              <View style={styles.metaPillsRow}>
                {metaPills.map((pill) => (
                  <MetaPill key={pill} label={pill} />
                ))}
              </View>
            )}

            {focusSections.length > 0 ? (
              <FocusSectionsCarousel sections={focusSections} />
            ) : (
              <EmptyHeroState
                onPress={() => router.push("/discover")}
                title={t.emptyHero.title}
                body={t.emptyHero.body}
                cta={t.emptyHero.cta}
              />
            )}
          </LinearGradient>

          <HackathonHeroCard isThai={isThai} />

          <View style={styles.sectionContainer}>
            <Text variant="bold" style={styles.sectionTitle}>{t.ikigaiSection.title}</Text>

            {hasScores && ikigaiScores ? (
              <>
                <View style={styles.ikigaiGrid}>
                  {Object.values(buildIkigaiData(ikigaiScores, isThai)).map((pillar) => (
                    <IkigaiCell key={pillar.label} pillar={pillar} />
                  ))}
                </View>

                {scoreTimeline.length > 1 && (
                  <View style={styles.timelineContainer}>
                    <Text style={styles.timelineTitle}>{t.ikigaiSection.scoreTrend}</Text>
                    <ScoreTimeline timeline={scoreTimeline} isThai={isThai} />
                  </View>
                )}

                <View style={styles.insightCard}>
                  <Text style={styles.insightText}>
                    💡 {getIkigaiInsight(ikigaiScores, isThai)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyScoresContainer}>
                <Text style={styles.emptyScoresEmoji}>🌱</Text>
                <Text variant="bold" style={styles.emptyScoresTitle}>{t.ikigaiSection.emptyTitle}</Text>
                <Text style={styles.emptyScoresText}>
                  {t.ikigaiSection.emptyBody}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.exploreSeedsBtn,
                    pressed && styles.exploreSeedsBtnPressed,
                  ]}
                  onPress={() => router.push("/discover")}
                >
                  <Text style={styles.exploreSeedsBtnText}>{t.ikigaiSection.exploreCta}</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.sectionContainer}>
            <Text variant="bold" style={styles.sectionTitle}>{t.portfolioSection.title}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.actionRowPressed,
              ]}
              onPress={() => router.push("/portfolio")}
            >
              <Text style={styles.actionRowEmoji}>📁</Text>
              <View style={styles.actionRowContent}>
                <Text style={styles.actionRowTitle}>
                  {isThai ? "พอร์ตโฟลิโอของฉัน" : "My Portfolio"}
                </Text>
                <Text style={styles.actionRowSubtitle}>
                  {t.portfolioSection.myPortfolio.subtitle(portfolioCount)}
                </Text>
              </View>
              <Text style={styles.actionRowArrow}>›</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.actionRowPressed,
              ]}
              onPress={() => router.push("/saved")}
            >
              <Text style={styles.actionRowEmoji}>📚</Text>
              <View style={styles.actionRowContent}>
                <Text style={styles.actionRowTitle}>
                  {isThai ? "สาขาที่บันทึกไว้" : "Saved Programs"}
                </Text>
                <Text style={styles.actionRowSubtitle}>
                  {t.portfolioSection.savedPrograms.subtitle(savedProgramsCount)}
                </Text>
              </View>
              <Text style={styles.actionRowArrow}>›</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.actionRowPressed,
              ]}
              onPress={() => router.push("/fit")}
            >
              <Text style={styles.actionRowEmoji}>🎯</Text>
              <View style={styles.actionRowContent}>
                <Text style={styles.actionRowTitle}>
                  {isThai ? "ความเหมาะสม TCAS1" : "TCAS Fit"}
                </Text>
                <Text style={styles.actionRowSubtitle}>
                  {t.portfolioSection.tcasFit.subtitle(portfolioCount)}
                </Text>
              </View>
              <Text style={styles.actionRowArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.sectionContainer}>
            <Text variant="bold" style={styles.sectionTitle}>{t.activitySection.title}</Text>

            {activityItems.length > 0 ? (
              <View style={styles.activityList}>
                {activityItems.map((item) => (
                  <ActivityCard key={item.id} item={item} isThai={isThai} />
                ))}
              </View>
            ) : (
              <EmptySectionState
                title={t.activitySection.emptyTitle}
                body={t.activitySection.emptyBody}
                cta={t.activitySection.emptyCta}
                onPress={() => router.push("/discover")}
              />
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.signOutBtn,
              pressed && styles.signOutBtnPressed,
            ]}
            onPress={handleSignOut}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.signOutText,
                  pressed && styles.signOutTextPressed,
                ]}
              >
                {t.signOut}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={styles.versionContainer}
          onLongPress={handleBackfillIkigai}
          delayLongPress={800}
        >
          <Text style={styles.versionText}>
            Version {appVersion}
            {backfillingScores ? (isThai ? " · กำลังรีคำนวณ..." : " · recomputing...") : ""}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ScoreTimeline({ timeline, isThai }: { timeline: ScoreTimelineItem[]; isThai?: boolean }) {
  const recentTimeline = timeline.slice(-7);
  const maxScore = 100;

  const labels = {
    passion: isThai ? "ความหลงใหล" : "Passion",
    mission: isThai ? "ภารกิจ" : "Mission",
    profession: isThai ? "อาชีพ" : "Profession",
    vocation: isThai ? "คุณสมบัติ" : "Vocation",
  };

  return (
    <View style={styles.timelineWrapper}>
      <View style={styles.timelineChart}>
        {recentTimeline.map((item) => {
          const passionHeight = (item.passion / maxScore) * 100;
          const missionHeight = (item.mission / maxScore) * 100;
          const professionHeight = (item.profession / maxScore) * 100;
          const vocationHeight = (item.vocation / maxScore) * 100;

          return (
            <View key={item.date} style={styles.timelineColumn}>
              <View style={styles.timelineBars}>
                <View
                  style={[
                    styles.timelineBar,
                    styles.timelineBarPassion,
                    { height: `${passionHeight}%` },
                  ]}
                />
                <View
                  style={[
                    styles.timelineBar,
                    styles.timelineBarMission,
                    { height: `${missionHeight}%` },
                  ]}
                />
                <View
                  style={[
                    styles.timelineBar,
                    styles.timelineBarProfession,
                    { height: `${professionHeight}%` },
                  ]}
                />
                <View
                  style={[
                    styles.timelineBar,
                    styles.timelineBarVocation,
                    { height: `${vocationHeight}%` },
                  ]}
                />
              </View>
              <Text style={styles.timelineDate}>
                {new Date(item.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.timelineLegend}>
        <LegendDot color="#EF4444" label={labels.passion} />
        <LegendDot color="#3B82F6" label={labels.mission} />
        <LegendDot color="#10B981" label={labels.profession} />
        <LegendDot color="#F59E0B" label={labels.vocation} />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.timelineLegendItem}>
      <View style={[styles.timelineLegendDot, { backgroundColor: color }]} />
      <Text style={styles.timelineLegendText}>{label}</Text>
    </View>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

function FocusSectionsCarousel({ sections }: { sections: ProfileFocusSection[] }) {
  const renderSection = ({ item: section }: { item: ProfileFocusSection }) => {
    const isCareer = section.kind === "career-goals";
    return (
      <View
        style={[
          styles.focusCard,
          isCareer ? styles.careerCard : styles.interestCard,
        ]}
      >
        <Text
          variant="bold"
          style={[
            styles.focusCardTitle,
            isCareer ? styles.careerCardTitle : styles.interestCardTitle,
          ]}
        >
          {section.title}
        </Text>
        <View style={styles.focusCardContent}>
          {section.items.slice(0, 3).map((item, idx) => (
            <Text
              key={`${section.kind}-${idx}`}
              style={[
                styles.focusCardItem,
                isCareer ? styles.careerCardItem : styles.interestCardItem,
              ]}
              numberOfLines={1}
            >
              {item}
            </Text>
          ))}
          {section.items.length > 3 && (
            <Text style={styles.focusCardMore}>
              +{section.items.length - 3} more
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={sections}
      renderItem={renderSection}
      keyExtractor={(item) => item.kind}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.focusCarouselContent}
      ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
    />
  );
}

function EmptyHeroState({
  title,
  body,
  cta,
  onPress,
}: {
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.emptyHeroState}>
      <Text variant="bold" style={styles.emptyHeroTitle}>{title}</Text>
      <Text style={styles.emptyHeroBody}>{body}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.inlineCtaButton,
          pressed && styles.inlineCtaButtonPressed,
        ]}
        onPress={onPress}
      >
        <Text style={styles.inlineCtaText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

function EmptySectionState({
  title,
  body,
  cta,
  onPress,
}: {
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.emptySectionState}>
      <Text variant="bold" style={styles.emptySectionTitle}>{title}</Text>
      <Text style={styles.emptySectionBody}>{body}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.inlineCtaButton,
          pressed && styles.inlineCtaButtonPressed,
        ]}
        onPress={onPress}
      >
        <Text style={styles.inlineCtaText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

function ActivityCard({ item, isThai = false }: { item: ProfileActivityItem; isThai?: boolean }) {
  return (
    <View style={styles.activityCard}>
      <Text style={styles.activityIcon}>{item.icon}</Text>
      <View style={styles.activityBody}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        {item.detail.length > 0 && (
          <Text style={styles.activityDetail}>{item.detail}</Text>
        )}
      </View>
      <Text style={styles.activityTime}>{formatActivityTime(item.created_at, isThai)}</Text>
    </View>
  );
}

function IkigaiCell({ pillar }: { pillar: IkigaiPillar }) {
  const pct = pillar.score;
  const fillColor = pct >= 75 ? "#10B981" : pct >= 50 ? "#8B5CF6" : "#F59E0B";

  return (
    <View style={styles.ikigaiCell}>
      <View style={styles.ikigaiCellHeader}>
        <Text style={styles.ikigaiEmoji}>{pillar.emoji}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.ikigaiDeepBtn,
            pressed && styles.ikigaiDeepBtnPressed,
          ]}
          onPress={() => router.push(pillar.route as any)}
        >
          <Text style={styles.ikigaiDeepBtnText}>›</Text>
        </Pressable>
      </View>
      <Text variant="bold" style={styles.ikigaiLabel}>{pillar.label}</Text>
      <Text style={styles.ikigaiDescription}>{pillar.description}</Text>
      <View style={styles.ikigaiBarBg}>
        <View
          style={[
            styles.ikigaiBarFill,
            { width: `${pct}%` as const, backgroundColor: fillColor },
          ]}
        />
      </View>
      <Text variant="bold" style={[styles.ikigaiScore, { color: fillColor }]}>{pct}</Text>
      <Text style={styles.ikigaiInsight}>{pillar.insight}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  guestContainer: {
    flex: 1,
    backgroundColor: PageBg.default,
  },
  guestContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  guestIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#CECECE",
  },
  guestIcon: {
    fontSize: 48,
  },
  guestTitle: {
    fontSize: 28,
    
    
    color: "#111827",
    marginBottom: 32,
    textAlign: "center",
  },
  guestBenefits: {
    width: "100%",
    gap: 12,
    marginBottom: 40,
  },
  guestBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  guestBenefitEmoji: {
    fontSize: 24,
  },
  guestBenefitText: {
    flex: 1,
    fontSize: 14,
    
    color: "#374151",
    lineHeight: 20,
  },
  guestCtaBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: Accent.yellow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  guestCtaBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  guestCtaBtnText: {
    fontSize: 16,
    
    
    color: "#111827",
  },
  guestSecondaryText: {
    fontSize: 14,
    
    color: "#6B7280",
    textAlign: "center",
  },
  guestVersionContainer: {
    paddingBottom: 40,
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 160,
  },
  mainContent: {
    paddingBottom: 24,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 56,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
    gap: 16,
  },
  settingsBtn: {
    position: "absolute",
    right: 20,
    top: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEE",
    zIndex: 10,
  },
  settingsBtnPressed: {
    backgroundColor: "#F5F5F5",
  },
  settingsBtnText: {
    fontSize: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
    paddingRight: 52,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: "rgba(139,92,246,0.15)",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 28,
    
    
    color: "#111827",
  },
  heroSummary: {
    fontSize: 14,
    
    color: "#4B5563",
    lineHeight: 20,
  },
  metaPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  focusStack: {
    gap: 6,
  },
  focusSection: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  focusCarouselContent: {
    paddingVertical: 4,
  },
  focusCard: {
    width: 160,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  careerCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  interestCard: {
    backgroundColor: "#FAFAFA",
    borderColor: "rgba(139, 92, 246, 0.15)",
  },
  focusCardTitle: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  careerCardTitle: {
    color: "#059669",
  },
  interestCardTitle: {
    color: "#7C3AED",
  },
  focusCardContent: {
    gap: 6,
  },
  focusCardItem: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  careerCardItem: {
    color: "#111827",
  },
  interestCardItem: {
    color: "#374151",
  },
  focusCardMore: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  focusSectionPrimary: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.18)",
  },
  focusSectionSecondary: {
    backgroundColor: "rgba(139, 92, 246, 0.06)",
    borderColor: "rgba(139, 92, 246, 0.14)",
  },
  focusSectionLabel: {
    fontSize: 11,
    
    
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  focusSectionLabelPrimary: {
    color: "#0F766E",
  },
  focusSectionLabelSecondary: {
    color: "#7C3AED",
  },
  focusChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  focusChip: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  careerChip: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(16, 185, 129, 0.18)",
    shadowColor: "rgba(16, 185, 129, 0.20)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  interestChip: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(139, 92, 246, 0.14)",
  },
  focusChipText: {
    
    fontWeight: "600",
  },
  careerChipText: {
    fontSize: 14,
    color: "#047857",
  },
  interestChipText: {
    fontSize: 12,
    color: "#6D28D9",
  },
  emptyHeroState: {
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 4,
  },
  emptyHeroTitle: {
    fontSize: 18,
    
    
    color: "#111827",
  },
  emptyHeroBody: {
    fontSize: 14,
    
    color: "#4B5563",
    lineHeight: 20,
  },
  inlineCtaButton: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inlineCtaButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  inlineCtaText: {
    fontSize: 13,
    
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    
    
    color: "#9CA3AF",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  ikigaiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ikigaiCell: {
    width: "47.5%",
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 14,
    gap: 4,
  },
  ikigaiCellHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  ikigaiDeepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  ikigaiDeepBtnPressed: {
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  ikigaiDeepBtnText: {
    fontSize: 18,
    color: "#6B7280",
    lineHeight: 22,
    marginLeft: 2,
  },
  ikigaiEmoji: {
    fontSize: 22,
  },
  ikigaiLabel: {
    fontSize: 14,
    
    
    color: "#111827",
  },
  ikigaiDescription: {
    fontSize: 11,
    
    color: "#9CA3AF",
    marginBottom: 6,
  },
  ikigaiBarBg: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  ikigaiBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  ikigaiScore: {
    fontSize: 20,
    
    
    marginTop: 4,
  },
  ikigaiInsight: {
    fontSize: 11,
    
    color: "#6B7280",
    lineHeight: 16,
    marginTop: 6,
  },
  timelineContainer: {
    marginTop: 20,
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 12,
    
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
  },
  timelineWrapper: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  timelineChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
    marginBottom: 12,
  },
  timelineColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  timelineBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
    height: 80,
  },
  timelineBar: {
    width: 4,
    borderRadius: 2,
  },
  timelineBarPassion: {
    backgroundColor: "#EF4444",
  },
  timelineBarMission: {
    backgroundColor: "#3B82F6",
  },
  timelineBarProfession: {
    backgroundColor: "#10B981",
  },
  timelineBarVocation: {
    backgroundColor: "#F59E0B",
  },
  timelineDate: {
    fontSize: 9,
    
    color: "#9CA3AF",
  },
  timelineLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
    flexWrap: "wrap",
  },
  timelineLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timelineLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineLegendText: {
    fontSize: 10,
    
    color: "#6B7280",
  },
  insightCard: {
    marginTop: 12,
    backgroundColor: "rgba(139, 92, 246, 0.06)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.12)",
  },
  insightText: {
    fontSize: 13,
    
    color: "#4B5563",
    lineHeight: 20,
  },
  emptyScoresContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyScoresEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyScoresTitle: {
    fontSize: 20,
    
    
    color: "#111827",
    marginBottom: 8,
  },
  emptyScoresText: {
    fontSize: 14,
    
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  exploreSeedsBtn: {
    backgroundColor: Accent.yellow,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreSeedsBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  exploreSeedsBtnText: {
    fontSize: 14,
    
    fontWeight: "600",
    color: "#111827",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  actionRowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  actionRowEmoji: {
    fontSize: 24,
  },
  actionRowContent: {
    flex: 1,
    gap: 2,
  },
  actionRowTitle: {
    fontSize: 14,
    
    fontWeight: "600",
    color: "#111827",
  },
  actionRowSubtitle: {
    fontSize: 11,
    
    color: "#9CA3AF",
    lineHeight: 16,
  },
  actionRowArrow: {
    fontSize: 20,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  activityList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  activityIcon: {
    fontSize: 22,
  },
  activityBody: {
    flex: 1,
    gap: 3,
  },
  activityTitle: {
    fontSize: 13,
    
    fontWeight: "600",
    color: "#374151",
  },
  activityDetail: {
    fontSize: 12,
    
    color: "#6B7280",
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    
    color: "#9CA3AF",
  },
  emptySectionState: {
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  emptySectionTitle: {
    fontSize: 18,
    
    
    color: "#111827",
  },
  emptySectionBody: {
    fontSize: 14,
    
    color: "#6B7280",
    lineHeight: 20,
  },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutBtnPressed: {
    backgroundColor: "#F9FAFB",
  },
  signOutText: {
    fontSize: 14,
    
    fontWeight: "500",
    color: "#9CA3AF",
  },
  signOutTextPressed: {
    color: "#6B7280",
  },
  versionContainer: {
    marginTop: "auto",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  versionText: {
    fontSize: 12,
    
    color: "#D1D5DB",
    letterSpacing: 0.2,
  },
});
