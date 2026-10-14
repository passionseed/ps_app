import React from "react";
import { AppText as Text } from "../../components/AppText";
import {
  CampShell,
  Card,
  UpdateCard,
  styles,
  useCampCopy,
} from "../../components/shift/CampUI";
import { useShift } from "../../lib/shift-context";
import { myGroup } from "../../lib/shift-curriculum";

export default function Projects() {
  const { snapshot: s } = useShift();
  const t = useCampCopy();
  const group = s ? myGroup(s) : undefined;
  const published =
    s?.updates
      .filter((u) => u.published_at && !u.hidden)
      .sort((a, b) => {
        const inGroup = (id: string) =>
          s.projects
            .find((p) => p.id === id)
            ?.members.some((m) => group?.members.includes(m));
        return (
          Number(inGroup(b.project_id)) - Number(inGroup(a.project_id)) ||
          b.updated_at.localeCompare(a.updated_at)
        );
      }) ?? [];
  return (
    <CampShell title={t("Projects", "โปรเจกต์")}>
      <Card>
        <Text style={styles.body}>
          {t(
            "Real work, unfinished attempts, and things we learned. This space is only for your cohort and mentors.",
            "ผลงานจริง สิ่งที่ลองแล้วไม่เวิร์ก และสิ่งที่เรียนรู้ พื้นที่นี้เฉพาะเพื่อนร่วมรุ่นและพี่เลี้ยง",
          )}
        </Text>
      </Card>
      {!published.length && (
        <Card>
          <Text style={styles.body}>
            {t(
              "No presentations yet. Small attempts are worth sharing too.",
              "ยังไม่มีโพสต์นำเสนอ สิ่งเล็กๆ ที่ลองก็แชร์ได้",
            )}
          </Text>
        </Card>
      )}
      {published.map((update) => (
        <UpdateCard key={update.id} update={update} />
      ))}
    </CampShell>
  );
}
