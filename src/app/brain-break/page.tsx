"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageTitle } from "@/components/ui";
import { getReflectAdapter, REFLECT_OFFICIAL } from "@/features/reflect/adapter";
import { useApp } from "@/features/dashboard/AppProvider";

export default function BrainBreakPage() {
  const { saveEmotion } = useApp();
  const [phase, setPhase] = useState<"idle" | "in" | "hold" | "out">("idle");
  const [count, setCount] = useState(4);

  useEffect(() => {
    if (phase === "idle") return;
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c > 1) return c - 1;
        setPhase((p) => (p === "in" ? "hold" : p === "hold" ? "out" : "in"));
        return 4;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  return (
    <div className="stack">
      <PageTitle
        kicker="마음·몸 회복"
        title="잠시 쉬어가도 성장이에요"
        sub="Microsoft Reflect Brain Break는 공식 앱에서 열고, 교실에서 바로 쓸 수 있는 호흡·스트레칭은 여기에 있어요."
      />
      <Card>
        <p className="font-semibold">Reflect Brain Break</p>
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--muted)]">
          Microsoft는 Brain Break를 Reflect 웹앱·Teams 안에서 제공합니다. 제3자 사이트 iframe 삽입은 공식
          지원 범위가 아니라, 아래 공식 링크로 이동합니다.
        </p>
        <Button
          className="mt-[var(--space-150)] w-full sm:w-auto"
          onClick={() => {
            getReflectAdapter().openOfficial("brainBreak");
            void saveEmotion({
              phase: "brain-break",
              reflectOpened: true,
              reflectConfirmed: false,
            });
          }}
        >
          Reflect에서 Brain Break 열기
        </Button>
        <a className="mt-[var(--space-150)] block text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline" href={REFLECT_OFFICIAL.home} target="_blank" rel="noreferrer">
          reflect.microsoft.com
        </a>
      </Card>
      <Card>
        <p className="font-semibold">호흡하기 (4-4-4)</p>
        <p className="mt-[var(--space-300)] text-center text-[var(--font-size-700)] font-semibold tabular-nums">{phase === "idle" ? "숨" : count}</p>
        <p className="mt-[var(--space-100)] text-center font-semibold">
          {phase === "idle" ? "시작을 누르면 들이쉬고, 참고, 내쉬기를 반복해요." : phase === "in" ? "들이쉬기" : phase === "hold" ? "잠시 참기" : "내쉬기"}
        </p>
        <Button className="mt-[var(--space-200)] w-full sm:w-auto" onClick={() => setPhase(phase === "idle" ? "in" : "idle")}>
          {phase === "idle" ? "호흡 시작" : "멈추기"}
        </Button>
      </Card>
      <Card>
        <p className="font-semibold">간단한 스트레칭</p>
        <ul className="mt-[var(--space-100)] list-disc space-y-[var(--space-50)] pl-5">
          <li>어깨를 천천히 크게 5번 돌리기</li>
          <li>목을 좌우로 기울여 10초 유지</li>
          <li>허벅지 뒤를 앉아서 천천히 늘이기</li>
        </ul>
      </Card>
      <Card>
        <p className="font-semibold">감정 체크하기</p>
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--muted)]">공식 체크인은 Reflect, 수업 연결 기록은 운동 전후 화면에서 남깁니다.</p>
      </Card>
    </div>
  );
}
