"use client";

import { useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, PageTitle, Progress } from "@/components/ui";
import { EmotionGate } from "@/components/EmotionGate";
import { WorkoutResult } from "@/components/WorkoutResult";
import { useApp } from "@/features/dashboard/AppProvider";
import type { Achievement } from "@/types/models";

const TEAM = [
  { id: "me", name: "나" },
  { id: "a", name: "박서윤" },
  { id: "b", name: "이도윤" },
  { id: "c", name: "최하린" },
];
const BOSS_HP = 80;

export default function BossBattlePage() {
  const { user, saveSession } = useApp();
  const [counts, setCounts] = useState<Record<string, number>>({ me: 0, a: 12, b: 9, c: 11 });
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [step, setStep] = useState<"work" | "after" | "done">("work");
  const [result, setResult] = useState<{ badges: Achievement[]; pb: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    timer.current = window.setInterval(() => {
      setCounts((c) => ({
        ...c,
        a: c.a + (Math.random() > 0.45 ? 1 : 0),
        b: c.b + (Math.random() > 0.5 ? 1 : 0),
        c: c.c + (Math.random() > 0.4 ? 1 : 0),
      }));
    }, 900);
    return () => {
      window.clearInterval(t);
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [running]);

  const names = { me: user?.displayName ?? "나", a: "박서윤", b: "이도윤", c: "최하린" };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const hpLeft = Math.max(0, 100 - (total / BOSS_HP) * 100);

  if (step === "after") {
    return (
      <EmotionGate
        phase="after"
        title="함께 해내고 나니 마음은 어떤가요?"
        confirmLabel="결과 저장"
        onDone={async (mood, n) => {
          const saved = await saveSession({
            exerciseId: "squat",
            exerciseName: "팀 보스 배틀",
            exerciseType: "strength",
            startTime: new Date(Date.now() - seconds * 1000).toISOString(),
            endTime: new Date().toISOString(),
            durationSec: seconds,
            count: counts.me,
            score: total,
            accuracy: 100,
            afterEmotion: mood,
            afterNote: n,
            source: "game",
            extra: { teamTotal: total },
          });
          setResult({ badges: saved.newBadges, pb: saved.isPersonalBest });
          setStep("done");
        }}
      />
    );
  }

  if (step === "done" && result) {
    return <WorkoutResult name="팀 보스 배틀" count={counts.me} durationSec={seconds} badges={result.badges} isPersonalBest={result.pb} />;
  }

  return (
    <div className="stack">
      <PageTitle kicker="협동 게임" title="함께 스쿼트해서 목표에 도달해요" sub="친구와 겨루지 않고, 힘을 합쳐 목표에 도달해요." />
      <Card className="text-center">
        <p className="text-[var(--font-size-600)]" aria-hidden>
          🐲
        </p>
        <p className="mt-[var(--space-100)] font-semibold">보스 체력</p>
        <Progress value={hpLeft} color="var(--status-danger)" label="남은 체력" />
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)]">{Math.round(hpLeft)}%</p>
        {hpLeft === 0 ? <p className="mt-[var(--space-100)] text-[var(--font-size-400)] font-semibold text-[var(--brand)]">해냈어요! 협력 성공</p> : null}
      </Card>
      <div className="grid gap-[var(--space-200)] sm:grid-cols-2">
        {TEAM.map((m) => (
          <Card key={m.id}>
            <p className="font-semibold">{m.id === "me" ? names.me : m.name}</p>
            <p className="text-[var(--font-size-600)] font-semibold tabular-nums">{counts[m.id]}회</p>
          </Card>
        ))}
      </div>
      <Card className="text-center">
        <p className="text-[var(--font-size-200)] text-[var(--muted)]">모둠 합계</p>
        <p className="text-[var(--font-size-700)] font-semibold tabular-nums">{total}회</p>
      </Card>
      <BtnRow>
        <Button
          onClick={() => {
            setRunning(true);
            setCounts((c) => ({ ...c, me: c.me + 1 }));
          }}
        >
          내 스쿼트 +1
        </Button>
        <Button variant="soft" onClick={() => setRunning(true)}>
          협동 시뮬레이션 시작
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            setRunning(false);
            setStep("after");
          }}
        >
          운동 종료
        </Button>
      </BtnRow>
    </div>
  );
}
