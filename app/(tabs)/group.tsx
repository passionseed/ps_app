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
import { myGroup, myProject, shiftDay } from "../../lib/shift-curriculum";

export default function Group() {
  const { snapshot: s } = useShift();
  const t = useCampCopy();
  const { run, busy, error } = useCampAction();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [concern, setConcern] = useState("");
  const [reporting, setReporting] = useState(false);
  const group = s ? myGroup(s) : undefined;
  const project = s ? myProject(s) : undefined;
  const before = s ? shiftDay(s.cohort.starts_on) < 1 : false;
  if (s?.is_staff)
    return (
      <CampShell title={t("Peer groups", "กลุ่มเพื่อน")}>
        {s.groups.map((g) => (
          <Card key={g.id}>
            <Text variant="bold" style={styles.heading}>
              {g.name} · {g.members.length}/3
            </Text>
            <Text style={styles.body}>
              {g.members
                .map((id) => s.participants.find((p) => p.id === id)?.name)
                .join(", ")}
            </Text>
          </Card>
        ))}
        <Button
          label={t("Support group conversations", "ดูแลบทสนทนาในกลุ่ม")}
          onPress={() => router.push("/shift/mentor")}
        />
      </CampShell>
    );
  return (
    <CampShell title={t("My group", "กลุ่มของฉัน")}>
      {s && (
        <>
          <Card>
            <Text style={styles.body}>
              {t(
                "Three peers, here to support each other. You can build separate projects or choose to work together.",
                "เพื่อนสามคนที่ช่วยสนับสนุนกัน ทำโปรเจกต์แยกกันหรือเลือกทำด้วยกันก็ได้",
              )}
            </Text>
          </Card>
          {s.invitations
            .filter((i) => i.invitee === s.user_id && i.status === "pending")
            .map((i) => (
              <Card key={i.id}>
                <Text variant="bold" style={styles.heading}>
                  {s.participants.find((p) => p.id === i.invited_by)?.name}{" "}
                  {t("invited you", "ชวนเรา")}
                </Text>
                <Text style={styles.body}>
                  {i.kind === "group"
                    ? s.groups.find((g) => g.id === i.target_id)?.name
                    : s.projects.find((p) => p.id === i.target_id)?.title}
                </Text>
                <Button
                  disabled={busy}
                  label={t("Accept invitation", "รับคำชวน")}
                  onPress={() =>
                    run("answer_invite", { id: i.id, accept: true })
                  }
                />
                <Button
                  disabled={busy}
                  secondary
                  label={t("No thanks", "ขอผ่านก่อน")}
                  onPress={() =>
                    run("answer_invite", { id: i.id, accept: false })
                  }
                />
              </Card>
            ))}
          {!group ? (
            <Card>
              <Text variant="bold" style={styles.heading}>
                {t(
                  "Choose peers, or let staff help",
                  "เลือกเพื่อน หรือให้ทีมงานช่วย",
                )}
              </Text>
              <Text style={styles.body}>
                {t(
                  "Staff will place unmatched participants using availability and interests. If the camp has started, ask staff to place you.",
                  "ทีมงานจะช่วยจัดกลุ่มให้คนที่ยังไม่มีกลุ่มตามเวลาที่ว่างและความสนใจ ถ้าค่ายเริ่มแล้วขอให้ทีมงานช่วยจัดได้",
                )}
              </Text>
              {before && (
                <>
                  <Field
                    label={t("Group name", "ชื่อกลุ่ม")}
                    value={name}
                    onChange={setName}
                    multiline={false}
                    maxLength={100}
                  />
                  <Button
                    disabled={busy || !name.trim()}
                    label={t("Create a peer group", "สร้างกลุ่มเพื่อน")}
                    onPress={() => run("create_group", { name })}
                  />
                </>
              )}
              <Button
                secondary
                label={t("Ask staff to place me", "ขอให้ทีมงานจัดกลุ่ม")}
                disabled={busy}
                onPress={() =>
                  run("request", {
                    kind: "help",
                    body: "Please place me in a peer group.",
                  })
                }
              />
            </Card>
          ) : (
            <>
              <Card>
                <Text variant="bold" style={styles.heading}>
                  {group.name} · {group.members.length}/3
                </Text>
                {group.members.map((id) => {
                  const peer = s.participants.find((p) => p.id === id);
                  const work = s.projects.find((p) => p.members.includes(id));
                  return (
                    <View key={id} style={{ gap: 6 }}>
                      <Text variant="bold" style={styles.label}>
                        {peer?.name}
                      </Text>
                      <Text style={styles.meta}>
                        {work?.title ||
                          t("Choosing a project", "กำลังเลือกโปรเจกต์")}
                      </Text>
                      {id !== s.user_id && project && !work && (
                        <Button
                          disabled={busy}
                          secondary
                          label={t(
                            "Invite to my project",
                            "ชวนทำโปรเจกต์ด้วยกัน",
                          )}
                          onPress={() =>
                            run("invite", {
                              kind: "project",
                              target_id: project.id,
                              invitee: id,
                            })
                          }
                        />
                      )}
                    </View>
                  );
                })}
                <Button
                  secondary
                  label={t("My project", "โปรเจกต์ของฉัน")}
                  onPress={() => router.push("/shift/project")}
                />
                {!before && (
                  <Text style={styles.meta}>
                    {t(
                      "Need a different group? Ask staff. Your project contributions stay yours.",
                      "อยากเปลี่ยนกลุ่ม? ขอให้ทีมงานช่วยได้ ผลงานที่ทำไว้ยังเป็นของเรา",
                    )}
                  </Text>
                )}
              </Card>
              {before && group.members.length < 3 && (
                <Card>
                  <Text variant="bold" style={styles.heading}>
                    {t("Invite an enrolled peer", "ชวนเพื่อนร่วมรุ่น")}
                  </Text>
                  {s.participants
                    .filter(
                      (p) =>
                        p.role === "participant" &&
                        !p.group_id &&
                        p.id !== s.user_id,
                    )
                    .map((p) => (
                      <Button
                        key={p.id}
                        secondary
                        disabled={busy}
                        label={p.name}
                        onPress={() =>
                          run("invite", {
                            kind: "group",
                            target_id: group.id,
                            invitee: p.id,
                          })
                        }
                      />
                    ))}
                </Card>
              )}
              <Card>
                <Text variant="bold" style={styles.heading}>
                  {t("Group conversation", "คุยในกลุ่ม")}
                </Text>
                <Text style={styles.meta}>
                  {t(
                    "Your group and assigned staff can read this space.",
                    "เพื่อนในกลุ่มและทีมงานที่ดูแลอ่านพื้นที่นี้ได้",
                  )}
                </Text>
                {s.messages
                  .filter((m) => m.group_id === group.id)
                  .map((m) => (
                    <View key={m.id} style={{ gap: 5 }}>
                      <Text variant="bold" style={styles.label}>
                        {s.participants.find((p) => p.id === m.author_id)
                          ?.name || t("Staff", "ทีมงาน")}
                      </Text>
                      <Text style={styles.body}>{m.body}</Text>
                    </View>
                  ))}
                <Field
                  label={t("Say hello, ask, or share", "ทักทาย ถาม หรือแชร์")}
                  value={message}
                  onChange={setMessage}
                />
                <Button
                  disabled={busy || !message.trim()}
                  label={t("Send to group", "ส่งในกลุ่ม")}
                  onPress={async () => {
                    if (await run("message", { body: message })) setMessage("");
                  }}
                />
                <Button
                  secondary
                  label={t("Report a group concern", "แจ้งปัญหาในกลุ่ม")}
                  onPress={() => setReporting(!reporting)}
                />
                {reporting && (
                  <>
                    <Field
                      label={t(
                        "What should staff know? This report is private.",
                        "อยากให้ทีมงานรู้อะไร? รายงานนี้เป็นส่วนตัว",
                      )}
                      value={concern}
                      onChange={setConcern}
                    />
                    <Button
                      disabled={busy || !concern.trim()}
                      label={t("Send private report", "ส่งรายงานส่วนตัว")}
                      onPress={async () => {
                        if (
                          await run("request", {
                            kind: "report",
                            body: concern,
                          })
                        ) {
                          setConcern("");
                          setReporting(false);
                        }
                      }}
                    />
                  </>
                )}
                {s.requests
                  .filter((r) => r.kind === "report")
                  .map((r) => (
                    <Text key={r.id} style={styles.meta}>
                      {r.resolution ||
                        t(
                          "Your report is waiting for staff.",
                          "ทีมงานกำลังรออ่านรายงานของเรา",
                        )}
                    </Text>
                  ))}
              </Card>
            </>
          )}
          {s.invitations
            .filter((i) => i.invited_by === s.user_id)
            .map((i) => (
              <Text key={i.id} style={styles.meta}>
                {s.participants.find((p) => p.id === i.invitee)?.name}:{" "}
                {i.status}
              </Text>
            ))}
          <ErrorMessage message={error} />
        </>
      )}
    </CampShell>
  );
}
