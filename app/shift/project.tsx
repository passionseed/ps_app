import React, { useEffect, useState } from "react";
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
import { myGroup, myProject, SHIFT_SKILLS } from "../../lib/shift-curriculum";

export default function Project() {
  const { snapshot: s } = useShift();
  const t = useCampCopy();
  const { run, busy, error } = useCampAction();
  const project = s ? myProject(s) : undefined;
  const group = s ? myGroup(s) : undefined;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  useEffect(() => {
    if (project) {
      setScope(project.scope);
      setSkills(project.skills);
    }
  }, [project?.id]);
  return (
    <CampShell title={project?.title ?? t("Start a project", "เริ่มโปรเจกต์")}>
      {!group ? (
        <Card>
          <Text style={styles.body}>
            {t(
              "Join a peer group first. Your project can still be solo.",
              "เข้ากลุ่มเพื่อนก่อน โปรเจกต์ยังทำคนเดียวได้",
            )}
          </Text>
          <Button
            label={t("Find my group", "หากลุ่มของฉัน")}
            onPress={() => router.push("/(tabs)/group")}
          />
        </Card>
      ) : !project ? (
        <Card>
          <Text style={styles.body}>
            {t(
              "Choose a small problem you care about. You can change direction after talking to people.",
              "เลือกปัญหาเล็กๆ ที่เราใส่ใจ เปลี่ยนทิศทางได้หลังคุยกับคนจริง",
            )}
          </Text>
          <Field
            label={t("Project name", "ชื่อโปรเจกต์")}
            value={title}
            onChange={setTitle}
            multiline={false}
            maxLength={120}
          />
          <Field
            label={t(
              "Who is this for? What problem might it solve?",
              "ทำให้ใคร? อาจช่วยแก้ปัญหาอะไร?",
            )}
            value={description}
            onChange={setDescription}
            maxLength={2000}
          />
          <Button
            disabled={busy || !title.trim()}
            label={t("Create my project", "สร้างโปรเจกต์")}
            onPress={() => run("create_project", { title, description })}
          />
        </Card>
      ) : (
        <Card>
          <Text style={styles.meta}>
            {t("Project members", "สมาชิกโปรเจกต์")}:{" "}
            {project.members
              .map((id) => s?.participants.find((p) => p.id === id)?.name)
              .join(", ")}
          </Text>
          <Field
            label={t(
              "Our current scope: one problem, users, and a hypothesis",
              "โจทย์ตอนนี้: ปัญหาเดียว คนใช้ และสิ่งที่อยากทดสอบ",
            )}
            value={scope}
            onChange={setScope}
          />
          <Text variant="bold" style={styles.heading}>
            {t(
              "Choose skills your project needs",
              "เลือกสกิลที่โปรเจกต์ต้องใช้",
            )}
          </Text>
          {SHIFT_SKILLS.map((skill) => (
            <View key={skill.id} style={{ gap: 8 }}>
              <Button
                secondary
                selected={skills.includes(skill.id)}
                label={t(skill.name[0], skill.name[1])}
                onPress={() =>
                  setSkills(
                    skills.includes(skill.id)
                      ? skills.filter((id) => id !== skill.id)
                      : [...skills, skill.id],
                  )
                }
              />
              {skills.includes(skill.id) && (
                <Text style={styles.body}>{t(skill.tip[0], skill.tip[1])}</Text>
              )}
            </View>
          ))}
          <Button
            disabled={busy}
            label={t("Save scope and skills", "บันทึกโจทย์และสกิล")}
            onPress={async () => {
              if (await run("edit_project", { scope, skills })) router.back();
            }}
          />
          <Button
            secondary
            label={t("Invite a peer to this project", "ชวนเพื่อนร่วมโปรเจกต์")}
            onPress={() => router.push("/(tabs)/group")}
          />
        </Card>
      )}
      <ErrorMessage message={error} />
    </CampShell>
  );
}
