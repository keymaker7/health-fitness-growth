"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { MiniGame, useMini } from "@/features/games/MiniGame";

export default function ReactionPage() {
  const g = useMini();
  const [round, setRound] = useState(0);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!g.running) return;
    const t = window.setTimeout(() => setOn(true), 800 + Math.random() * 1800);
    return () => window.clearTimeout(t);
  }, [g.running, round]);

  return (
    <MiniGame
      exerciseId="reaction-tap"
      exerciseName="터치 반응 게임"
      exerciseType="reaction"
      kicker="반응속도"
      title="신호가 켜지면 바로 터치해요"
      score={g.score}
      running={g.running}
      setRunning={g.setRunning}
      onReset={() => {
        g.setScore(0);
        setOn(false);
        setRound(0);
      }}
    >
      <button
        type="button"
        disabled={!g.running}
        onClick={() => {
          if (!on) return;
          g.setScore((s) => s + 1);
          setOn(false);
          setRound((r) => r + 1);
        }}
        className={`playfield-signal ${on ? "go" : "wait"}`}
      >
        {on ? "지금!" : "기다리기"}
      </button>
      <Card>
        <p className="text-center text-[var(--font-size-600)] font-semibold tabular-nums">{g.score}회 성공</p>
      </Card>
    </MiniGame>
  );
}
