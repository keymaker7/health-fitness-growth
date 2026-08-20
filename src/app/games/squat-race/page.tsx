"use client";

import { useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, PageTitle, Progress } from "@/components/ui";
import { EmotionGate } from "@/components/EmotionGate";
import { WorkoutResult } from "@/components/WorkoutResult";
import { useApp } from "@/features/dashboard/AppProvider";
import { SQUAT_CONFIG, SquatCounter, extractSquat } from "@/features/squat/squat.js";
import { toPixels } from "@/features/pose/localPose";
import {
  createMediaPipePoseAdapter,
  createSimulationPoseAdapter,
  startCamera,
  type PoseFrame,
} from "@/features/multi-person-tracking/pose-adapter";
import { formatTime } from "@/lib/utils";
import { personalBest } from "@/features/badges/engine";
import type { Achievement } from "@/types/models";

const GOAL = 30;

/**
 * «자세 좋음» 으로 칠 깊이. squat.js 가 주는 깊이는 0~90 으로 환산된 값이고,
 * 세는 문턱(키의 10%)은 약 35 다. 그보다 확실히 깊게 앉은 것만 좋은 자세로 본다.
 * micro:bit 스쿼트 게임이 쓰던 값(65)과 같게 맞췄다 — 같은 동작에 같은 기준을 준다.
 */
const DEEP_ENOUGH = 65;

export default function SquatRacePage() {
  const { user, saveSession, sessions } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  // 측정 도구(/measure)와 **같은 판정**을 쓴다. 예전에는 이 화면만 무릎 각도로 따로 셌고,
  // 그래서 같은 아이가 화면마다 다른 횟수를 받았다.
  const det = useRef(new SquatCounter());
  const deepReps = useRef(0);
  const manual = useRef(0);            // 카메라 없이 손으로 더한 횟수 (판정이 센 것과 섞지 않는다)
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
    det.current = new SquatCounter();
    deepReps.current = 0;
    manual.current = 0;
    setCount(0);
    setAcc(100);
    setSeconds(0);
    setMode(kind);
    if (kind === "camera" && videoRef.current) {
      try {
        stopCam.current = await startCamera(videoRef.current);
        const a = createMediaPipePoseAdapter(1);
        adapter.current = a;
        await a.start(videoRef.current, onFrame);
      } catch {
        await start("sim");
        return;
      }
    } else {
      const a = createSimulationPoseAdapter(1, "squat");
      adapter.current = a;
      await a.start(videoRef.current!, onFrame);
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

  /**
   * 한 프레임을 판정에 먹인다.
   *
   * squat.js 는 **픽셀 좌표**를 기대한다 — 무릎 각도를 재려면 가로·세로가 같은 자로 재져야 한다.
   * 자세 인식이 주는 좌표는 0~1 로 눌려 있어서, 화면 크기를 곱해 되돌린 뒤에 넘긴다.
   */
  function onFrame(frame: PoseFrame) {
    const p = frame.persons[0];
    if (!p) return;
    const pts = toPixels(p.landmarks, frame.width, frame.height);
    apply(det.current.update(extractSquat(pts, SQUAT_CONFIG), frame.ts / 1000));
  }

  /** 화면에 보이는 횟수 = 판정이 센 것 + 손으로 더한 것 */
  function syncCount() {
    setCount(det.current.count + manual.current);
  }

  function apply(msg: { state: string; depth: number } | null) {
    const d = det.current;
    syncCount();
    if (!msg) return;
    if (msg.state === "DOWN") {
      setFeedback("좋아요, 그대로 천천히 일어서 볼까요?");
      return;
    }
    // 일어선 순간에 한 개가 끝난다 (측정 도구와 같은 규칙)
    const deep = msg.depth >= DEEP_ENOUGH;
    if (deep) deepReps.current += 1;
    setAcc(d.count ? Math.round((deepReps.current / d.count) * 100) : 100);
    setFeedback(deep ? "바른 깊이예요!" : "조금만 더 내려가 볼까요?");
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
            // 카메라가 없을 때 손으로 한 개를 더한다.
            // 예전에는 가짜 관절 한 프레임을 판정에 밀어 넣었는데, 그건 «측정»을 흉내 낸 것이라
            // 진짜 판정과 섞이면 어느 쪽이 센 숫자인지 알 수 없게 된다. 손으로 넣은 것은 따로 센다.
            manual.current += 1;
            syncCount();
            setFeedback("손으로 1회를 더했어요.");
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
