"use client";

import Link from "next/link";
import { BtnRow, Button, Card, Stat, Tag } from "@/components/ui";
import { formatTime } from "@/lib/utils";
import type { Achievement } from "@/types/models";
import { BADGES } from "@/lib/catalog";

export function WorkoutResult({
  name,
  count,
  unit = "회",
  durationSec,
  isPersonalBest,
  badges,
  afterNote,
  onAgain,
  score,
  best,
}: {
  name: string;
  count: number;
  unit?: string;
  durationSec: number;
  isPersonalBest?: boolean;
  badges: Achievement[];
  afterNote?: string;
  onAgain?: () => void;
  score?: number;
  best?: number;
}) {
  const computedScore = score ?? count * 200 + Math.min(durationSec, 90) * 8;
  const bestCount = best ?? (isPersonalBest ? count : undefined);

  return (
    <div className="stack">
      <header>
        <p className="text-[var(--font-size-200)] font-semibold text-[var(--muted)]">오늘의 기록</p>
        <h1 className="mt-[var(--space-50)] text-[var(--font-size-600)] font-semibold">{name}</h1>
        <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">운동시간 {formatTime(durationSec)}</p>
      </header>
      <div className="grid gap-[var(--space-200)] sm:grid-cols-3">
        <Card>
          <Stat label="횟수" value={`${count}${unit}`} />
        </Card>
        <Card>
          <Stat label="점수" value={computedScore.toLocaleString("ko-KR")} />
        </Card>
        <Card>
          <Stat label="최고 기록" value={bestCount != null ? `${bestCount}${unit}` : "—"} />
          {isPersonalBest ? (
            <p className="mt-[var(--space-100)]">
              <Tag tone="success">최고 기록 갱신</Tag>
            </p>
          ) : null}
        </Card>
      </div>
      {afterNote ? (
        <Card>
          <p className="text-[var(--font-size-300)] font-semibold">운동 전과 후의 마음</p>
          <p className="mt-[var(--space-100)] text-[var(--font-size-300)]">{afterNote}</p>
        </Card>
      ) : null}
      {badges.length > 0 ? (
        <Card>
          <p className="font-semibold">새로 받은 배지</p>
          <div className="mt-[var(--space-150)] flex flex-wrap gap-[var(--space-100)]">
            {badges.map((b) => {
              const def = BADGES.find((x) => x.id === b.badgeId);
              return (
                <Tag key={b.id} tone="brand">
                  {def?.name}
                </Tag>
              );
            })}
          </div>
        </Card>
      ) : null}
      <BtnRow>
        {onAgain ? <Button onClick={onAgain}>한 번 더</Button> : null}
        <Link href="/journal">
          <Button variant="ghost">나의 기록</Button>
        </Link>
        <Link href="/growth">
          <Button variant="soft">성장 그래프</Button>
        </Link>
      </BtnRow>
    </div>
  );
}
