"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Meter, PageTitle, Pivot, Stat, Tag } from "@/components/ui";
import { StandardNote } from "@/components/StandardNote";
import { useApp } from "@/features/dashboard/AppProvider";
import { formatDateKo, formatTime, startOfDay } from "@/lib/utils";
import { EMOTION_LABEL } from "@/lib/emotions";
import type { WorkoutSession } from "@/types/models";
import { activitySummary, WEEKLY_GOAL } from "@/lib/progress";
import { currentStreak } from "@/features/badges/engine";
import { BADGES } from "@/lib/catalog";

type View = "day" | "week" | "month";

export default function JournalPage() {
  const { ready, sessions, achievements } = useApp();
  const [view, setView] = useState<View>("day");
  const groups = useMemo(() => group(sessions, view), [sessions, view]);
  if (!ready) return <p className="text-[var(--muted)]">불러오는 중...</p>;
  const summary = activitySummary(sessions);

  return (
    <div className="stack">
      <PageTitle kicker="나의 기록" title="오늘의 움직임과 성장" sub="운동 횟수, 주간 목표, 배지와 마음 변화를 한곳에서 봐요." />
      <StandardNote screen="journal" />
      <div className="grid gap-[var(--space-200)] sm:grid-cols-3">
        <Card>
          <Stat label="성장 레벨" value={`Lv.${summary.level} ${summary.title}`} hint={`${summary.xp.toLocaleString("ko-KR")} XP`} />
          <div className="mt-[var(--space-150)]">
            <Meter
              label={summary.maxed ? "최고 단계" : "다음 레벨"}
              hint={summary.maxed ? "레전드이" : `${summary.xpInto.toLocaleString("ko-KR")} / ${summary.xpSpan.toLocaleString("ko-KR")}`}
              value={summary.progress * 100}
            />
          </div>
        </Card>
        <Card>
          <Stat label="주간 목표" value={`${summary.weekCount}/${WEEKLY_GOAL}`} hint={`연속 ${currentStreak(sessions)}일`} />
        </Card>
        <Card>
          <Stat label="배지" value={`${achievements.length}`} hint={`전체 ${BADGES.length}개`} />
          <Link href="/growth" className="mt-[var(--space-100)] inline-block text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline">
            성장 그래프
          </Link>
          <span className="mx-[var(--space-100)] text-[var(--muted)]">·</span>
          <Link href="/portfolio" className="mt-[var(--space-100)] inline-block text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline">
            포트폴리오
          </Link>
        </Card>
      </div>
      <Pivot
        value={view}
        onChange={(v) => setView(v as View)}
        options={[
          { value: "day", label: "일간" },
          { value: "week", label: "주간" },
          { value: "month", label: "월간" },
        ]}
      />
      {groups.map((g) => (
        <Card key={g.key}>
          <p className="font-semibold">{g.label}</p>
          <ul className="mt-[var(--space-150)]">
            {g.items.map((s) => (
              <li key={s.id} className="flex min-w-0 justify-between gap-[var(--space-150)] border-b border-[var(--line)] py-[var(--space-100)] last:border-0">
                <div className="min-w-0">
                  <p className="font-semibold break-keep">
                    {s.exerciseName} {s.count}회
                  </p>
                  <p className="text-[var(--font-size-300)] text-[var(--muted)]">
                    {formatTime(s.durationSec)}
                    {s.beforeEmotion || s.afterEmotion
                      ? ` · ${EMOTION_LABEL[s.beforeEmotion ?? "calm"]} → ${EMOTION_LABEL[s.afterEmotion ?? "calm"]}`
                      : ""}
                  </p>
                  {s.afterNote ? <p className="mt-[var(--space-50)] text-[var(--font-size-300)]">“{s.afterNote}”</p> : null}
                </div>
                {s.count && s.count === Math.max(...g.items.filter((x) => x.exerciseId === s.exerciseId).map((x) => x.count)) ? (
                  <Tag tone="success">최고 기록</Tag>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-[var(--space-150)] text-[var(--font-size-300)] font-semibold">
            총 운동시간 {formatTime(g.items.reduce((a, s) => a + s.durationSec, 0))}
          </p>
        </Card>
      ))}
    </div>
  );
}

function group(sessions: WorkoutSession[], view: View) {
  const map = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const d = new Date(s.startTime);
    let key = formatDateKo(s.startTime);
    if (view === "week") {
      const start = startOfDay(d);
      const w = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - w);
      key = `${formatDateKo(start.toISOString())} 주`;
    }
    if (view === "month") key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return [...map.entries()].map(([key, items]) => ({ key, label: key, items }));
}
