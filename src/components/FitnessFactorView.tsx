"use client";

import Link from "next/link";
import { Card, PageTitle, SectionTitle, Stars, Tag } from "@/components/ui";
import { useApp } from "@/features/dashboard/AppProvider";
import { PAPS_EVENTS, exercisesFor, getComponent } from "@/lib/catalog";
import { measureToolsForExercise } from "@/features/measure/registry";
import { DIFFICULTY_KO } from "@/lib/progress";
import { gradeToStars } from "@/lib/utils";

export function FitnessFactorView({ kicker, id }: { kicker: string; id: string }) {
  const { profile } = useApp();
  const c = getComponent(id);
  if (!c) return <p>체력요소를 찾을 수 없어요.</p>;

  const grade = profile?.components[c.id];
  const list = exercisesFor(c.id);
  const paps = PAPS_EVENTS.filter((e) => e.fitnessComponentIds.includes(c.id));

  return (
    <div className="stack">
      <PageTitle kicker={kicker} title={c.name} sub={c.kidDescription} />
      <Card>
        <div className="flex items-start gap-[var(--space-150)]">
          <span className="mt-1 h-8 w-1 shrink-0 rounded-sm" style={{ background: c.color }} aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">나의 상태</p>
            {grade ? (
              <div className="mt-[var(--space-50)]">
                <Stars n={gradeToStars(grade)} color={c.color} />
              </div>
            ) : (
              <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">측정 기록이 아직 없어요.</p>
            )}
            {c.papsNote ? <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--muted)]">{c.papsNote}</p> : null}
          </div>
        </div>
      </Card>

      <section>
        <SectionTitle>추천 운동 종목</SectionTitle>
        <p className="mb-[var(--space-150)] text-[var(--font-size-300)] text-[var(--muted)]">
          {c.name}을 키우는 데 맞는 종목이에요.
        </p>
        <div className="stack">
          {list.length ? (
            list.map((ex) => (
              <Card key={ex.id}>
                <div className="flex flex-wrap gap-[var(--space-50)]">
                  <Tag tone="brand">{c.name}</Tag>
                  <Tag>{DIFFICULTY_KO[ex.difficulty] ?? ex.difficulty}</Tag>
                  <Tag>약 {ex.recommendedMinutes}분</Tag>
                </div>
                <h3 className="mt-[var(--space-150)] text-[var(--font-size-400)] font-semibold">{ex.name}</h3>
                <p className="mt-[var(--space-50)] text-[var(--font-size-300)] font-semibold">운동 방법</p>
                <ol className="mt-[var(--space-50)] list-decimal space-y-[var(--space-50)] pl-5 text-[var(--font-size-300)]">
                  {ex.howTo.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="mt-[var(--space-150)] text-[var(--font-size-300)] font-semibold">주의</p>
                <ul className="mt-[var(--space-50)] list-disc pl-5 text-[var(--font-size-300)] text-[var(--muted)]">
                  {ex.cautions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {measureToolsForExercise(ex.id).map((t) => (
                  <Link
                    key={t.id}
                    href={`/measure?tool=${t.id}`}
                    className="mt-[var(--space-150)] inline-block text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline"
                  >
                    {t.name} 열기
                  </Link>
                ))}
              </Card>
            ))
          ) : (
            <Card>
              <p className="text-[var(--muted)]">아직 추천할 종목이 없어요.</p>
            </Card>
          )}
        </div>
      </section>

      {paps.length ? (
        <section>
          <SectionTitle>관련 PAPS 종목</SectionTitle>
          <div className="stack">
            {paps.map((ev) => (
              <Link key={ev.id} href={`/paps/${ev.id}`} className="block">
                <Card className="transition hover:border-[var(--line-strong)]">
                  <p className="font-semibold">{ev.name}</p>
                  <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">{ev.purpose}</p>
                  <p className="mt-[var(--space-100)] text-[var(--font-size-300)] font-semibold text-[var(--brand)]">측정 방법 알아보기</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
