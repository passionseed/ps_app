import React, { useState } from "react";
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
  UpdateCard,
} from "../../components/shift/CampUI";
import { useShift } from "../../lib/shift-context";
import { shiftDay } from "../../lib/shift-curriculum";

export default function Mentor() {
  const { snapshot: s } = useShift();
  const t = useCampCopy();
  const { run, busy, error } = useCampAction();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const day = s ? shiftDay(s.cohort.starts_on) : 0;
  return (
    <CampShell title={t("Mentor support", "พื้นที่พี่เลี้ยง")}>
      {s?.is_staff ? (
        <>
          {s.requests
            .filter((r) => !r.resolved_at)
            .map((r) => (
              <Card key={r.id}>
                <Text variant="bold" style={styles.heading}>
                  {r.kind === "report"
                    ? t("Report", "รายงาน")
                    : t("Help request", "ขอความช่วยเหลือ")}{" "}
                  · {s.participants.find((p) => p.id === r.user_id)?.name}
                </Text>
                <Text style={styles.body}>{r.body}</Text>
                <Field
                  label={t("Resolution", "การช่วยเหลือ")}
                  value={feedback[r.id] ?? ""}
                  onChange={(value) =>
                    setFeedback({ ...feedback, [r.id]: value })
                  }
                />
                <Button
                  disabled={busy || !feedback[r.id]?.trim()}
                  label={t("Resolve", "บันทึกว่าช่วยแล้ว")}
                  onPress={() =>
                    run("resolve_request", {
                      id: r.id,
                      resolution: feedback[r.id],
                    })
                  }
                />
              </Card>
            ))}
          {s.projects.map((p) => (
            <Card key={p.id}>
              <Text variant="bold" style={styles.heading}>
                {p.title}
              </Text>
              <Text style={styles.body}>{p.scope || p.description}</Text>
              {[1, 4, 7]
                .filter((n) => n <= day)
                .map((n) => {
                  const key = `${p.id}:${n}`;
                  const existing = s.checkpoints.find(
                    (c) => c.project_id === p.id && c.day === n,
                  );
                  return (
                    <React.Fragment key={n}>
                      <Text style={styles.label}>
                        {t("Day", "วันที่")} {n} ·{" "}
                        {existing
                          ? t("Reviewed", "รีวิวแล้ว")
                          : t("Review due", "รอรีวิว")}
                      </Text>
                      <Field
                        label={t(
                          "Guidance, not a decision for them",
                          "แนะนำ โดยให้เขาตัดสินใจเอง",
                        )}
                        value={feedback[key] ?? existing?.feedback ?? ""}
                        onChange={(value) =>
                          setFeedback({ ...feedback, [key]: value })
                        }
                      />
                      <Button
                        disabled={
                          busy || !(feedback[key] ?? existing?.feedback)?.trim()
                        }
                        secondary
                        label={t("Save feedback", "บันทึกความเห็น")}
                        onPress={() =>
                          run("checkpoint", {
                            project_id: p.id,
                            day: n,
                            feedback: feedback[key] ?? existing?.feedback,
                          })
                        }
                      />
                    </React.Fragment>
                  );
                })}
            </Card>
          ))}
          {s.groups.map((g) => (
            <Card key={g.id}>
              <Text variant="bold" style={styles.heading}>
                {g.name}
              </Text>
              {s.messages
                .filter((m) => m.group_id === g.id)
                .map((m) => (
                  <React.Fragment key={m.id}>
                    <Text style={styles.body}>
                      {s.participants.find((p) => p.id === m.author_id)?.name}:{" "}
                      {m.body}
                    </Text>
                    <Button
                      secondary
                      disabled={busy}
                      label={
                        m.hidden
                          ? t("Restore message", "นำข้อความกลับมา")
                          : t("Hide message", "ซ่อนข้อความ")
                      }
                      onPress={() =>
                        run("moderate_message", { id: m.id, hidden: !m.hidden })
                      }
                    />
                  </React.Fragment>
                ))}
              <Field
                label={t("Message this group", "ส่งข้อความให้กลุ่ม")}
                value={messages[g.id] ?? ""}
                onChange={(value) =>
                  setMessages({ ...messages, [g.id]: value })
                }
              />
              <Button
                disabled={busy || !messages[g.id]?.trim()}
                label={t("Send", "ส่ง")}
                onPress={async () => {
                  if (
                    await run("message", {
                      group_id: g.id,
                      body: messages[g.id],
                    })
                  )
                    setMessages({ ...messages, [g.id]: "" });
                }}
              />
            </Card>
          ))}
          {s.updates
            .filter((u) => u.published_at)
            .map((u) => (
              <React.Fragment key={u.id}>
                <UpdateCard update={u} full />
                <Button
                  secondary
                  disabled={busy}
                  label={
                    u.hidden
                      ? t("Restore", "นำกลับมา")
                      : t("Hide presentation", "ซ่อนโพสต์")
                  }
                  onPress={() =>
                    run("moderate", { id: u.id, hidden: !u.hidden })
                  }
                />
              </React.Fragment>
            ))}
          <Card>
            <Text variant="bold" style={styles.heading}>
              {t(
                "Private participant check-ins",
                "เช็กอินส่วนตัวของผู้เข้าร่วม",
              )}
            </Text>
            {s.checkins.map((c) => (
              <Text key={`${c.user_id}:${c.day}`} style={styles.body}>
                {s.participants.find((p) => p.id === c.user_id)?.name} ·{" "}
                {t("Day", "วันที่")} {c.day}: {t("Choice", "เลือกเอง")}{" "}
                {c.choice ?? t("Skipped", "ข้าม")} · {t("Capability", "ทำได้")}{" "}
                {c.capability ?? t("Skipped", "ข้าม")} ·{" "}
                {t("Support", "มีคนช่วย")} {c.support ?? t("Skipped", "ข้าม")}
              </Text>
            ))}
            <Text style={styles.meta}>
              {t(
                "Use these to start a supportive conversation, not to rank participants.",
                "ใช้เริ่มบทสนทนาที่สนับสนุนกัน ไม่ใช้จัดอันดับผู้เข้าร่วม",
              )}
            </Text>
          </Card>
          {s.comments.map((c) => (
            <Card key={c.id}>
              <Text style={styles.body}>
                {s.participants.find((p) => p.id === c.author_id)?.name}:{" "}
                {c.body}
              </Text>
              <Button
                secondary
                disabled={busy}
                label={
                  c.hidden
                    ? t("Restore comment", "นำความเห็นกลับมา")
                    : t("Hide comment", "ซ่อนความเห็น")
                }
                onPress={() =>
                  run("moderate_comment", { id: c.id, hidden: !c.hidden })
                }
              />
            </Card>
          ))}
          <ErrorMessage message={error} />
        </>
      ) : (
        <Card>
          <Text style={styles.body}>
            {t(
              "Assigned mentors can use this space.",
              "พื้นที่นี้สำหรับพี่เลี้ยงที่ได้รับมอบหมาย",
            )}
          </Text>
        </Card>
      )}
    </CampShell>
  );
}
