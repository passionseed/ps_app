import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { PathLabSkiaLoader } from "../../components/PathLabSkiaLoader";
import { supabase } from "../../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type RawPerson = { title: string; url: string };
type RawCompany = { title: string; url: string };
type RawNews = { title: string; url: string; publishedDate: string | null; snippet: string };

type Person = { name: string; role: string; initials: string; url: string };
type Company = { name: string; domain: string; url: string };
type NewsItem = { title: string; url: string; source: string; snippet: string; ago: string };

type Insights = { people: Person[]; companies: Company[]; news: NewsItem[] };

type JobData = {
  id: string;
  title: string;
  rank: number | null;
  category: string | null;
  industry: string | null;
  viability_score: number | null;
  demand_trend: string | null;
  automation_risk: number | null;
  median_salary: number | null;
  salary_range_thb: any | null;
  growth_rate: string | null;
  evolution_2035: string | null;
  required_degrees: string[] | null;
  required_skills: string[] | null;
  stress_level: number | null;
  work_life_balance: number | null;
};

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aiRiskColor(risk: number | null): string {
  if (risk == null) return "#9CA3AF";
  if (risk <= 0.25) return "#10B981";
  if (risk <= 0.45) return "#F59E0B";
  if (risk <= 0.65) return "#F97316";
  return "#EF4444";
}

function aiRiskLabel(risk: number | null): string {
  if (risk == null) return "Unknown";
  if (risk <= 0.1) return "Very Low";
  if (risk <= 0.25) return "Low";
  if (risk <= 0.45) return "Medium";
  if (risk <= 0.65) return "High";
  return "Very High";
}

function demandLabel(trend: string | null): string {
  if (trend === "growing") return "Growing";
  if (trend === "declining") return "Declining";
  return "Stable";
}

function demandColor(trend: string | null): string {
  if (trend === "growing") return "#10B981";
  if (trend === "declining") return "#EF4444";
  return "#9CA3AF";
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CareerDetailScreen() {
  const { name } = useLocalSearchParams();
  const rawCareerName = typeof name === "string" ? decodeURIComponent(name) : "";
  const careerName = rawCareerName.split("(")[0].trim();

  const [insights, setInsights] = useState<Insights | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch job data and insights in parallel
        const [jobResult, insightsResult] = await Promise.all([
          supabase
            .from("jobs")
            .select(
              "id, title, rank, category, industry, viability_score, demand_trend, automation_risk, median_salary, salary_range_thb, growth_rate, evolution_2035, required_degrees, required_skills, stress_level, work_life_balance",
            )
            .ilike("title", `%${careerName}%`)
            .limit(1)
            .single(),
          supabase.functions.invoke("career-insights", {
            body: { careerName },
          }),
        ]);

        if (cancelled) return;

        const { data: jobData, error: jobError } = jobResult;
        if (jobError && jobError.code !== "PGRST116") throw jobError;
        setJob(jobData as JobData | null);

        const { data: insightsData, error: fnError } = insightsResult;
        if (fnError) throw fnError;
        setInsights({
          people: (insightsData.people as RawPerson[]).map(parsePerson),
          companies: (insightsData.companies as RawCompany[]).map(parseCompany),
          news: (insightsData.news as RawNews[]).map(parseNews),
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
          <Text style={s.backBtnText}>‹ Back</Text>
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
            <PathLabSkiaLoader size="large" />
            <Text style={s.loadingText}>Researching {careerName}…</Text>
          </View>
        ) : error ? (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable onPress={() => router.back()} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Go back</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ── Jobs Research Data ── */}
            {job ? (
              <>
                {/* At a Glance */}
                <Section title="At a Glance">
                  <View style={s.glanceGrid}>
                    {job.rank ? (
                      <GlanceCard
                        label="Rank"
                        value={`#${job.rank}`}
                        color="#0040F0"
                      />
                    ) : null}
                    {job.category ? (
                      <GlanceCard
                        label="Category"
                        value={job.category}
                        color="#7C3AED"
                      />
                    ) : null}
                    <GlanceCard
                      label="Demand"
                      value={demandLabel(job.demand_trend)}
                      color={demandColor(job.demand_trend)}
                    />
                    {job.viability_score != null ? (
                      <GlanceCard
                        label="Viability"
                        value={`${job.viability_score}/100`}
                        color={
                          job.viability_score >= 75
                            ? "#10B981"
                            : job.viability_score >= 60
                              ? "#F59E0B"
                              : "#EF4444"
                        }
                      />
                    ) : null}
                  </View>
                </Section>

                {/* Salary */}
                {((job.median_salary != null && job.median_salary > 0) ||
                  job.salary_range_thb) ? (
                  <Section title="Salary">
                    <View style={s.salaryRow}>
                      {job.median_salary != null && job.median_salary > 0 ? (
                        <View style={s.salaryCard}>
                          <Text style={s.salaryValue}>
                            ${job.median_salary.toLocaleString()}
                          </Text>
                          <Text style={s.salaryLabel}>US Median / year</Text>
                        </View>
                      ) : null}
                      {job.salary_range_thb ? (
                        <View style={s.salaryCard}>
                          <Text style={s.salaryValue}>
                            ฿
                            {job.salary_range_thb.min_monthly?.toLocaleString() ||
                              "?"}{" "}
                            – ฿
                            {job.salary_range_thb.max_monthly?.toLocaleString() ||
                              "?"}
                          </Text>
                          <Text style={s.salaryLabel}>Thai Monthly Range</Text>
                        </View>
                      ) : null}
                    </View>
                  </Section>
                ) : null}

                {/* Growth & AI Risk */}
                <Section title="Growth & AI Risk">
                  <View style={s.growthRow}>
                    {job.growth_rate ? (
                      <View style={s.growthCard}>
                        <Text style={s.growthValue}>{job.growth_rate}</Text>
                        <Text style={s.growthLabel}>Growth Rate</Text>
                      </View>
                    ) : null}
                    <View style={s.riskCard}>
                      <View
                        style={[
                          s.riskMeter,
                          { backgroundColor: aiRiskColor(job.automation_risk) + "20" },
                        ]}
                      >
                        <View
                          style={[
                            s.riskMeterFill,
                            {
                              width: `${(job.automation_risk ?? 0) * 100}%`,
                              backgroundColor: aiRiskColor(job.automation_risk),
                            },
                          ]}
                        />
                      </View>
                      <Text style={s.riskValue}>
                        {aiRiskLabel(job.automation_risk)} ({(job.automation_risk ?? 0) * 100}%)
                      </Text>
                      <Text style={s.riskLabel}>AI Automation Risk</Text>
                    </View>
                  </View>
                </Section>

                {/* Future with AI */}
                {job.evolution_2035 ? (
                  <Section title="Future with AI">
                    <View style={s.futureCard}>
                      <Text style={s.futureText}>{job.evolution_2035}</Text>
                    </View>
                  </Section>
                ) : null}

                {/* Skills */}
                {job.required_skills && job.required_skills.length > 0 ? (
                  <Section title="Key Skills">
                    <View style={s.skillsWrap}>
                      {job.required_skills.map((sk, i) => (
                        <View key={i} style={s.skillTag}>
                          <Text style={s.skillTagText}>{sk}</Text>
                        </View>
                      ))}
                    </View>
                  </Section>
                ) : null}
              </>
            ) : null}

            {/* Divider */}
            {job && insights ? <View style={s.divider} /> : null}

            {/* People */}
            {insights ? (
              <>
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
                        <Pressable
                          key={i}
                          style={s.personCard}
                          onPress={() => open(p.url)}
                        >
                          <View style={s.avatar}>
                            <Text style={s.avatarText}>{p.initials}</Text>
                          </View>
                          <Text style={s.personName} numberOfLines={2}>
                            {p.name}
                          </Text>
                          {p.role ? (
                            <Text style={s.personRole} numberOfLines={3}>
                              {p.role}
                            </Text>
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
                          style={({ pressed }) => [
                            s.companyCard,
                            pressed && s.pressed,
                          ]}
                          onPress={() => open(c.url)}
                        >
                          <Text style={s.companyName} numberOfLines={2}>
                            {c.name}
                          </Text>
                          {c.domain ? (
                            <Text style={s.companyDomain} numberOfLines={1}>
                              {c.domain}
                            </Text>
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
                          style={({ pressed }) => [
                            s.newsCard,
                            pressed && s.pressed,
                          ]}
                          onPress={() => open(n.url)}
                        >
                          <View style={s.newsTopRow}>
                            {n.source ? (
                              <View style={s.sourceBadge}>
                                <Text style={s.sourceBadgeText}>
                                  {n.source.toUpperCase()}
                                </Text>
                              </View>
                            ) : null}
                            {n.ago ? (
                              <Text style={s.newsAgo}>{n.ago}</Text>
                            ) : null}
                          </View>
                          <Text style={s.newsTitle} numberOfLines={3}>
                            {n.title}
                          </Text>
                          {n.snippet ? (
                            <Text style={s.newsSnippet} numberOfLines={2}>
                              {n.snippet}
                            </Text>
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlanceCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={s.glanceCard}>
      <Text style={[s.glanceValue, { color }]}>{value}</Text>
      <Text style={s.glanceLabel}>{label}</Text>
    </View>
  );
}

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
    fontFamily: "LibreFranklin_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "LibreFranklin_400Regular",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 24 },

  // States
  loadingWrap: { alignItems: "center", paddingTop: 60, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: "LibreFranklin_400Regular", color: "#666" },
  errorWrap: { alignItems: "center", paddingTop: 60, gap: 16, paddingHorizontal: 32 },
  errorText: { fontSize: 14, fontFamily: "LibreFranklin_400Regular", color: "#999", textAlign: "center" },
  retryBtn: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { fontSize: 14, fontFamily: "LibreFranklin_400Regular", color: "#666" },

  // Section
  section: { marginBottom: 32, paddingHorizontal: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionAccent: { width: 3, height: 16, backgroundColor: "#BFFF00", borderRadius: 2 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: "#111",
    letterSpacing: 1.5,
  },

  // At a Glance
  glanceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  glanceCard: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  glanceValue: {
    fontSize: 16,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
  },
  glanceLabel: {
    fontSize: 10,
    fontFamily: "LibreFranklin_400Regular",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Salary
  salaryRow: { gap: 10 },
  salaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  salaryValue: {
    fontSize: 18,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: "#111827",
  },
  salaryLabel: {
    fontSize: 10,
    fontFamily: "LibreFranklin_400Regular",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Growth & AI Risk
  growthRow: { gap: 10 },
  growthCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  growthValue: {
    fontSize: 15,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: "#10B981",
    textAlign: "center",
  },
  growthLabel: {
    fontSize: 10,
    fontFamily: "LibreFranklin_400Regular",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  riskCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  riskMeter: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  riskMeterFill: { height: "100%", borderRadius: 4 },
  riskValue: {
    fontSize: 15,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: "#111827",
  },
  riskLabel: {
    fontSize: 10,
    fontFamily: "LibreFranklin_400Regular",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Future with AI
  futureCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgb(206, 206, 206)",
    padding: 16,
  },
  futureText: {
    fontSize: 14,
    fontFamily: "LibreFranklin_400Regular",
    color: "#374151",
    lineHeight: 22,
  },

  // Skills
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillTag: {
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skillTagText: {
    fontSize: 12,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
    color: "#0040F0",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "rgb(206, 206, 206)",
    marginHorizontal: 24,
    marginBottom: 32,
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
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: "#BFFF00",
  },
  personName: {
    fontSize: 13,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
    color: "#111827",
    lineHeight: 18,
  },
  personRole: {
    fontSize: 11,
    fontFamily: "LibreFranklin_400Regular",
    color: "#6B7280",
    lineHeight: 16,
    flexGrow: 1,
  },
  viewLink: { marginTop: 4 },
  viewLinkText: {
    fontSize: 12,
    fontFamily: "LibreFranklin_400Regular",
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
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
    color: "#111827",
  },
  companyDomain: {
    fontSize: 11,
    fontFamily: "LibreFranklin_400Regular",
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
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.5,
  },
  newsAgo: {
    fontSize: 11,
    fontFamily: "LibreFranklin_400Regular",
    color: "#6B7280",
  },
  newsTitle: {
    fontSize: 15,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
    color: "#111827",
    lineHeight: 22,
  },
  newsSnippet: {
    fontSize: 13,
    fontFamily: "LibreFranklin_400Regular",
    color: "#4B5563",
    lineHeight: 19,
  },
  readLink: {
    fontSize: 12,
    fontFamily: "LibreFranklin_400Regular",
    fontWeight: "600",
    color: "#0040F0",
    alignSelf: "flex-end",
  },

  // Misc
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  emptyNote: { paddingVertical: 20, alignItems: "center" },
  emptyNoteText: { fontSize: 13, fontFamily: "LibreFranklin_400Regular", color: "#bbb" },
});
