"use client";

import { useEffect, useState } from "react";
import { Button, Card, Tag } from "@/components/ui";
import { useApp } from "@/features/dashboard/AppProvider";
import { EMOTION_LABEL } from "@/lib/emotions";
import { dayKey, dayOf, labelKo } from "@/lib/day";
import { formatTime } from "@/lib/utils";
import type { EmotionKey } from "@/types/models";

const MOODS: EmotionKey[] = ["happy", "proud", "excited", "calm", "tired", "worried"];
const MOOD_EMOJI: Record<EmotionKey, string> = {
  happy: "😀", proud: "😤", excited: "🤩", calm: "🙂", tired: "😮‍💨", worried: "😟",
};

/**
 * 하루치 일지를 쓰는 칸.
 *
 * **그날 한 운동을 위에 먼저 보여준다.** 빈 칸만 있으면 아이는 "뭘 쓰지" 에서 멈춘다.
 * 오늘 무엇을 했는지가 눈앞에 있으면 거기서부터 쓴다.
 *
 * 날짜가 바뀌면 **부모가 key 를 바꿔 이 칸을 새로 만든다.** 예전에는 useEffect 로
 * 내용을 갈아 끼웠는데, 저장하면 그 effect 가 다시 돌아 «저장했어요» 를 즉시 지워 버렸다.
 */
export function JournalEntryCard({ date = dayKey() }: { date?: string }) {
  const { entries, sessions, saveEntry, activeStudent } = useApp();
  const entry = entries.find((e) => e.date === date);
  const [text, setText] = useState(entry?.text ?? "");
  const [mood, setMood] = useState<EmotionKey | undefined>(entry?.mood);
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");
  const [agentOn, setAgentOn] = useState(false);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  // 도우미가 연결돼 있을 때만 버튼을 보여준다 (연결 전에도 앱은 그대로 쓴다)
  useEffect(() => {
    let alive = true;
    fetch("/api/journal-feedback")
      .then((r) => r.json())
      .then((d) => { if (alive) setAgentOn(Boolean(d?.enabled)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const todaySessions = sessions.filter((s) => dayOf(s.startTime) === date);
  const isToday = date === dayKey();

  async function save() {
    setSaved("saving");
    await saveEntry(date, { text: text.trim(), mood });
    setSaved("done");
  }

  /** 일지를 도우미에게 보내고 답을 그날 일지에 남긴다 */
  async function ask() {
    setAsking(true);
    setAskError("");
    try {
      // 묻기 전에 먼저 저장한다 — 답만 받고 글이 안 남으면 아이가 쓴 것이 사라진다
      await saveEntry(date, { text: text.trim(), mood });
      const res = await fetch("/api/journal-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          student: activeStudent ?? undefined,
          mood: mood ? EMOTION_LABEL[mood] : undefined,
          text: text.trim(),
          workouts: todaySessions.map((s) => ({
            name: s.exerciseName, count: s.count, durationSec: s.durationSec,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "답을 받지 못했어요.");
      await saveEntry(date, { feedback: String(data.feedback ?? "") });
      setSaved("done");
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "답을 받지 못했어요.");
    }
    setAsking(false);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-100)]">
        <p className="text-[var(--font-size-400)] font-semibold">
          {isToday ? "오늘의 일지" : `${labelKo(date)}의 일지`}
        </p>
        {entry?.updatedAt ? <Tag tone="success">저장됨</Tag> : <Tag>아직 안 씀</Tag>}
      </div>

      {todaySessions.length ? (
        <ul className="mt-[var(--space-150)] flex flex-wrap gap-[var(--space-100)]">
          {todaySessions.map((s) => (
            <li
              key={s.id}
              className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] px-[var(--space-150)] py-[var(--space-50)] text-[var(--font-size-300)]"
            >
              {s.exerciseName} <b className="tabular-nums">{s.count}</b>
              {s.durationSec ? ` · ${formatTime(s.durationSec)}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-[var(--space-150)] text-[var(--font-size-300)] text-[var(--muted)]">
          이 날은 아직 운동 기록이 없어요. 운동을 안 한 날도 일지는 쓸 수 있어요.
        </p>
      )}

      <p className="mt-[var(--space-200)] text-[var(--font-size-300)] font-semibold">오늘의 마음</p>
      <div className="mt-[var(--space-100)] flex flex-wrap gap-[var(--space-100)]">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMood(mood === m ? undefined : m)}
            aria-pressed={mood === m}
            className={`rounded-[var(--radius-medium)] border px-[var(--space-150)] py-[var(--space-100)] text-[var(--font-size-300)] transition ${
              mood === m
                ? "border-[var(--brand)] bg-[var(--brand-soft)] font-semibold"
                : "border-[var(--line)] hover:border-[var(--line-strong)]"
            }`}
          >
            <span aria-hidden className="mr-[var(--space-50)]">{MOOD_EMOJI[m]}</span>
            {EMOTION_LABEL[m]}
          </button>
        ))}
      </div>

      <label className="mt-[var(--space-200)] block text-[var(--font-size-300)] font-semibold" htmlFor="journal-text">
        오늘 어땠나요?
      </label>
      <textarea
        id="journal-text"
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved("idle"); }}
        rows={4}
        placeholder="무엇을 했는지, 어느 부분이 어려웠는지, 다음엔 무엇을 해보고 싶은지 적어 보세요."
        className="mt-[var(--space-100)] w-full rounded-[var(--radius-medium)] border border-[var(--line)] bg-[var(--surface)] p-[var(--space-150)] text-[var(--font-size-300)] leading-relaxed outline-none focus:border-[var(--brand)]"
      />

      <div className="btn-row mt-[var(--space-150)] items-center">
        <Button onClick={save} disabled={saved === "saving" || (!text.trim() && !mood)}>
          {saved === "saving" ? "저장 중…" : "일지 저장"}
        </Button>
        {agentOn ? (
          <Button variant="soft" onClick={ask} disabled={asking || (!text.trim() && !todaySessions.length)}>
            {asking ? "도우미가 읽는 중…" : "도우미에게 보여주기"}
          </Button>
        ) : null}
        {saved === "done" && !asking ? (
          <span className="text-[var(--font-size-300)] font-semibold text-[var(--status-success,var(--brand))]">
            저장했어요
          </span>
        ) : null}
      </div>
      {askError ? (
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--status-danger,#c00)]">{askError}</p>
      ) : null}

      {entry?.feedback ? (
        <div className="mt-[var(--space-200)] rounded-[var(--radius-medium)] border border-[var(--line)] bg-[var(--brand-soft)] p-[var(--space-150)]">
          <p className="text-[var(--font-size-300)] font-semibold">도우미의 한마디</p>
          <p className="mt-[var(--space-50)] whitespace-pre-wrap text-[var(--font-size-300)] leading-relaxed">
            {entry.feedback}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
