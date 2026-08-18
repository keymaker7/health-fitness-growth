"use client";

import Link from "next/link";
import { Card, PageTitle, SectionTitle, Stars } from "@/components/ui";
import { useApp } from "@/features/dashboard/AppProvider";
import { FITNESS_COMPONENTS, PAPS_EVENTS } from "@/lib/catalog";
import { gradeToStars } from "@/lib/utils";

export default function MyFitnessPage() {
  const { ready, profile, paps, user } = useApp();
  if (!ready || !profile) return <p className="text-[var(--muted)]">불러오는 중...</p>;

  return (
    <div className="stack-lg">
      <PageTitle
        kicker="나의 건강체력"
        title={`${user?.displayName ?? "나"}의 지금 상태`}
        sub="PAPS 측정 결과를 건강체력과 운동체력으로 나눠 살펴봐요. 친구와 비교하지 않고, 지금의 나를 이해해요."
      />
      <div className="grid gap-[var(--space-300)] lg:grid-cols-2">
        <section>
          <SectionTitle>건강체력</SectionTitle>
          <div className="stack">
            {FITNESS_COMPONENTS.filter((c) => c.category === "health").map((c) => (
              <Link key={c.id} href={`/health-fitness/${c.id}`}>
                <Card className="transition hover:border-[var(--line-strong)]">
                  <div className="flex items-center justify-between gap-[var(--space-150)]">
                    <p className="font-semibold">{c.name}</p>
                    <Stars n={gradeToStars(profile.components[c.id])} color={c.color} />
                  </div>
                  <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">{c.kidDescription}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle>운동체력</SectionTitle>
          <div className="stack">
            {FITNESS_COMPONENTS.filter((c) => c.category === "sport").map((c) => (
              <Link key={c.id} href={`/sport-fitness/${c.id}`}>
                <Card className="transition hover:border-[var(--line-strong)]">
                  <div className="flex items-center justify-between gap-[var(--space-150)]">
                    <p className="font-semibold">{c.name}</p>
                    <Stars n={gradeToStars(profile.components[c.id])} color={c.color} />
                  </div>
                  <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">{c.kidDescription}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section>
        <SectionTitle>PAPS 측정 기록</SectionTitle>
        <div className="grid gap-[var(--space-200)] sm:grid-cols-2">
          {paps.map((r) => {
            const ev = PAPS_EVENTS.find((e) => e.id === r.eventId);
            return (
              <Card key={r.id}>
                <p className="font-semibold">{ev?.name ?? r.eventId}</p>
                <p className="mt-[var(--space-50)] text-[var(--font-size-600)] font-semibold tabular-nums">
                  {r.value}
                  {r.unit}
                </p>
                <p className="text-[var(--font-size-300)] text-[var(--muted)]">{r.grade}등급 · 학교 측정 결과(모의 데이터)</p>
              </Card>
            );
          })}
        </div>
        <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
          등급 기준은 학교건강검사규칙 및 해당 연도 나이스 기준표를 따릅니다. 이 앱은 측정값을 임의로 채점하지 않고
          입력·모의 기록만 보여 줍니다.
        </p>
      </section>
    </div>
  );
}
