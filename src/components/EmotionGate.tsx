"use client";

import { useState } from "react";
import type { EmotionKey } from "@/types/models";
import { Button, Choice } from "@/components/ui";
import { getReflectAdapter } from "@/features/reflect/adapter";
import { useApp } from "@/features/dashboard/AppProvider";

const MOODS: { key: EmotionKey; label: string; mark: string }[] = [
  { key: "happy", label: "기쁨", mark: "🙂" },
  { key: "excited", label: "설렘", mark: "✨" },
  { key: "calm", label: "평온", mark: "😌" },
  { key: "tired", label: "지침", mark: "😮‍💨" },
  { key: "worried", label: "걱정", mark: "😟" },
  { key: "proud", label: "뿌듯", mark: "🌟" },
];

export function EmotionGate({
  phase,
  title,
  onDone,
  confirmLabel,
}: {
  phase: "before" | "after";
  title: string;
  confirmLabel: string;
  onDone: (mood: EmotionKey, note: string, reflectOpened: boolean) => void;
}) {
  const { settings, saveEmotion } = useApp();
  const [mood, setMood] = useState<EmotionKey>("calm");
  const [note, setNote] = useState("");
  const [opened, setOpened] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const adapter = getReflectAdapter();

  return (
    <div className="card space-y-[var(--space-200)] p-[var(--space-200)]">
      <div>
        <p className="text-[var(--font-size-200)] font-semibold text-[var(--muted)]">마음 체크인</p>
        <h2 className="mt-[var(--space-50)] text-[var(--font-size-500)] font-semibold leading-[var(--line-500)]">{title}</h2>
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--muted)]">
          감정 체크인은 Microsoft Reflect에서 합니다. 공식 링크로 이동한 뒤, 이 수업 기록과 연결할 마음 한 줄을 남길 수 있어요.
        </p>
      </div>
      <Button
        className="w-full sm:w-auto"
        onClick={() => {
          adapter.openOfficial(phase, phase === "before" ? settings.beforeReflectUrl : settings.afterReflectUrl);
          setOpened(true);
        }}
      >
        Microsoft Reflect에서 체크하기
      </Button>
      <label className="flex items-center gap-[var(--space-100)] text-[var(--font-size-300)] font-semibold">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        Reflect 체크인을 마쳤어요
      </label>
      <div>
        <p className="mb-[var(--space-100)] text-[var(--font-size-300)] font-semibold">수업 성찰 노트 (이 기기에만 저장)</p>
        <div className="grid grid-cols-2 gap-[var(--space-100)] sm:grid-cols-3">
          {MOODS.map((m) => (
            <Choice key={m.key} selected={mood === m.key} onClick={() => setMood(m.key)}>
              <span className="mr-[var(--space-50)]" aria-hidden>
                {m.mark}
              </span>
              {m.label}
            </Choice>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="오늘의 한마디 (선택)"
          className="field field-area mt-[var(--space-150)]"
          rows={3}
        />
      </div>
      <Button
        className="w-full sm:w-auto"
        onClick={async () => {
          await saveEmotion({
            phase,
            localMood: mood,
            localNote: note,
            reflectOpened: opened,
            reflectConfirmed: confirmed,
          });
          onDone(mood, note, opened);
        }}
      >
        {confirmLabel}
      </Button>
    </div>
  );
}
