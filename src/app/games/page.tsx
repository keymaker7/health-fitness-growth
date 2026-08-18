"use client";

import Link from "next/link";
import { Card, PageTitle, SectionTitle, Tag } from "@/components/ui";
import { GAME_MODULES } from "@/features/games/registry";
import { MEASURE_TOOLS } from "@/features/measure/registry";

export default function GamesPage() {
  return (
    <div className="stack-lg">
      <PageTitle
        kicker="체력 게임"
        title="측정과 놀이를 한 화면에서"
        sub="기본 화면은 학습용 대시보드입니다. 게임 요소는 측정 중에만 조금 더 분명해집니다."
      />
      <section>
        <SectionTitle href="/measure" linkLabel="측정 도구 모두 보기">
          측정 도구
        </SectionTitle>
        <div className="grid gap-[var(--space-200)] sm:grid-cols-2 xl:grid-cols-3">
          {MEASURE_TOOLS.map((t) => (
            <Link key={t.id} href={`/measure?tool=${t.id}`}>
              <Card className="h-full transition hover:border-[var(--line-strong)]">
                <div className="flex items-center justify-between gap-[var(--space-100)]">
                  <h2 className="text-[var(--font-size-400)] font-semibold">{t.name}</h2>
                  <Tag tone="brand">{t.factor}</Tag>
                </div>
                <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--muted)]">{t.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <SectionTitle>체력 게임</SectionTitle>
        <div className="grid gap-[var(--space-200)] sm:grid-cols-2 xl:grid-cols-3">
          {GAME_MODULES.map((g) => (
            <Link key={g.id} href={g.href}>
              <Card className="h-full transition hover:border-[var(--line-strong)]">
                <div className="flex items-center justify-between gap-[var(--space-100)]">
                  <h2 className="text-[var(--font-size-400)] font-semibold">{g.name}</h2>
                  {g.cooperative ? <Tag tone="brand">협동</Tag> : <Tag>개인</Tag>}
                </div>
                <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--muted)]">{g.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
