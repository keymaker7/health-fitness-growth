"use client";

import Link from "next/link";
import { Card, Tag } from "@/components/ui";
import { healthComponents, sportComponents } from "@/lib/catalog";

/**
 * 건강체력·운동체력 요인 카드 그리드.
 * /health-fitness · /sport-fitness 단독 화면과 /paps(PAPS와 이론) 아래쪽이 같은 내용을 보여줘야 해서
 * 목록 부분만 여기로 빼 두 곳에서 그대로 쓴다 — 요인이 바뀌면 한 곳만 고치면 된다.
 */

const HEALTH_GROUPS = [
  { ids: ["cardio"], label: "심폐지구력" },
  { ids: ["strength", "endurance"], label: "근력·근지구력" },
  { ids: ["flexibility"], label: "유연성" },
  { ids: ["body-composition"], label: "체지방" },
];

export function HealthFitnessSection() {
  const items = healthComponents();
  return (
    <div className="grid gap-[var(--space-200)] sm:grid-cols-2">
      {HEALTH_GROUPS.map((g) => {
        const comps = items.filter((c) => g.ids.includes(c.id));
        return (
          <Card key={g.label} className="h-full">
            <Tag tone="brand">{g.label}</Tag>
            <div className="mt-[var(--space-150)] space-y-[var(--space-150)]">
              {comps.map((c) => (
                <Link key={c.id} href={`/health-fitness/${c.id}`} className="flex gap-[var(--space-150)] rounded-[var(--radius-medium)] p-[var(--space-50)] transition hover:bg-[var(--brand-soft)]">
                  <span className="mt-1 h-8 w-1 shrink-0 rounded-sm" style={{ background: c.color }} aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-[var(--font-size-300)] text-[var(--muted)]">{c.kidDescription}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function SportFitnessSection() {
  const items = sportComponents();
  return (
    <div className="grid gap-[var(--space-200)] sm:grid-cols-2">
      {items.map((c) => (
        <Link key={c.id} href={`/sport-fitness/${c.id}`}>
          <Card className="h-full transition hover:border-[var(--line-strong)]">
            <Tag tone="brand">{c.name}</Tag>
            <div className="mt-[var(--space-150)] flex gap-[var(--space-150)]">
              <span className="mt-1 h-8 w-1 shrink-0 rounded-sm" style={{ background: c.color }} aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">{c.name}</p>
                <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">{c.kidDescription}</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
