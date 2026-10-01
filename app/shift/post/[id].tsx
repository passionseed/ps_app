import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { AppText as Text } from "../../../components/AppText";
import {
  Button,
  CampShell,
  Card,
  ErrorMessage,
  Field,
  UpdateCard,
  styles,
  useCampAction,
  useCampCopy,
} from "../../../components/shift/CampUI";
import { useShift } from "../../../lib/shift-context";

export default function Post() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot: s } = useShift();
  const t = useCampCopy();
  const { run, busy, error } = useCampAction();
  const [response, setResponse] = useState("");
  const [report, setReport] = useState("");
  const [reporting, setReporting] = useState(false);
  const update = s?.updates.find(
    (u) => u.id === id && u.published_at && !u.hidden,
  );
  return (
    <CampShell title={t("Presentation", "นำเสนอผลงาน")}>
      {update ? (
        <>
          <UpdateCard update={update} full />
          <Card>
            <Text variant="bold" style={styles.heading}>
              {t("Questions and observations", "คำถามและสิ่งที่สังเกต")}
            </Text>
            {s?.comments
              .filter((c) => c.post_id === update.post_id)
              .map((c) => (
                <View key={c.id} style={{ gap: 6 }}>
                  <Text variant="bold" style={styles.label}>
                    {s.participants.find((p) => p.id === c.author_id)?.name ??
                      t("Staff", "ทีมงาน")}
                  </Text>
                  <Text style={styles.body}>{c.body}</Text>
                </View>
              ))}
            <Text style={styles.body}>
              {t(
                "What did you try? Where did you get stuck? What might help?",
                "ลองอะไร? ติดตรงไหน? อะไรอาจช่วยได้?",
              )}
            </Text>
            <Field
              label={t("Your response", "คำตอบของเรา")}
              value={response}
              onChange={setResponse}
            />
            <Button
              disabled={busy || !response.trim()}
              label={t("Send feedback", "ส่งความเห็น")}
              onPress={async () => {
                if (await run("comment", { update_id: id, body: response }))
                  setResponse("");
              }}
            />
          </Card>
          <Button
            secondary
            label={t("Report to staff", "แจ้งทีมงาน")}
            onPress={() => setReporting(!reporting)}
          />
          {reporting && (
            <Card>
              <Field
                label={t("What should staff review?", "อยากให้ทีมงานตรวจอะไร?")}
                value={report}
                onChange={setReport}
              />
              <Button
                disabled={busy || !report.trim()}
                label={t("Send private report", "ส่งรายงานส่วนตัว")}
                onPress={async () => {
                  if (
                    await run("request", {
                      kind: "report",
                      update_id: id,
                      body: report,
                    })
                  ) {
                    setReport("");
                    setReporting(false);
                  }
                }}
              />
            </Card>
          )}
        </>
      ) : (
        <Card>
          <Text style={styles.body}>
            {t(
              "This presentation is unavailable or has been removed.",
              "โพสต์นี้ยังไม่พร้อมหรือถูกนำออกแล้ว",
            )}
          </Text>
        </Card>
      )}
      <ErrorMessage message={error} />
    </CampShell>
  );
}
