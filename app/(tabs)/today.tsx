import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AppText as Text } from "../../components/AppText";
import {
  Button,
  CampShell,
  Card,
  ErrorMessage,
  Field,
  styles,
  useCampAction,
  useCampCopy,
} from "../../components/shift/CampUI";
import { useShift } from "../../lib/shift-context";
import {
  myGroup,
  myProject,
  peerUpdates,
  shiftDay,
  SHIFT_DAYS,
  SHIFT_SKILLS,
} from "../../lib/shift-curriculum";

export default function Today() {
  const { snapshot: s } = useShift();
  const t = useCampCopy();
  const { run, busy, error } = useCampAction();
  const [help, setHelp] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const day = s ? shiftDay(s.cohort.starts_on) : 0;
  const current = Math.min(7, Math.max(1, day));
  const viewed = selectedDay ?? current;
  const milestone = SHIFT_DAYS[viewed - 1];
  const project = s ? myProject(s) : undefined;
  const group = s ? myGroup(s) : undefined;
  const label = (text: readonly [string, string]) => t(text[0], text[1]);
  return (
    <CampShell title={t("Today", "วันนี้")}>
      {s && (
        <>
          {s.is_staff && (
            <Button
              label={t("Mentor support queue", "ดูงานและคำขอความช่วยเหลือ")}
              onPress={() => router.push("/shift/mentor")}
            />
          )}
          <Card>
            <Text variant="bold" style={styles.heading}>
              {day < 1
                ? t("Your camp starts soon", "ค่ายกำลังจะเริ่ม")
                : day > 7
                  ? t("Keep building at your pace", "ทำต่อในจังหวะของเรา")
                  : `${t("Day", "วันที่")} ${current}: ${label(SHIFT_DAYS[current - 1].title)}`}
            </Text>
            <Text style={styles.body}>
              {day < 1
                ? `${t("Starts", "เริ่ม")} ${s.cohort.starts_on}. ${t("Meet your peers and share an introduction.", "ทำความรู้จักเพื่อนและแนะนำตัวได้เลย")}`
                : t(
                    "You choose the direction. These milestones help you test it in the real world.",
                    "เราเลือกทิศทางเอง หมุดหมายเหล่านี้ช่วยให้ได้ลองกับโลกจริง",
                  )}
            </Text>
            {!group && !s.is_staff && (
              <Button
                label={t("Find my group", "หากลุ่มของฉัน")}
                onPress={() => router.push("/(tabs)/group")}
              />
            )}
            {!s.introduced_at && (
              <Button
                secondary
                label={t("Introduce myself", "แนะนำตัว")}
                onPress={() => router.push("/shift/intro")}
              />
            )}
          </Card>
          {project ? (
            <Card>
              <Text style={styles.eyebrow}>
                {t("MY CURRENT FOCUS", "สิ่งที่กำลังทำ")}
              </Text>
              <Text variant="bold" style={styles.heading}>
                {project.title}
              </Text>
              <Text style={styles.body}>
                {project.scope ||
                  project.description ||
                  t(
                    "What small problem do you want to test?",
                    "อยากลองแก้ปัญหาเล็กๆ อะไร?",
                  )}
              </Text>
              <Button
                secondary
                label={t(
                  "Edit scope and choose skills",
                  "แก้โจทย์และเลือกสกิล",
                )}
                onPress={() => router.push("/shift/project")}
              />
            </Card>
          ) : (
            group && (
              <Card>
                <Text variant="bold" style={styles.heading}>
                  {t("What would you like to build?", "อยากสร้างอะไร?")}
                </Text>
                <Text style={styles.body}>
                  {t(
                    "Start solo or accept a project invitation from your group. Your peers are here either way.",
                    "เริ่มโปรเจกต์เอง หรือรับคำชวนทำโปรเจกต์จากเพื่อนในกลุ่ม เพื่อนพร้อมช่วยไม่ว่าเลือกแบบไหน",
                  )}
                </Text>
                <Button
                  label={t("Start my project", "เริ่มโปรเจกต์")}
                  onPress={() => router.push("/shift/project")}
                />
              </Card>
            )
          )}
          {day >= 1 && (
            <Card>
              <Text style={styles.eyebrow}>
                {t("A SUGGESTED NEXT STEP", "ก้าวต่อไปที่ลองได้")}
              </Text>
              <View style={styles.wrap}>
                {SHIFT_DAYS.map((_, i) => (
                  <Button
                    key={i}
                    secondary
                    selected={viewed === i + 1}
                    disabled={i + 1 > day}
                    label={String(i + 1)}
                    onPress={() => setSelectedDay(i + 1)}
                  />
                ))}
              </View>
              <Text variant="bold" style={styles.heading}>
                {label(milestone.title)}
              </Text>
              <Text style={styles.body}>{label(milestone.why)}</Text>
              <Text style={styles.body}>{label(milestone.action)}</Text>
              {viewed === 1 && (
                <Text style={styles.body}>
                  {t(
                    "No idea yet? Think of the last thing that frustrated you or someone around you. Who could you ask about it?",
                    "ยังไม่มีไอเดีย? นึกถึงสิ่งล่าสุดที่ทำให้เราหรือคนรอบตัวหงุดหงิด ใครเล่าเรื่องนี้ให้ฟังได้บ้าง?",
                  )}
                </Text>
              )}
              {project && (
                <Button
                  label={
                    viewed === 7
                      ? t("Present my project", "นำเสนอโปรเจกต์")
                      : t("Share a short update", "แชร์ความคืบหน้าสั้นๆ")
                  }
                  onPress={() =>
                    router.push({
                      pathname: "/shift/compose",
                      params: { day: viewed },
                    })
                  }
                />
              )}
              {s.nodes.find((n) => n.day === viewed) && (
                <Button
                  secondary
                  disabled={
                    busy ||
                    s.progress.some(
                      (p) =>
                        p.node_id ===
                          s.nodes.find((n) => n.day === viewed)?.id &&
                        p.status === "submitted",
                    )
                  }
                  label={t("Record my own milestone", "บันทึกหมุดหมายของฉัน")}
                  onPress={() =>
                    run("complete_milestone", {
                      node_id: s.nodes.find((n) => n.day === viewed)?.id,
                    })
                  }
                />
              )}
            </Card>
          )}
          {project && project.skills.length > 0 && (
            <Card>
              <Text variant="bold" style={styles.heading}>
                {t("Skills I chose", "สกิลที่เลือก")}
              </Text>
              {SHIFT_SKILLS.filter((skill) =>
                project.skills.includes(skill.id),
              ).map((skill) => (
                <View key={skill.id} style={{ gap: 6 }}>
                  <Text variant="bold" style={styles.label}>
                    {label(skill.name)}
                  </Text>
                  <Text style={styles.body}>{label(skill.tip)}</Text>
                </View>
              ))}
            </Card>
          )}
          {s.checkpoints
            .filter((cp) => cp.project_id === project?.id)
            .map((cp) => (
              <Card key={cp.day}>
                <Text variant="bold" style={styles.heading}>
                  {t("Mentor feedback", "ความเห็นจากพี่เลี้ยง")} · {cp.day}
                </Text>
                <Text style={styles.body}>{cp.feedback}</Text>
              </Card>
            ))}
          {peerUpdates(s)
            .slice(0, 2)
            .map((u) => (
              <Card key={u.id}>
                <Text variant="bold" style={styles.heading}>
                  {t(
                    "A peer could use your perspective",
                    "เพื่อนอยากได้มุมมองของเรา",
                  )}
                </Text>
                <Text style={styles.body}>
                  {s.projects.find((p) => p.id === u.project_id)?.title}:{" "}
                  {u.body.help || u.body.shipped}
                </Text>
                <Button
                  secondary
                  label={t("Try it or respond", "ลองใช้หรือตอบกลับ")}
                  onPress={() =>
                    router.push({
                      pathname: "/shift/post/[id]",
                      params: { id: u.id },
                    })
                  }
                />
              </Card>
            ))}
          <Card>
            <Button
              secondary
              label={t("I need help", "อยากได้ความช่วยเหลือ")}
              onPress={() => setShowHelp(!showHelp)}
            />
            {showHelp && (
              <>
                <Field
                  label={t("What would help?", "อยากให้ช่วยอะไร?")}
                  value={help}
                  onChange={setHelp}
                />
                <Button
                  disabled={busy || !help.trim()}
                  label={t("Ask a mentor", "ขอความช่วยเหลือจากพี่เลี้ยง")}
                  onPress={async () => {
                    if (await run("request", { kind: "help", body: help })) {
                      setHelp("");
                      setShowHelp(false);
                    }
                  }}
                />
              </>
            )}
            {s.requests
              .filter((r) => r.kind === "help")
              .map((r) => (
                <View key={r.id}>
                  <Text style={styles.body}>{r.body}</Text>
                  <Text style={styles.meta}>
                    {r.resolution || t("Waiting for staff", "รอทีมงานตอบ")}
                  </Text>
                </View>
              ))}
          </Card>
          {[1, 4, 7].includes(viewed) && day >= viewed && (
            <Card>
              <Button
                secondary
                label={t(
                  "Optional private check-in",
                  "เช็กอินส่วนตัว ถ้าอยากตอบ",
                )}
                onPress={() => setShowCheckin(!showCheckin)}
              />
              {showCheckin && (
                <>
                  <Text style={styles.meta}>
                    {t(
                      "Only you and assigned staff can see these answers. 1 = not at all, 5 = very much. Skip anything.",
                      "มีแค่เราและทีมงานที่ดูแลที่เห็นคำตอบ 1 = ไม่เลย 5 = มาก ข้ามข้อไหนก็ได้",
                    )}
                  </Text>
                  {(
                    [
                      [
                        "choice",
                        "Did this feel like your choice?",
                        "รู้สึกว่าเราได้เลือกเองไหม?",
                      ],
                      [
                        "capability",
                        "Do you feel more capable?",
                        "รู้สึกว่าทำได้มากขึ้นไหม?",
                      ],
                      [
                        "support",
                        "Did you feel supported?",
                        "รู้สึกว่ามีคนช่วยสนับสนุนไหม?",
                      ],
                    ] as const
                  ).map(([key, en, th]) => (
                    <View key={key} style={{ gap: 8 }}>
                      <Text style={styles.body}>{t(en, th)}</Text>
                      <View style={styles.wrap}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Button
                            key={n}
                            secondary
                            selected={answers[key] === n}
                            label={String(n)}
                            onPress={() => setAnswers({ ...answers, [key]: n })}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                  <Button
                    disabled={busy || !Object.keys(answers).length}
                    label={t("Save privately", "บันทึกส่วนตัว")}
                    onPress={async () => {
                      if (await run("checkin", { day: viewed, ...answers })) {
                        setShowCheckin(false);
                        setAnswers({});
                      }
                    }}
                  />
                </>
              )}
            </Card>
          )}
          <ErrorMessage message={error} />
          <Button
            secondary
            label={t("My learning paths", "เส้นทางเรียนรู้ของฉัน")}
            onPress={() => router.push("/(tabs)/my-paths")}
          />
        </>
      )}
    </CampShell>
  );
}
