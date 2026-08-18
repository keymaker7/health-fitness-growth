"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRepeatAll20Regular,
  BookOpen20Regular,
  CalendarLtr20Regular,
  ClipboardPulse20Regular,
  DocumentOnePage20Regular,
  HeartPulse20Regular,
  PersonRunning20Regular,
  Sparkle20Regular,
} from "@fluentui/react-icons";
import { GrowthLevelTrack } from "@/components/GrowthLevelTrack";
import { Button, Card, IconTile, Meter } from "@/components/ui";
import { WhyButton } from "@/components/WhyButton";
import { useApp } from "@/features/dashboard/AppProvider";
import { getRecommendations } from "@/features/recommendation/engine";
import { FITNESS_COMPONENTS, getExercise } from "@/lib/catalog";
import { activitySummary, WEEKLY_GOAL } from "@/lib/progress";
import { gradeToStars } from "@/lib/utils";

const GrowthLandscape = dynamic(
  () => import("@/components/GrowthLandscape").then((m) => m.GrowthLandscape),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#c5d6c8]" aria-hidden />,
  },
);

export default function HomePage() {
  const { ready, user, profile, sessions } = useApp();
  if (!ready || !profile || !user) return <p className="text-[var(--muted)]">불러오는 중...</p>;

  const recs = getRecommendations(profile);
  const summary = activitySummary(sessions);
  const health = FITNESS_COMPONENTS.filter((c) => c.category === "health");
  const firstEx = recs[0] ? getExercise(recs[0].exerciseId) : undefined;

  return (
    <div>
      <section className="hero-scene" aria-label="기록이 쌓일수록 자라는 이끼 들판">
        <GrowthLandscape level={summary.level} />
        <div className="hero-copy">
          <p className="text-[var(--font-size-200)] font-semibold text-[var(--brand-ink)]">
            Lv.{summary.level} {summary.title} · 안녕하세요, {user.displayName}
          </p>
          <h1 className="mt-[var(--space-100)] text-[var(--font-size-700)] font-semibold leading-[var(--line-600)] tracking-tight break-keep">
            오늘도 작은 운동이, 내일의 나를 키워요
          </h1>
          <p className="mt-[var(--space-100)] max-w-[36rem] text-[var(--font-size-300)] text-[var(--muted)]">
            {summary.subtitle} 포인터를 올리면 이끼가 갈라지고, 기록이 쌓일수록 들판이 자랍니다.
          </p>
          <div className="btn-row mt-[var(--space-200)]">
            <Link href="/prescription">
              <Button>나의 운동처방 보기</Button>
            </Link>
            <Link href="/recommend">
              <Button variant="soft">추천 운동</Button>
            </Link>
            <Link href="/paps">
              <Button variant="ghost">PAPS 알아보기</Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="mb-[var(--space-200)]">
        <GrowthLevelTrack
          compact
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
      </div>

      <div className="grid gap-[var(--space-200)] md:grid-cols-2 xl:grid-cols-4">
        <Card className="xl:col-span-2">
          <div className="mb-[var(--space-200)] flex items-center gap-[var(--space-100)]">
            <IconTile>
              <HeartPulse20Regular />
            </IconTile>
            <h2 className="text-[var(--font-size-400)] font-semibold">나의 체력</h2>
          </div>
          <div className="space-y-[var(--space-200)]">
            {health.map((c) => (
              <Link key={c.id} href={`/health-fitness/${c.id}`} className="block">
                <Meter
                  label={c.name}
                  hint={`${gradeToStars(profile.components[c.id])} / 5`}
                  value={gradeToStars(profile.components[c.id]) * 20}
                  color={c.color}
                />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-[var(--space-200)] flex items-center gap-[var(--space-100)]">
            <IconTile>
              <Sparkle20Regular />
            </IconTile>
            <h2 className="text-[var(--font-size-400)] font-semibold">오늘의 운동</h2>
          </div>
          {firstEx && recs[0] ? (
            <>
              <p className="font-semibold">{firstEx.name}</p>
              <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">
                약 {firstEx.recommendedMinutes}분
              </p>
              <div className="mt-[var(--space-100)]">
                <WhyButton reason={recs[0].reasonKid} />
              </div>
              <Link href={`/workout/${firstEx.id}`} className="mt-[var(--space-200)] block">
                <Button className="w-full">시작</Button>
              </Link>
            </>
          ) : (
            <p className="text-[var(--muted)]">추천을 준비하는 중이에요.</p>
          )}
        </Card>

        <Card>
          <div className="mb-[var(--space-200)] flex items-center gap-[var(--space-100)]">
            <IconTile>
              <CalendarLtr20Regular />
            </IconTile>
            <h2 className="text-[var(--font-size-400)] font-semibold">이번 주 활동</h2>
          </div>
          <p className="mt-[var(--space-150)] text-[var(--font-size-700)] font-semibold tabular-nums">{summary.weekCount}회</p>
          <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">
            {summary.weekMinutes}분 · 목표 {WEEKLY_GOAL}회
          </p>
          <div className="mt-[var(--space-200)]">
            <Meter label="주간 목표" hint={`${summary.weekCount}/${WEEKLY_GOAL}`} value={(summary.weekCount / WEEKLY_GOAL) * 100} />
          </div>
        </Card>
      </div>

      <div className="mt-[var(--space-200)] grid gap-[var(--space-200)] md:grid-cols-2 xl:grid-cols-4">
        <Link href="/prescription" className="block">
          <Card className="h-full transition hover:border-[var(--line-strong)]">
            <IconTile>
              <ClipboardPulse20Regular />
            </IconTile>
            <h2 className="mt-[var(--space-150)] font-semibold">맞춤 운동처방</h2>
            <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">내 기록으로 만든 4주 계획</p>
          </Card>
        </Link>
        <Link href="/portfolio" className="block">
          <Card className="h-full transition hover:border-[var(--line-strong)]">
            <IconTile>
              <DocumentOnePage20Regular />
            </IconTile>
            <h2 className="mt-[var(--space-150)] font-semibold">성장 포트폴리오</h2>
            <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">기록으로 한 장 만들기</p>
          </Card>
        </Link>
        <Link href="/paps" className="block">
          <Card className="h-full transition hover:border-[var(--line-strong)]">
            <IconTile>
              <BookOpen20Regular />
            </IconTile>
            <h2 className="mt-[var(--space-150)] font-semibold">PAPS 알아보기</h2>
            <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">종목과 측정 방법</p>
          </Card>
        </Link>
        <Link href="/games/multi-jump" className="block">
          <Card className="h-full transition hover:border-[var(--line-strong)]">
            <IconTile>
              <ArrowRepeatAll20Regular />
            </IconTile>
            <h2 className="mt-[var(--space-150)] font-semibold">AI 줄넘기</h2>
            <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">카메라 또는 Micro:bit</p>
          </Card>
        </Link>
        <Link href="/games/squat-race" className="block">
          <Card className="h-full transition hover:border-[var(--line-strong)]">
            <IconTile>
              <PersonRunning20Regular />
            </IconTile>
            <h2 className="mt-[var(--space-150)] font-semibold">스쿼트 게임</h2>
            <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">동작 인식으로 횟수 기록</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
