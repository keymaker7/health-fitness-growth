"use client";

import { useEffect, useState } from "react";
import { BtnRow, Button, PageTitle } from "@/components/ui";
import { EmotionGate } from "@/components/EmotionGate";
import { WorkoutResult } from "@/components/WorkoutResult";
import { useApp } from "@/features/dashboard/AppProvider";
import type { Achievement } from "@/types/models";

export function MiniGame({
  exerciseId,
  exerciseName,
  exerciseType,
  title,
  kicker,
  children,
  score,
  onReset,
  running,
  setRunning,
}: {
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  title: string;
  kicker: string;
  children: React.ReactNode;
  score: number;
  onReset: () => void;
  running: boolean;
  setRunning: (v: boolean) => void;
}) {
  const { saveSession } = useApp();
  const [seconds, setSeconds] = useState(0);
  const [step, setStep] = useState<"work" | "after" | "done">("work");
  const [result, setResult] = useState<{ badges: Achievement[]; pb: boolean } | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  if (step === "after") {
    return (
      <EmotionGate
        phase="after"
        title="운동하고 나니 기분이 어떻게 달라졌나요?"
        confirmLabel="결과 저장"
        onDone={async (mood, n) => {
          const saved = await saveSession({
            exerciseId,
            exerciseName,
            exerciseType,
            startTime: new Date(Date.now() - seconds * 1000).toISOString(),
            endTime: new Date().toISOString(),
            durationSec: seconds,
            count: score,
            score,
            accuracy: 100,
            afterEmotion: mood,
            afterNote: n,
            source: "game",
          });
          setResult({ badges: saved.newBadges, pb: saved.isPersonalBest });
          setStep("done");
        }}
      />
    );
  }

  if (step === "done" && result) {
    return (
      <WorkoutResult
        name={exerciseName}
        count={score}
        durationSec={seconds}
        badges={result.badges}
        isPersonalBest={result.pb}
        onAgain={() => {
          onReset();
          setSeconds(0);
          setStep("work");
          setResult(null);
        }}
      />
    );
  }

  return (
    <div className="stack">
      <PageTitle kicker={kicker} title={title} />
      {children}
      <BtnRow>
        <Button variant="ghost" onClick={() => setRunning(!running)}>
          {running ? "일시정지" : "시작"}
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

export function useMini() {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  return { running, setRunning, score, setScore };
}
