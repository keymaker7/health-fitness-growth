"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Meter, PageTitle, Pivot, Stat, Tag } from "@/components/ui";
import { StandardNote } from "@/components/StandardNote";
import { JournalCalendar } from "@/components/JournalCalendar";
import { JournalEntryCard } from "@/components/JournalEntryCard";
import { useApp } from "@/features/dashboard/AppProvider";
import { formatDateKo, formatTime, startOfDay } from "@/lib/utils";
import { EMOTION_LABEL } from "@/lib/emotions";
import type { WorkoutSession } from "@/types/models";
import { activitySummary, WEEKLY_GOAL } from "@/lib/progress";
import { currentStreak } from "@/features/badges/engine";
import { BADGES } from "@/lib/catalog";
import { dayKey } from "@/lib/day";

type View = "calendar" | "day" | "week" | "month";

export default function JournalPage() {
  const { ready, sessions, achievements, activeStudent } = useApp();
  // 달력을 먼저 보여준다 — «오늘 쓸 칸» 과 «지난 날들» 이 한 화면에 있어야 일지가 이어진다
  const [view, setView] = useState<View>("calendar");
  const [picked, setPicked] = useState(dayKey());
  const groups = useMemo(() => group(sessions, view === "calendar" ? "day" : view), [sessions, view]);
  if (!ready) return <p className="text-[var(--muted)]">불러오는 중...</p>;
  const summary = activitySummary(sessions);

  return (
    <div className="stack">
      <PageTitle
        kicker="나의 기록"
        title="오늘의 움직임과 성장"
        sub="오늘 일지를 쓰고, 달력에서 지난 날을 돌아봐요. 운동 횟수와 배지도 여기 모입니다."
      />
      <StandardNote screen="journal" />
      <div className="grid gap-[var(--space-200)] sm:grid-cols-3">
        <Card>
          <Stat label="성장 레벨" value={`Lv.${summary.level} ${summary.title}`} hint={`${summary.xp.toLocaleString("ko-KR")} XP`} />
          <div className="mt-[var(--space-150)]">
            <Meter
              label={summary.maxed ? "최고 단계" : "다음 레벨"}
              hint={summary.maxed ? summary.title : `${summary.xpInto.toLocaleString("ko-KR")} / ${summary.xpSpan.toLocaleString("ko-KR")}`}
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
          { value: "calendar", label: "달력" },
          { value: "day", label: "일간" },
          { value: "week", label: "주간" },
          { value: "month", label: "월간" },
        ]}
      />
      {view === "calendar" ? (
        <>
          <JournalCalendar value={picked} onSelect={setPicked} />
          {/* 날짜뿐 아니라 **학생이 바뀔 때도** 칸을 새로 만든다.
              그러지 않으면 앞 학생이 쓰던 글이 다음 학생 칸에 남고, 그대로 저장하면 남의 기록이 섞인다. */}
          <JournalEntryCard key={`${activeStudent ?? "solo"}:${picked}`} date={picked} />
        </>
      ) : null}
      {view === "calendar" ? null : groups.map((g) => (
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

function group(sessions: WorkoutSession[], view: Exclude<View, "calendar">) {
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
