"use client";

import { Card } from "@/components/ui";
import { agentLink } from "@/features/agent/link";

/**
 * 「체육 수업 도우미」에게 물으러 가는 버튼.
 *
 * 수업에서 앱과 에이전트를 오가는 것이 학습 활동이라(수업지도안 2~3차시),
 * 화면에서 바로 건너갈 수 있어야 한다.
 * 주소가 없으면 아무것도 그리지 않는다.
 */
export function AskAgentButton({ title, hint }: { title: string; hint: string }) {
  const url = agentLink();
  if (!url) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-150)]">
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">{hint}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="tap inline-flex shrink-0 items-center gap-[var(--space-100)] rounded-[var(--radius-btn)] bg-[var(--colorBrandBackground)] px-[var(--space-200)] py-[var(--space-100)] text-[var(--font-size-300)] font-semibold text-white transition hover:bg-[var(--colorBrandBackgroundHover)]"
        >
          🤖 도우미에게 묻기
        </a>
      </div>
    </Card>
  );
}
