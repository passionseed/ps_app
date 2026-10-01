import React, { useEffect, useState } from "react";
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
} from "../../components/shift/CampUI";
import { useShift } from "../../lib/shift-context";
import type { ShiftIntroduction } from "../../types/shift";

export default function Introduction() {
  const { snapshot: s } = useShift();
  const { run, busy, error } = useCampAction();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ShiftIntroduction>({
    language: Intl.DateTimeFormat().resolvedOptions().locale.startsWith("th")
      ? "th"
      : "en",
  });
  useEffect(() => {
    if (s) {
      setData({ ...data, ...s.introduction });
      setStep(s.introduction?.step ?? 0);
    }
  }, [s?.cohort.id]);
  const t = (en: string, th: string) => (data.language === "th" ? th : en);
  const next = async (finished = false) => {
    if (
      await run("introduction", {
        ...data,
        step: finished ? 4 : step + 1,
        finished,
      })
    ) {
      if (finished) router.replace("/(tabs)/today");
      else setStep(step + 1);
    }
  };
  return (
    <CampShell title={t("Welcome to SHIFT", "ยินดีต้อนรับสู่ SHIFT")}>
      <Card>
        <Text style={styles.body}>
          {t(
            "You do not need an idea or experience yet. Choose what to build, learn by trying, and support two peers.",
            "ยังไม่ต้องมีไอเดียหรือประสบการณ์ เลือกสิ่งที่จะสร้าง เรียนรู้จากการลอง และช่วยสนับสนุนเพื่อนอีกสองคน",
          )}
        </Text>
        <Text style={styles.meta}>
          {t(
            "A few quick things. You can skip or change any answer.",
            "ตอบสั้นๆ ไม่กี่ข้อ ข้ามหรือเปลี่ยนคำตอบได้ทุกข้อ",
          )}{" "}
          {Math.min(step + 1, 4)}/4
        </Text>
        {step === 0 && (
          <>
            <Text variant="bold" style={styles.heading}>
              English / ภาษาไทย
            </Text>
            <Button
              secondary
              selected={data.language === "en"}
              label="English"
              onPress={() => setData({ ...data, language: "en" })}
            />
            <Button
              secondary
              selected={data.language === "th"}
              label="ภาษาไทย"
              onPress={() => setData({ ...data, language: "th" })}
            />
          </>
        )}
        {step === 1 && (
          <>
            <Text variant="bold" style={styles.heading}>
              {t(
                "When can you interact with your peers?",
                "สะดวกคุยกับเพื่อนช่วงไหน?",
              )}
            </Text>
            {[
              ["Evenings", "ช่วงเย็น"],
              ["Daytime", "ช่วงกลางวัน"],
              ["Flexible", "ยืดหยุ่นได้"],
              ["Not sure yet", "ยังไม่แน่ใจ"],
            ].map(([en, th]) => (
              <Button
                key={en}
                secondary
                selected={data.availability === en}
                label={t(en, th)}
                onPress={() => setData({ ...data, availability: en })}
              />
            ))}
          </>
        )}
        {step === 2 && (
          <>
            <Text variant="bold" style={styles.heading}>
              {t("What sounds interesting to try?", "อยากลองอะไร?")}
            </Text>
            {[
              ["Technology", "เทคโนโลยี"],
              ["Helping people", "ช่วยคน"],
              ["Design", "ออกแบบ"],
              ["Business", "ธุรกิจ"],
              ["Something else", "อย่างอื่น"],
              ["Not sure yet", "ยังไม่แน่ใจ"],
            ].map(([en, th]) => (
              <Button
                key={en}
                secondary
                selected={data.interests === en}
                label={t(en, th)}
                onPress={() => setData({ ...data, interests: en })}
              />
            ))}
          </>
        )}
        {step >= 3 && (
          <>
            <Text variant="bold" style={styles.heading}>
              {t(
                "Do you already have a problem in mind?",
                "มีปัญหาที่อยากลองแก้ในใจไหม?",
              )}
            </Text>
            <Button
              secondary
              label={t("I will discover one during camp", "ค่อยค้นหาในค่าย")}
              onPress={() => setData({ ...data, idea: "" })}
            />
            <Field
              label={t("Optional idea", "ไอเดีย ถ้าอยากเล่า")}
              value={data.idea ?? ""}
              onChange={(idea) => setData({ ...data, idea })}
              maxLength={2000}
            />
          </>
        )}
        <Button
          disabled={busy}
          label={
            step >= 3
              ? t("Meet my group", "ไปพบเพื่อนในกลุ่ม")
              : t("Continue / skip", "ต่อ / ข้าม")
          }
          onPress={() => next(step >= 3)}
        />
        {step > 0 && (
          <Button
            secondary
            disabled={busy}
            label={t("Back", "ย้อนกลับ")}
            onPress={() => setStep(step - 1)}
          />
        )}
        <ErrorMessage message={error} />
      </Card>
    </CampShell>
  );
}
