"use client";

import { Open20Regular } from "@fluentui/react-icons";
import { Button, Card, PageTitle } from "@/components/ui";

/** micro:bit 기기를 쓰는 별도 사이트 모음 — 누르면 새 탭으로 열린다. */
const SITES = [
  {
    label: "줄넘기 카운터",
    emoji: "🪢",
    url: "https://jumprope-fighter.netlify.app/",
    desc: "micro:bit를 들고 뛰면 줄넘기 횟수를 세요.",
  },
  {
    label: "스쿼트 파이터",
    emoji: "🏋️",
    url: "https://squat-fighter.netlify.app/",
    desc: "micro:bit로 친구와 스쿼트 대결을 해요.",
  },
];

export default function MicrobitPage() {
  return (
    <div className="stack">
      <PageTitle
        kicker="Microbit:연결"
        title="micro:bit로 하는 운동 게임"
        sub="micro:bit 기기가 있으면 쓸 수 있는 별도 사이트예요. 버튼을 누르면 새 탭에서 열려요."
      />
      <Card>
        <div className="grid gap-[var(--space-100)] sm:grid-cols-2">
          {SITES.map((s) => (
            <Button
              key={s.label}
              className="w-full py-[var(--space-300)] text-[var(--font-size-400)]"
              onClick={() => window.open(s.url, "_blank", "noreferrer")}
            >
              <span aria-hidden>{s.emoji}</span> {s.label} <Open20Regular aria-hidden />
            </Button>
          ))}
        </div>
        <ul className="mt-[var(--space-150)] list-disc space-y-[var(--space-50)] pl-[var(--space-300)] text-[var(--font-size-300)] text-[var(--muted)]">
          {SITES.map((s) => (
            <li key={s.label}>
              <b className="font-semibold text-[var(--brand-ink)]">{s.label}</b> — {s.desc}
            </li>
          ))}
        </ul>
        <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
          micro:bit 기기가 필요해요. 카메라로 재는 측정은 왼쪽 메뉴의 측정 도구(줄넘기·스쿼트·멀리뛰기·왕복오래달리기)를 쓰세요.
        </p>
      </Card>
    </div>
  );
}
