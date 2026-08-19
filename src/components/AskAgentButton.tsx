"use client";

import { useState } from "react";
import { Card, Tag } from "@/components/ui";
import { agentEmbed } from "@/features/agent/link";

/**
 * 「체육 수업 도우미」를 화면 안에서 바로 쓰는 칸.
 *
 * 수업지도안은 아이가 앱과 에이전트를 오가는 것을 학습 활동으로 잡고 있다.
 * 새 탭으로 보내면 그 왕복이 끊기므로, 화면을 떠나지 않고 물을 수 있게 넣는다.
 *
 * 접힌 상태가 기본이다. 채팅이 항상 떠 있으면 처방·측정 화면의 본문을 밀어낸다.
 * 주소가 없으면 아무것도 그리지 않는다.
 */
export function AskAgentButton({ title, hint }: { title: string; hint: string }) {
  const [open, setOpen] = useState(false);
  const url = agentEmbed();
  if (!url) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-150)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[var(--space-50)]">
            <Tag tone="brand">AI 도우미</Tag>
            <p className="font-semibold">{title}</p>
          </div>
          <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="tap inline-flex shrink-0 items-center gap-[var(--space-100)] rounded-[var(--radius-btn)] bg-[var(--colorBrandBackground)] px-[var(--space-200)] py-[var(--space-100)] text-[var(--font-size-300)] font-semibold text-white transition hover:bg-[var(--colorBrandBackgroundHover)]"
        >
          {open ? "닫기" : "🤖 도우미에게 묻기"}
        </button>
      </div>

      {open ? (
        <div className="mt-[var(--space-200)]">
          <div className="overflow-hidden rounded-[var(--radius-medium)] border border-[var(--glass-line)]">
            <iframe
              src={url}
              title="체육 수업 도우미"
              className="h-[28rem] w-full sm:h-[32rem]"
              allow="microphone"
            />
          </div>
          <p className="mt-[var(--space-100)] text-[var(--font-size-200)] text-[var(--muted)]">
            화면이 비어 있으면{" "}
            <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--brand)] hover:underline">
              새 탭에서 열기
            </a>
            . 이름과 측정값은 넣지 말고 방법과 규칙만 물어 주세요.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
