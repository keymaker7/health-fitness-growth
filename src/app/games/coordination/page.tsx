"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { MiniGame, useMini } from "@/features/games/MiniGame";

export default function CoordinationPage() {
  const g = useMini();
  const [pos, setPos] = useState({ x: 40, y: 40 });
  useEffect(() => {
    if (!g.running) return;
    const t = window.setInterval(() => {
      setPos({ x: 10 + Math.random() * 70, y: 10 + Math.random() * 60 });
    }, 1100);
    return () => window.clearInterval(t);
  }, [g.running]);
  return (
    <MiniGame
      exerciseId="ball-catch"
      exerciseName="공 반응 게임"
      exerciseType="coordination"
      kicker="협응성"
      title="나타나는 공을 터치해요"
      score={g.score}
      running={g.running}
      setRunning={g.setRunning}
      onReset={() => g.setScore(0)}
    >
      <Card>
        <div className="playfield h-64">
          <button
            type="button"
            disabled={!g.running}
            onClick={() => g.setScore((s) => s + 1)}
            className="absolute text-4xl"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            aria-label="공 터치"
          >
            🏐
          </button>
        </div>
        <p className="mt-[var(--space-150)] text-center text-[var(--font-size-600)] font-semibold tabular-nums">{g.score}점</p>
      </Card>
    </MiniGame>
  );
}
