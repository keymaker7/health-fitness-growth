"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BtnRow, Button, Card, PageTitle } from "@/components/ui";
import { VideoPlayer } from "@/components/VideoPlayer";
import { EmotionGate } from "@/components/EmotionGate";
import { WorkoutResult } from "@/components/WorkoutResult";
import { useApp } from "@/features/dashboard/AppProvider";
import { getExercise, getVideoForExercise } from "@/lib/catalog";
import { formatTime } from "@/lib/utils";
import type { Achievement, EmotionKey, WorkoutSource } from "@/types/models";

type Step = "before" | "work" | "after" | "done";

export default function WorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const tab = sp.get("tab");
  const ex = getExercise(id);
  const { saveSession } = useApp();
  const [step, setStep] = useState<Step>(tab === "method" || tab === "video" ? "work" : "before");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [count, setCount] = useState(0);
  const [before, setBefore] = useState<EmotionKey>("calm");
  const [after, setAfter] = useState<EmotionKey>("happy");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{
    badges: Achievement[];
    pb: boolean;
  } | null>(null);
  const endedAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  if (!ex) return <p>운동을 찾을 수 없어요.</p>;
  const video = getVideoForExercise(ex.id);

  if (step === "before") {
    return (
      <div className="space-y-4">
        <PageTitle title="운동하기 전, 지금 내 마음은 어떤가요?" sub={ex.name} />
        <EmotionGate
          phase="before"
          title="운동 전 마음 체크"
          confirmLabel="운동 시작"
          onDone={(mood) => {
            setBefore(mood);
            setStep("work");
            setRunning(true);
          }}
        />
      </div>
    );
  }

  if (step === "after") {
    return (
      <div className="space-y-4">
        <PageTitle title="운동하고 나니 기분이 어떻게 달라졌나요?" />
        <EmotionGate
          phase="after"
          title="운동 후 마음 체크"
          confirmLabel="결과 보기"
          onDone={async (mood, n) => {
            setAfter(mood);
            setNote(n);
            const end = endedAt.current;
            const saved = await saveSession({
              exerciseId: ex.id,
              exerciseName: ex.name,
              exerciseType: ex.componentIds[0],
              startTime: new Date(end - seconds * 1000).toISOString(),
              endTime: new Date(end).toISOString(),
              durationSec: seconds,
              count,
              score: count,
              accuracy: 100,
              beforeEmotion: before,
              afterEmotion: mood,
              afterNote: n,
              source: "manual" satisfies WorkoutSource,
            });
            setResult({ badges: saved.newBadges, pb: saved.isPersonalBest });
            setStep("done");
          }}
        />
      </div>
    );
  }

  if (step === "done" && result) {
    return (
      <WorkoutResult
        name={ex.name}
        count={count}
        durationSec={seconds}
        isPersonalBest={result.pb}
        badges={result.badges}
        afterNote={note || `운동 전 ${before} → 운동 후 ${after}`}
        onAgain={() => {
          setStep("before");
          setCount(0);
          setSeconds(0);
          setResult(null);
        }}
      />
    );
  }

  return (
    <div className="stack">
      <PageTitle title={`${ex.name}`} sub={`추천 ${ex.recommendedMinutes}분`} />
      {(tab === "video" || !tab) && <VideoPlayer video={video} title={ex.name} />}
      <Card>
        <p className="font-semibold">운동방법</p>
        <ol className="mt-[var(--space-100)] list-decimal space-y-[var(--space-50)] pl-5">
          {ex.howTo.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
        <p className="mt-[var(--space-150)] font-semibold">주의사항</p>
        <ul className="mt-[var(--space-50)] list-disc pl-5 text-[var(--font-size-300)] text-[var(--muted)]">
          {ex.cautions.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </Card>
      <Card className="text-center">
        <p className="text-[var(--font-size-200)] text-[var(--muted)]">운동시간</p>
        <p className="text-[var(--font-size-700)] font-semibold tabular-nums">{formatTime(seconds)}</p>
        <p className="mt-[var(--space-200)] text-[var(--font-size-200)] text-[var(--muted)]">횟수</p>
        <p className="text-[var(--font-size-700)] font-semibold tabular-nums">{count}</p>
        <BtnRow className="mt-[var(--space-200)]">
          <Button onClick={() => setCount((c) => c + 1)}>+1회</Button>
          <Button variant="ghost" onClick={() => setRunning((v) => !v)}>
            {running ? "일시정지" : "계속"}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setRunning(false);
              endedAt.current = Date.now();
              setStep("after");
            }}
          >
            운동 종료
          </Button>
        </BtnRow>
      </Card>
    </div>
  );
}
