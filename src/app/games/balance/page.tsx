"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { MiniGame, useMini } from "@/features/games/MiniGame";

export default function BalancePage() {
  const { running, setRunning, score, setScore } = useMini();
  const [hold, setHold] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setHold((h) => h + 1);
      setScore((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [running, setScore]);
  return (
    <MiniGame
      exerciseId="balance-stand"
      exerciseName="한발서기 게임"
      exerciseType="balance"
      kicker="평형성"
      title="한 발로 서서 중심을 지켜요"
      score={score}
      running={running}
      setRunning={setRunning}
      onReset={() => {
        setScore(0);
        setHold(0);
      }}
    >
      <Card className="text-center">
        <p className="text-6xl">🦩</p>
        <p className="mt-3 text-4xl font-semibold">{hold}초</p>
        <p className="mt-2 text-[var(--muted)]">시작을 누르고 한 발로 버텨 보세요. 흔들리면 잠시 쉬었다가 다시!</p>
      </Card>
    </MiniGame>
  );
}
