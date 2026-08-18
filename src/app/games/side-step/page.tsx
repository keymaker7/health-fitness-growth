"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { MiniGame, useMini } from "@/features/games/MiniGame";

export default function SideStepPage() {
  const g = useMini();
  const [side, setSide] = useState<"L" | "R">("L");
  return (
    <MiniGame
      exerciseId="side-step"
      exerciseName="사이드스텝 게임"
      exerciseType="agility"
      kicker="민첩성"
      title="좌우로 빠르게 이동해요"
      score={g.score}
      running={g.running}
      setRunning={g.setRunning}
      onReset={() => g.setScore(0)}
    >
      <Card className="text-center">
        <p className="text-2xl font-semibold">이번에는 {side === "L" ? "왼쪽" : "오른쪽"}!</p>
        <p className="mt-2 text-5xl font-semibold">{g.score}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            disabled={!g.running}
            onClick={() => {
              if (side !== "L") return;
              g.setScore((s) => s + 1);
              setSide("R");
            }}
          >
            왼쪽
          </Button>
          <Button
            disabled={!g.running}
            onClick={() => {
              if (side !== "R") return;
              g.setScore((s) => s + 1);
              setSide("L");
            }}
          >
            오른쪽
          </Button>
        </div>
      </Card>
    </MiniGame>
  );
}
