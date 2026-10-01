import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { AppText as Text } from "../../components/AppText";
import {
  Button,
  CampShell,
  Card,
  ErrorMessage,
  Field,
  PrivateImage,
  styles,
  useCampAction,
  useCampCopy,
} from "../../components/shift/CampUI";
import { useShift } from "../../lib/shift-context";
import {
  myProject,
  shiftDay,
  validateUpdate,
} from "../../lib/shift-curriculum";
import { uploadCampImage } from "../../lib/shift";
import type { ShiftUpdateBody } from "../../types/shift";

export default function Composer() {
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const day = Math.min(7, Math.max(1, Number(dayParam) || 1));
  const { snapshot: s } = useShift();
  const t = useCampCopy();
  const { run, busy, error, setError } = useCampAction();
  const project = s ? myProject(s) : undefined;
  const existing = s?.updates.find(
    (u) => u.project_id === project?.id && u.day === day,
  );
  const key =
    s && project
      ? `shift-draft:${s.user_id}:${s.cohort.id}:${project.id}:${day}`
      : null;
  const [body, setBody] = useState<ShiftUpdateBody>({});
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [contributors, setContributors] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let active = true;
    setReady(false);
    if (!key) return;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          try {
            const draft = JSON.parse(raw);
            setBody(draft.body);
            setRevision(draft.revision);
            setContributors(draft.contributors ?? [s!.user_id]);
            setNotice(
              t("Recovered your local draft.", "กู้ฉบับร่างของเราแล้ว"),
            );
          } catch {
            setBody(existing?.body ?? {});
            setRevision(existing?.revision ?? 0);
            setContributors(existing?.contributor_ids ?? [s!.user_id]);
          }
        } else {
          setBody(existing?.body ?? {});
          setRevision(existing?.revision ?? 0);
          setContributors(existing?.contributor_ids ?? [s!.user_id]);
        }
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setBody(existing?.body ?? {});
          setRevision(existing?.revision ?? 0);
          setContributors(existing?.contributor_ids ?? [s!.user_id]);
          setReady(true);
          setNotice(
            t(
              "Local recovery unavailable. Save a draft to keep your work.",
              "กู้ฉบับร่างในเครื่องไม่ได้ กดบันทึกฉบับร่างเพื่อเก็บงานไว้",
            ),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    if (!key || !ready) return;
    timer.current = setTimeout(() => {
      void AsyncStorage.setItem(
        key,
        JSON.stringify({ body, revision, contributors }),
      ).catch(() =>
        setNotice("Local draft storage unavailable. Save your draft online."),
      );
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [body, revision, contributors, key, ready]);
  const update = (field: keyof ShiftUpdateBody, value: string) =>
    setBody({ ...body, [field]: value });
  const save = async (publish: boolean) => {
    const invalid = validateUpdate(body, day, publish);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (
      await run("save_update", { day, revision, body, publish, contributors })
    ) {
      if (timer.current) clearTimeout(timer.current);
      if (key) await AsyncStorage.removeItem(key).catch(() => {});
      router.replace("/(tabs)/projects");
    }
  };
  const addImage = async () => {
    if (!s || !project) return;
    setError(null);
    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const path = await uploadCampImage(
          s.cohort.id,
          project.id,
          asset.uri,
          asset.mimeType ?? "image/jpeg",
        );
        setBody((prev) => ({
          ...prev,
          screenshots: [...(prev.screenshots ?? []), path],
        }));
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Image upload failed. Try again.",
      );
    } finally {
      setUploading(false);
    }
  };
  const fields =
    day === 7
      ? [
          ["problem", "Who has the problem?", "ใครเจอปัญหานี้?"],
          ["shipped", "What can people use or try?", "คนลองใช้หรือทำอะไรได้?"],
          ["evidence", "What did real testing show?", "การทดสอบจริงบอกอะไร?"],
          ["changes", "What changed and why?", "เปลี่ยนอะไร เพราะอะไร?"],
          ["learned", "What did you learn?", "เรียนรู้อะไร?"],
          [
            "help",
            "What support would help next?",
            "อยากได้ความช่วยเหลืออะไรต่อ?",
          ],
        ]
      : [
          ["shipped", "What did you try or ship?", "วันนี้ลองหรือสร้างอะไร?"],
          [
            "broke",
            "What broke or surprised you?",
            "อะไรพังหรือไม่เป็นอย่างที่คิด?",
          ],
          ["learned", "What did you learn?", "เรียนรู้อะไร?"],
          ["help", "What help would you like?", "อยากให้ช่วยอะไร?"],
        ];
  return (
    <CampShell
      title={
        day === 7
          ? t("Final presentation", "นำเสนอโปรเจกต์")
          : `${t("Day", "วันที่")} ${day}`
      }
    >
      {!project ? (
        <Card>
          <Text style={styles.body}>
            {t(
              "Create or join a project first.",
              "สร้างหรือเข้าร่วมโปรเจกต์ก่อน",
            )}
          </Text>
          <Button
            label={t("My project", "โปรเจกต์ของฉัน")}
            onPress={() => router.push("/shift/project")}
          />
        </Card>
      ) : (
        <Card>
          <Text variant="bold" style={styles.heading}>
            {project.title}
          </Text>
          <Text style={styles.meta}>
            {t(
              "Visible only to your cohort when published. Your project members share this draft. No slides or reels needed.",
              "เมื่อโพสต์จะเห็นเฉพาะร่วมรุ่น สมาชิกโปรเจกต์ใช้ฉบับร่างเดียวกัน ไม่ต้องทำสไลด์หรือรีล",
            )}
          </Text>
          {notice && <Text style={styles.meta}>{notice}</Text>}
          {fields.map(([field, en, th]) => (
            <Field
              key={field}
              label={t(en, th)}
              value={String(body[field as keyof ShiftUpdateBody] ?? "")}
              onChange={(value) =>
                update(field as keyof ShiftUpdateBody, value)
              }
            />
          ))}
          <Text style={styles.label}>
            {t("Who contributed to this update?", "ใครร่วมทำงานในโพสต์นี้?")}
          </Text>
          {project.members.map((id) => (
            <Button
              key={id}
              secondary
              selected={contributors.includes(id)}
              label={
                s?.participants.find((p) => p.id === id)?.name ??
                t("Participant", "ผู้เข้าร่วม")
              }
              onPress={() =>
                setContributors(
                  contributors.includes(id)
                    ? contributors.filter((c) => c !== id)
                    : [...contributors, id],
                )
              }
            />
          ))}
          <Field
            label={t("Project link (optional)", "ลิงก์โปรเจกต์ ถ้ามี")}
            value={body.link ?? ""}
            onChange={(value) => update("link", value)}
            multiline={false}
          />
          {body.screenshots?.map((path) => (
            <React.Fragment key={path}>
              <PrivateImage path={path} />
              <Button
                secondary
                label={t("Remove screenshot", "เอารูปออก")}
                onPress={() =>
                  setBody({
                    ...body,
                    screenshots: body.screenshots?.filter((p) => p !== path),
                  })
                }
              />
            </React.Fragment>
          ))}
          <Button
            secondary
            disabled={uploading || busy || (body.screenshots?.length ?? 0) >= 4}
            label={
              uploading
                ? t("Uploading…", "กำลังอัปโหลด…")
                : t("Add a screenshot", "เพิ่มภาพหน้าจอ")
            }
            onPress={addImage}
          />
          <ErrorMessage message={error} />
          {existing && existing.revision !== revision && (
            <>
              <Text style={styles.error}>
                {t(
                  "A teammate saved a newer version. Your local draft is preserved. Load their version before editing again.",
                  "เพื่อนบันทึกเวอร์ชันใหม่แล้ว ฉบับร่างของเรายังอยู่ โหลดเวอร์ชันของเพื่อนก่อนแก้ต่อ",
                )}
              </Text>
              <Button
                secondary
                label={t("Load shared version", "โหลดเวอร์ชันร่วม")}
                onPress={() => {
                  setBody(existing.body);
                  setRevision(existing.revision);
                  setContributors(existing.contributor_ids);
                  setNotice("");
                }}
              />
            </>
          )}
          <Button
            secondary
            disabled={
              !ready ||
              busy ||
              uploading ||
              day > (s ? shiftDay(s.cohort.starts_on) : 0)
            }
            label={t("Save shared draft", "บันทึกฉบับร่างร่วม")}
            onPress={() => save(false)}
          />
          <Button
            disabled={
              !ready ||
              busy ||
              uploading ||
              day > (s ? shiftDay(s.cohort.starts_on) : 0)
            }
            label={
              existing?.published_at
                ? t("Save presentation changes", "บันทึกการแก้ไขโพสต์")
                : t("Post to cohort", "โพสต์ให้เพื่อนร่วมรุ่น")
            }
            onPress={() => save(true)}
          />
        </Card>
      )}
    </CampShell>
  );
}
