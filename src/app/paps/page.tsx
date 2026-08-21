"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageTitle, SearchField, Tag } from "@/components/ui";
import { PAPS_EVENTS, getExercise } from "@/lib/catalog";
import { HealthFitnessSection, SportFitnessSection } from "@/features/fitness/FitnessSections";

export default function PapsPage() {
  return (
    <Suspense fallback={<p className="text-[var(--muted)]">불러오는 중...</p>}>
      <PapsInner />
    </Suspense>
  );
}

function PapsInner() {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const list = useMemo(() => {
    const t = q.trim();
    if (!t) return PAPS_EVENTS;
    return PAPS_EVENTS.filter((e) => e.name.includes(t) || e.fitnessFactor.includes(t) || e.purpose.includes(t));
  }, [q]);

  return (
    <div className="stack-lg">
      <PageTitle
        kicker="PAPS와 이론"
        title="학생건강체력평가를 쉽게 이해해요"
        sub="종목 카드에서 측정 요소, 방법, 관련 운동만 먼저 보고 자세히 들어가세요."
      />
      <section className="card p-[var(--space-200)]">
        <p className="font-semibold">PAPS가 무엇인가요?</p>
        <p className="mt-[var(--space-100)] leading-[var(--line-400)] text-[var(--muted)]">
          PAPS(Physical Activity Promotion System)는 학생건강체력평가시스템입니다. 심폐지구력, 근력·근지구력,
          유연성, 순발력, 체지방을 평가하고 신체활동으로 이어지도록 돕습니다.
        </p>
        <p className="mt-[var(--space-100)] text-[var(--font-size-200)] text-[var(--muted)]">
          출처: 제주특별자치도교육청 『학생건강체력평가(PAPS) 운영 매뉴얼』(2019), 학교건강검사규칙 [별표 3].
        </p>
      </section>
      <SearchField value={q} onChange={setQ} placeholder="종목 또는 체력요인 검색" aria-label="PAPS 검색" />
      <div className="grid gap-[var(--space-200)] sm:grid-cols-2 xl:grid-cols-3">
        {list.map((e) => {
          const related = e.practiceExerciseId ? getExercise(e.practiceExerciseId) : undefined;
          return (
            <article key={e.id} className="card flex h-full flex-col p-[var(--space-200)]">
              <Tag tone="brand">{e.fitnessFactor}</Tag>
              <h2 className="mt-[var(--space-100)] text-[var(--font-size-400)] font-semibold">{e.name}</h2>
              <p className="mt-[var(--space-100)] line-clamp-2 text-[var(--font-size-300)] text-[var(--muted)]">{e.purpose}</p>
              <p className="mt-[var(--space-150)] text-[var(--font-size-300)]">
                <span className="font-semibold">측정 방법</span>
                <span className="mt-[var(--space-50)] block line-clamp-2 text-[var(--muted)]">{e.method[0]}</span>
              </p>
              {related ? (
                <p className="mt-[var(--space-150)] text-[var(--font-size-300)]">
                  <span className="font-semibold">관련 운동</span>
                  <span className="mt-[var(--space-50)] block text-[var(--muted)]">{related.name}</span>
                </p>
              ) : null}
              <Link href={`/paps/${e.id}`} className="mt-auto pt-[var(--space-200)] text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline">
                자세히 보기
              </Link>
            </article>
          );
        })}
      </div>
      {/* PAPS 종목 아래에 이론(건강체력·운동체력)을 이어 붙인다 — 메뉴 «PAPS와 이론» 한 곳에서 다 본다 */}
      <section className="stack">
        <PageTitle
          kicker="이론 · 건강체력"
          title="매일의 삶을 지키는 힘"
          sub="건강체력은 오래 움직이고, 힘을 내고, 몸을 부드럽게 쓰고, 몸의 구성을 돌보는 능력이에요. 각 요인을 고르면 맞는 운동 종목을 추천해요."
        />
        <HealthFitnessSection />
      </section>
      <section className="stack">
        <PageTitle
          kicker="이론 · 운동체력"
          title="스포츠를 더 잘하게 하는 힘"
          sub="순발력·민첩성·평형성·협응성은 건강체력과 구분해요. 각 요인을 고르면 맞는 운동 종목을 추천해요."
        />
        <SportFitnessSection />
      </section>
    </div>
  );
}
