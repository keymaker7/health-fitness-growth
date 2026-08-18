"use client";

import { useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, PageTitle, Progress } from "@/components/ui";
import { EmotionGate } from "@/components/EmotionGate";
import { WorkoutResult } from "@/components/WorkoutResult";
import { useApp } from "@/features/dashboard/AppProvider";
import { SquatDetector } from "@/features/squat-game/squat-detector";
import {
  createMediaPipePoseAdapter,
  createSimulationPoseAdapter,
  startCamera,
} from "@/features/multi-person-tracking/pose-adapter";
import { formatTime } from "@/lib/utils";
import { personalBest } from "@/features/badges/engine";
import type { Achievement } from "@/types/models";

const GOAL = 30;

export default function SquatRacePage() {
  const { user, saveSession, sessions } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const det = useRef(new SquatDetector());
  const adapter = useRef<ReturnType<typeof createSimulationPoseAdapter> | null>(null);
  const stopCam = useRef<null | (() => void)>(null);
  const [count, setCount] = useState(0);
  const [acc, setAcc] = useState(100);
  const [feedback, setFeedback] = useState("스쿼트를 시작하면 캐릭터가 달려요.");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [step, setStep] = useState<"before" | "work" | "after" | "done">("before");
  const [mode, setMode] = useState<"sim" | "camera">("sim");
  const [result, setResult] = useState<{ badges: Achievement[]; pb: boolean } | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [before, setBefore] = useState<"calm" | "happy" | "excited" | "tired" | "worried" | "proud">("calm");

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  async function start(kind: "sim" | "camera") {
    adapter.current?.stop();
    stopCam.current?.();
    det.current = new SquatDetector();
    setCount(0);
    setSeconds(0);
    setMode(kind);
    if (kind === "camera" && videoRef.current) {
      try {
        stopCam.current = await startCamera(videoRef.current);
        const a = createMediaPipePoseAdapter(1);
        adapter.current = a;
        await a.start(videoRef.current, (frame) => {
          const p = frame.persons[0];
          if (!p) return;
          apply(det.current.push(p.landmarks));
        });
      } catch {
        await start("sim");
        return;
      }
    } else {
      const a = createSimulationPoseAdapter(1);
      adapter.current = a;
      await a.start(videoRef.current!, (frame) => {
        const p = frame.persons[0];
        if (!p) return;
        apply(det.current.push(p.landmarks));
      });
    }
    setOverlay("READY");
    await new Promise((r) => setTimeout(r, 700));
    for (const n of ["3", "2", "1"]) {
      setOverlay(n);
      await new Promise((r) => setTimeout(r, 600));
    }
    setOverlay("GO");
    await new Promise((r) => setTimeout(r, 400));
    setOverlay(null);
    setRunning(true);
  }

  function apply(r: ReturnType<SquatDetector["push"]>) {
    setFeedback(r.feedback);
    setCount(det.current.count);
    setAcc(det.current.count ? Math.round((det.current.accurateCount / det.current.count) * 100) : 100);
  }

  if (step === "before") {
    return (
      <EmotionGate
        phase="before"
        title="운동하기 전, 지금 내 마음은 어떤가요?"
        confirmLabel="레이스 준비"
        onDone={(m) => {
          setBefore(m);
          setStep("work");
        }}
      />
    );
  }

  if (step === "after") {
    return (
      <EmotionGate
        phase="after"
        title="운동하고 나니 기분이 어떻게 달라졌나요?"
        confirmLabel="결과 저장"
        onDone={async (mood, n) => {
          const saved = await saveSession({
            exerciseId: "squat",
            exerciseName: "스쿼트 레이스",
            exerciseType: "strength",
            startTime: new Date(Date.now() - seconds * 1000).toISOString(),
            endTime: new Date().toISOString(),
            durationSec: seconds,
            count,
            score: count,
            accuracy: acc,
            beforeEmotion: before,
            afterEmotion: mood,
            afterNote: n,
            source: mode === "camera" ? "camera" : "game",
          });
          setResult({ badges: saved.newBadges, pb: saved.isPersonalBest });
          setStep("done");
        }}
      />
    );
  }

  if (step === "done" && result) {
    return <WorkoutResult name="스쿼트" count={count} durationSec={seconds} isPersonalBest={result.pb} badges={result.badges} score={count * 200 + acc * 22} best={Math.max(personalBest(sessions, "squat"), count)} />;
  }

  const scoreNow = count * 200 + acc * 22;

  return (
    <div className="space-y-4">
      <PageTitle kicker="스쿼트 게임" title={user?.displayName ?? "나"} sub="카메라 · 횟수 · 시간 · 점수만 크게 보여 줍니다." />
      <video ref={videoRef} className="hidden" playsInline muted />
      {overlay ? (
        <div className="hud grid min-h-[280px] place-items-center p-6 text-center">
          <p className="text-6xl font-semibold tracking-wide">{overlay}</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="hud flex min-h-[240px] flex-col items-center justify-center p-6 text-center">
            <p className="text-sm text-white/70">횟수</p>
            <p className="mt-2 text-6xl font-semibold tabular-nums leading-none">{count}</p>
            <p className="mt-2 text-sm text-white/70">목표 {GOAL}</p>
          </div>
          <div className="space-y-3">
            <Card>
              <p className="text-xs text-[var(--muted)]">시간</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatTime(seconds)}</p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--muted)]">점수</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{scoreNow.toLocaleString("ko-KR")}</p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--muted)]">자세</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{acc}%</p>
              <div className="mt-2">
                <Progress value={acc} label="자세 정확도" />
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{feedback}</p>
            </Card>
          </div>
        </div>
      )}
      <BtnRow>
        <Button onClick={() => void start("camera")}>카메라로 측정</Button>
        <Button variant="soft" onClick={() => void start("sim")}>
          시뮬레이션 시작
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const r = det.current.push([
              ...Array.from({ length: 23 }, () => ({ x: 0.5, y: 0.3 })),
              { x: 0.46, y: 0.55 },
              { x: 0.54, y: 0.55 },
              { x: 0.46, y: 0.72 },
              { x: 0.54, y: 0.72 },
              { x: 0.46, y: 0.88 },
              { x: 0.54, y: 0.88 },
            ]);
            apply(r);
          }}
        >
          스쿼트 1회 (버튼)
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            adapter.current?.stop();
            stopCam.current?.();
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
