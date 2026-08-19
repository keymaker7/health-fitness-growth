"use client";

import { useState } from "react";
import { Tag } from "@/components/ui";
import { CURRICULUM, standardsForScreen } from "@/features/standards/registry";

/**
 * 이 화면이 어느 성취기준에 닿는지 보여 준다.
 *
 * 학생에게는 코드가 필요 없으므로 접힌 상태가 기본이다.
 * 펼치면 학습목표 → 활동 → 평가가 성취기준 원문과 함께 나온다.
 * (수업지도안 docs/lesson/grade6.md의 2번 표와 같은 내용)
 */
export function StandardNote({ screen }: { screen: string }) {
  const [open, setOpen] = useState(false);
  const items = standardsForScreen(screen);
  if (items.length === 0) return null;

  return (
    <section className="card p-[var(--space-200)]" aria-label="이 화면의 성취기준">
      <div className="flex flex-wrap items-center gap-[var(--space-100)]">
        <span className="text-[var(--font-size-200)] font-semibold text-[var(--muted)]">이 화면의 성취기준</span>
        {items.map((s) => (
          <Tag key={s.code} tone="brand">
            [{s.code}]
          </Tag>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ml-auto rounded-[var(--radius-small)] px-[var(--space-100)] py-[2px] text-[var(--font-size-200)] font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)]"
        >
          {open ? "접기" : "무엇을 하면 되나요?"}
        </button>
      </div>

      {open ? (
        <div className="mt-[var(--space-150)] space-y-[var(--space-200)]">
          {items.map((s) => (
            <div key={s.code} className="border-l-2 border-[var(--brand)] pl-[var(--space-150)]">
              <p className="text-[var(--font-size-300)] font-semibold">
                [{s.code}] {s.text}
              </p>
              <dl className="mt-[var(--space-100)] space-y-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">
                <div className="flex gap-[var(--space-100)]">
                  <dt className="shrink-0 font-semibold">학습목표</dt>
                  <dd>{s.goal}</dd>
                </div>
                <div className="flex gap-[var(--space-100)]">
                  <dt className="shrink-0 font-semibold">이 화면에서</dt>
                  <dd>{s.activity}</dd>
                </div>
                <div className="flex gap-[var(--space-100)]">
                  <dt className="shrink-0 font-semibold">평가</dt>
                  <dd>{s.assessment}</dd>
                </div>
              </dl>
            </div>
          ))}
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">
            {CURRICULUM.curriculum} · {CURRICULUM.gradeBand} {CURRICULUM.domain} ({CURRICULUM.source})
          </p>
        </div>
      ) : null}
    </section>
  );
}
