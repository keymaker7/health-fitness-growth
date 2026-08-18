"use client";

import { Button, Card } from "@/components/ui";
import { MiniGame, useMini } from "@/features/games/MiniGame";

export default function JumpPowerPage() {
  const g = useMini();
  return (
    <MiniGame
      exerciseId="jump-practice"
      exerciseName="점프 게임"
      exerciseType="power"
      kicker="순발력"
      title="제자리 점프로 힘을 폭발시켜 봐요"
      score={g.score}
      running={g.running}
      setRunning={g.setRunning}
      onReset={() => g.setScore(0)}
    >
      <Card className="text-center">
        <p className="text-6xl">🦘</p>
        <p className="mt-2 text-5xl font-semibold">{g.score}</p>
        <Button className="mt-4 w-full sm:w-auto" disabled={!g.running} onClick={() => g.setScore((s) => s + 1)}>
          점프!
        </Button>
      </Card>
    </MiniGame>
  );
}
