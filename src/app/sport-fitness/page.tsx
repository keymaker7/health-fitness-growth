"use client";

import Link from "next/link";
import { Card, PageTitle, Tag } from "@/components/ui";
import { sportComponents } from "@/lib/catalog";

export default function SportFitnessPage() {
  const items = sportComponents();
  return (
    <div className="stack-lg">
      <PageTitle
        kicker="운동체력"
        title="스포츠를 더 잘하게 하는 힘"
        sub="순발력·민첩성·평형성·협응성은 건강체력과 구분해요. 각 요인을 고르면 맞는 운동 종목을 추천해요."
      />
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
    </div>
  );
}
