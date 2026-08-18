"use client";

import Link from "next/link";
import { Card, PageTitle, Tag } from "@/components/ui";
import { healthComponents } from "@/lib/catalog";

const GROUPS = [
  { ids: ["cardio"], label: "심폐지구력" },
  { ids: ["strength", "endurance"], label: "근력·근지구력" },
  { ids: ["flexibility"], label: "유연성" },
  { ids: ["body-composition"], label: "체지방" },
];

export default function HealthFitnessPage() {
  const items = healthComponents();
  return (
    <div className="stack-lg">
      <PageTitle
        kicker="건강체력"
        title="매일의 삶을 지키는 힘"
        sub="건강체력은 오래 움직이고, 힘을 내고, 몸을 부드럽게 쓰고, 몸의 구성을 돌보는 능력이에요. 각 요인을 고르면 맞는 운동 종목을 추천해요."
      />
      <div className="grid gap-[var(--space-200)] sm:grid-cols-2">
        {GROUPS.map((g) => {
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
    </div>
  );
}
