import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type RawPerson = { title: string; url: string };
type RawCompany = { title: string; url: string };
type RawNews = { title: string; url: string; publishedDate: string | null; snippet: string };

type Person = { name: string; role: string; initials: string; url: string };
type Company = { name: string; domain: string; url: string };
type NewsItem = { title: string; url: string; source: string; snippet: string; ago: string };

type Insights = { people: Person[]; companies: Company[]; news: NewsItem[] };

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parsePerson(r: RawPerson): Person {
  // LinkedIn title format: "First Last - Title at Co | LinkedIn"
  let raw = r.title.replace(/ \| LinkedIn.*$/i, "").trim();
  const dashIdx = raw.indexOf(" - ");
  let name = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw;
  let role = dashIdx > -1 ? raw.slice(dashIdx + 3).trim() : "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return { name, role, initials: initials || "?", url: r.url };
}

function parseCompany(r: RawCompany): Company {
  const name = r.title.split(" | ")[0].split(" - ")[0].trim();
  let domain = "";
  try {
    domain = new URL(r.url).hostname.replace(/^www\./, "");
  } catch {}
  return { name, domain, url: r.url };
}

function parseNews(r: RawNews): NewsItem {
  let source = "";
  try {
    const host = new URL(r.url).hostname.replace(/^www\./, "");
    source = host.split(".")[0];
    source = source.charAt(0).toUpperCase() + source.slice(1);
  } catch {}

  let ago = "";
  if (r.publishedDate) {
    const diff = Date.now() - new Date(r.publishedDate).getTime();
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(h / 24);
    ago = d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : "just now";
  }

  return { title: r.title, url: r.url, source, snippet: r.snippet, ago };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CareerDetailScreen() {
  const { name } = useLocalSearchParams();
  const rawCareerName = typeof name === "string" ? decodeURIComponent(name) : "";
  const careerName = rawCareerName.split("(")[0].trim();

  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "career-insights",
          { body: { careerName } },
        );
        if (cancelled) return;
        if (fnError) throw fnError;
        setInsights({
          people: (data.people as RawPerson[]).map(parsePerson),
          companies: (data.companies as RawCompany[]).map(parseCompany),
          news: (data.news as RawNews[]).map(parseNews),
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load insights");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [careerName]);

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Hero */}
      <LinearGradient
        colors={["rgb(0,22,81)", "rgb(0,64,240)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={s.heroTitle}>{careerName}</Text>
        <Text style={s.heroSub}>People · Companies · News</Text>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color="#BFFF00" size="large" />
            <Text style={s.loadingText}>Researching {careerName}…</Text>
          </View>
        ) : error ? (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable onPress={() => router.back()} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Go back</Text>
            </Pressable>
          </View>
        ) : insights ? (
          <>
            {/* People */}
            <Section title="People to Follow">
              {insights.people.length === 0 ? (
                <EmptyNote text="No profiles found" />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.hScroll}
                >
                  {insights.people.map((p, i) => (
                    <Pressable key={i} style={s.personCard} onPress={() => open(p.url)}>
                      <View style={s.avatar}>
                        <Text style={s.avatarText}>{p.initials}</Text>
                      </View>
                      <Text style={s.personName} numberOfLines={2}>{p.name}</Text>
                      {p.role ? (
                        <Text style={s.personRole} numberOfLines={3}>{p.role}</Text>
                      ) : null}
                      <View style={s.viewLink}>
                        <Text style={s.viewLinkText}>View →</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </Section>

            {/* Companies */}
            <Section title="Top Companies">
              {insights.companies.length === 0 ? (
                <EmptyNote text="No companies found" />
              ) : (
                <View style={s.companyGrid}>
                  {insights.companies.map((c, i) => (
                    <Pressable
                      key={i}
                      style={({ pressed }) => [s.companyCard, pressed && s.pressed]}
                      onPress={() => open(c.url)}
                    >
                      <Text style={s.companyName} numberOfLines={2}>{c.name}</Text>
                      {c.domain ? (
                        <Text style={s.companyDomain} numberOfLines={1}>{c.domain}</Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              )}
            </Section>

            {/* News */}
            <Section title="Industry News">
              {insights.news.length === 0 ? (
                <EmptyNote text="No recent news found" />
              ) : (
                <View style={s.newsList}>
                  {insights.news.map((n, i) => (
                    <Pressable
                      key={i}
                      style={({ pressed }) => [s.newsCard, pressed && s.pressed]}
                      onPress={() => open(n.url)}
                    >
                      <View style={s.newsTopRow}>
                        {n.source ? (
                          <View style={s.sourceBadge}>
                            <Text style={s.sourceBadgeText}>{n.source.toUpperCase()}</Text>
                          </View>
                        ) : null}
                        {n.ago ? <Text style={s.newsAgo}>{n.ago}</Text> : null}
                      </View>
                      <Text style={s.newsTitle} numberOfLines={3}>{n.title}</Text>
                      {n.snippet ? (
                        <Text style={s.newsSnippet} numberOfLines={2}>{n.snippet}</Text>
                      ) : null}
                      <Text style={s.readLink}>Read →</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Section>
          </>
        ) : null}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionAccent} />
        <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <View style={s.emptyNote}>
      <Text style={s.emptyNoteText}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },

  // Hero
  hero: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  backBtn: { marginBottom: 20, alignSelf: "flex-start" },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 24 },

  // States
  loadingWrap: { alignItems: "center", paddingTop: 60, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: "Orbit_400Regular", color: "#666" },
  errorWrap: { alignItems: "center", paddingTop: 60, gap: 16, paddingHorizontal: 32 },
  errorText: { fontSize: 14, fontFamily: "Orbit_400Regular", color: "#999", textAlign: "center" },
  retryBtn: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { fontSize: 14, fontFamily: "Orbit_400Regular", color: "#666" },

  // Section
  section: { marginBottom: 32, paddingHorizontal: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionAccent: { width: 3, height: 16, backgroundColor: "#BFFF00", borderRadius: 2 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111",
    letterSpacing: 1.5,
  },

  // People — horizontal scroll
  hScroll: { gap: 12, paddingRight: 24 },
  personCard: {
    width: 148,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgb(0,22,81)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#BFFF00",
  },
  personName: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111827",
    lineHeight: 18,
  },
  personRole: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
    lineHeight: 16,
    flexGrow: 1,
  },
  viewLink: { marginTop: 4 },
  viewLinkText: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#0040F0",
    fontWeight: "600",
  },

  // Companies — 2-col grid
  companyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  companyCard: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111827",
  },
  companyDomain: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
  },

  // News — vertical list
  newsList: { gap: 12 },
  newsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  newsTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sourceBadge: {
    backgroundColor: "#BFFF00",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontFamily: "Orbit_400Regular",
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.5,
  },
  newsAgo: {
    fontSize: 11,
    fontFamily: "Orbit_400Regular",
    color: "#6B7280",
  },
  newsTitle: {
    fontSize: 15,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111827",
    lineHeight: 22,
  },
  newsSnippet: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#4B5563",
    lineHeight: 19,
  },
  readLink: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#0040F0",
    alignSelf: "flex-end",
  },

  // Misc
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  emptyNote: { paddingVertical: 20, alignItems: "center" },
  emptyNoteText: { fontSize: 13, fontFamily: "Orbit_400Regular", color: "#bbb" },
});
