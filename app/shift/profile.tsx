import React from "react";
import { router } from "expo-router";
import Constants from "expo-constants";
import { AppText as Text } from "../../components/AppText";
import {
  Button,
  CampShell,
  Card,
  UpdateCard,
  styles,
  useCampCopy,
} from "../../components/shift/CampUI";
import { useShift } from "../../lib/shift-context";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { myProject } from "../../lib/shift-curriculum";

export default function CampProfile() {
  const { snapshot: s } = useShift();
  const t = useCampCopy();
  const { user } = useAuth();
  const project = s ? myProject(s) : undefined;
  return (
    <CampShell title={t("My work and learning", "ผลงานและการเรียนรู้")}>
      <Card>
        <Text variant="bold" style={styles.heading}>
          {s?.participants.find((p) => p.id === user?.id)?.name ??
            t("My profile", "โปรไฟล์ฉัน")}
        </Text>
        <Text style={styles.body}>
          {t(
            "A record of real attempts and learning. Your work stays within the cohort in this version.",
            "บันทึกสิ่งที่ลองทำและเรียนรู้จริง เวอร์ชันนี้เห็นผลงานเฉพาะร่วมรุ่น",
          )}
        </Text>
        <Button
          secondary
          label={t("Edit my introduction", "แก้ข้อมูลแนะนำตัว")}
          onPress={() => router.push("/shift/intro")}
        />
        <Button
          secondary
          label={t("Settings", "ตั้งค่า")}
          onPress={() => router.push("/settings")}
        />
      </Card>
      {project && (
        <Card>
          <Text variant="bold" style={styles.heading}>
            {project.title}
          </Text>
          <Text style={styles.body}>
            {project.scope || project.description}
          </Text>
          <Text style={styles.meta}>
            {s?.progress.length ?? 0}{" "}
            {t("milestones recorded by me", "หมุดหมายที่ฉันบันทึกเอง")}
          </Text>
          <Button
            secondary
            label={t("Edit project scope", "แก้โจทย์โปรเจกต์")}
            onPress={() => router.push("/shift/project")}
          />
        </Card>
      )}
      {s?.updates
        .filter((u) => u.contributor_ids.includes(s.user_id))
        .map((u) => (
          <UpdateCard key={u.id} update={u} />
        ))}
      <Card>
        <Text variant="bold" style={styles.heading}>
          {t("My private check-ins", "เช็กอินส่วนตัวของฉัน")}
        </Text>
        {s?.checkins
          .filter((c) => c.user_id === s.user_id)
          .map((c) => (
            <Text key={c.day} style={styles.body}>
              {t("Day", "วันที่")} {c.day}: {t("Choice", "เลือกเอง")}{" "}
              {c.choice ?? "—"} · {t("Capability", "ทำได้")}{" "}
              {c.capability ?? "—"} · {t("Support", "มีคนช่วย")}{" "}
              {c.support ?? "—"}
            </Text>
          ))}
        <Text style={styles.meta}>
          {t(
            "These are your reflections, not a growth score.",
            "นี่คือสิ่งที่เราสะท้อนเอง ไม่ใช่คะแนนการเติบโต",
          )}
        </Text>
      </Card>
      <Button
        secondary
        label={t("Sign out", "ออกจากระบบ")}
        onPress={() => {
          void supabase.auth.signOut();
        }}
      />
      <Text style={styles.meta}>
        Passion Seed · v{Constants.expoConfig?.version}
      </Text>
    </CampShell>
  );
}
