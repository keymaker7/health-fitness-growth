"use client";

import Link from "next/link";
import { Button, Card, PageTitle, SectionTitle, Stars, Stat } from "@/components/ui";
import { GrowthLevelTrack } from "@/components/GrowthLevelTrack";
import { useApp } from "@/features/dashboard/AppProvider";
import { currentStreak, minutesThisWeek, personalBest } from "@/features/badges/engine";
import { BADGES, getComponent } from "@/lib/catalog";
import { activitySummary } from "@/lib/progress";
import { gradeToStars } from "@/lib/utils";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function GrowthPage() {
  const { ready, sessions, profile, achievements } = useApp();
  if (!ready || !profile) return <p className="text-[var(--muted)]">불러오는 중...</p>;

  const rope = sessions
    .filter((s) => s.exerciseId === "jump-rope")
    .slice()
    .reverse()
    .map((s, i) => ({ n: i + 1, count: s.count, date: s.startTime.slice(5, 10) }));
  const first = rope[0]?.count ?? 0;
  const last = rope[rope.length - 1]?.count ?? 0;
  const growth = first ? Math.round(((last - first) / first) * 100) : 0;
  const pb = personalBest(sessions, "jump-rope");
  const flex = profile.components.flexibility;
  const cardio = profile.components.cardio;
  const summary = activitySummary(sessions);

  return (
    <div className="stack-lg">
      <PageTitle
        kicker="나의 성장"
        title="과거의 나와 오늘의 나"
        sub="순위보다 어제보다 나아진 나를 먼저 봐요."
      />
      <GrowthLevelTrack
        level={summary.level}
        title={summary.title}
        subtitle={summary.subtitle}
        xp={summary.xp}
        xpInto={summary.xpInto}
        xpSpan={summary.xpSpan}
        xpToNext={summary.xpToNext}
        progress={summary.progress}
        maxed={summary.maxed}
      />
      <Link href="/portfolio">
        <Button>성장 포트폴리오로 만들기</Button>
      </Link>
      <Card>
        <p className="font-semibold">줄넘기 기록</p>
        <p className="mt-[var(--space-50)] break-all text-[var(--muted)]">
          {rope.map((r) => r.count).join(" → ") || "아직 기록이 없어요"}
        </p>
        {growth ? (
          <p className="mt-[var(--space-100)] text-[var(--font-size-500)] font-semibold text-[var(--brand-ink)]">
            {growth > 0 ? "+" : ""}
            {growth}%
          </p>
        ) : null}
        <div className="mt-[var(--space-200)] h-48 min-w-0 overflow-hidden sm:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rope}>
              <CartesianGrid stroke="#ebebeb" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#616161" }} axisLine={{ stroke: "#d1d1d1" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12, fill: "#616161" }} axisLine={{ stroke: "#d1d1d1" }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="줄넘기(회)" stroke="#0f6cbd" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-[var(--space-100)] text-[var(--font-size-200)] text-[var(--muted)]">출처: 이 기기의 건강체력 일지 · 로컬 저장</p>
      </Card>
      <div className="grid gap-[var(--space-200)] sm:grid-cols-2">
        <Card>
          <p className="font-semibold">심폐지구력</p>
          <div className="mt-[var(--space-50)]">
            <Stars n={gradeToStars(cardio)} color={getComponent("cardio")?.color} />
          </div>
        </Card>
        <Card>
          <p className="font-semibold">유연성</p>
          <div className="mt-[var(--space-50)]">
            <Stars n={gradeToStars(flex)} color={getComponent("flexibility")?.color} />
          </div>
        </Card>
        <Card>
          <Stat label="이번 주 운동시간" value={`${minutesThisWeek(sessions)}분`} />
        </Card>
        <Card>
          <Stat label="연속 운동" value={`${currentStreak(sessions)}일`} />
        </Card>
        <Card className="sm:col-span-2">
          <Stat label="개인 최고 기록" value={`줄넘기 ${pb}회`} />
        </Card>
      </div>
      <section>
        <SectionTitle>배지</SectionTitle>
        <div className="grid grid-cols-2 gap-[var(--space-200)] sm:grid-cols-3">
          {BADGES.map((b) => {
            const got = achievements.some((a) => a.badgeId === b.id);
            return (
              <Card key={b.id} className={got ? "" : "opacity-40"}>
                <p className="text-[var(--font-size-600)]" aria-hidden>
                  {b.emoji}
                </p>
                <p className="mt-[var(--space-50)] font-semibold">{b.name}</p>
                <p className="text-[var(--font-size-200)] text-[var(--muted)]">{b.description}</p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
